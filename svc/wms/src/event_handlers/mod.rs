//! WMS 事件处理器模块
//!
//! 负责：
//! - 订阅上游服务（SCM/ERP 采购订单、销售订单）事件，触发 WMS 入出库准备
//! - 提供事件发布辅助方法，供 inbound_order/outbound_order/transfer_order/inventory_alert
//!   等业务模块在操作完成后发布 WMS 业务事件（通知 SCM/Finance/Portal）
//!
//! P3 事件驱动规范化：补齐 WMS 缺失的出库/入库/调拨/低库存事件，
//! 让仓储域能够通知 SCM（补货/履约）和 Finance（成本/应付）。

use sqlx::{PgPool, Row};
use std::sync::Arc;
use topems_shared_event::event::{
    Event, EventPublisher, EventResult, EventSubscriber, EventType,
    InboundOrderRequestedPayload, PurchaseOrderApprovedPayload, PurchaseOrderCreatedPayload,
    WmsInventoryItemReceivedPayload, WmsInventoryItemShippedPayload,
    WmsInventoryLowStockPayload, WmsWarehouseTransferCompletedPayload,
};

type HandlerResult = std::result::Result<(), String>;

/// WMS 事件处理器
///
/// 持有数据库连接与事件发布者引用，既可作为事件订阅器消费上游事件，
/// 也提供发布辅助方法供业务模块调用。
#[derive(Clone)]
pub struct WmsEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl WmsEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    /// 构建事件订阅者，订阅上游 SCM/ERP 业务事件
    ///
    /// 订阅：
    /// - PurchaseOrderCreated: 采购订单创建 → 本地快照存储
    /// - PurchaseOrderApproved: 采购订单审批通过 → 本地快照更新 + 自动创建入库单
    /// - InboundOrderRequested: SCM 请求创建入库单 → 创建入库单
    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("wms")?;
        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(
                vec![EventType::PurchaseOrderCreated],
                move |event| {
                    let h = h1.clone();
                    Box::pin(async move { h.handle_po_created(event).await })
                },
            )
            .subscribe_handler(
                vec![EventType::PurchaseOrderApproved],
                move |event| {
                    let h = h2.clone();
                    Box::pin(async move { h.handle_po_approved(event).await })
                },
            )
            .subscribe_handler(
                vec![EventType::InboundOrderRequested],
                move |event| {
                    let h = h3.clone();
                    Box::pin(async move { h.handle_inbound_order_requested(event).await })
                },
            ))
    }

    async fn handle_po_created(&self, event: Event) -> HandlerResult {
        let payload: PurchaseOrderCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析采购订单创建事件 payload 失败: {}", e))?;
        tracing::debug!(
            "[wms] 收到 PurchaseOrderCreated 事件 - order_id={}, order_no={}",
            payload.order_id,
            payload.order_no
        );
        let _ = store_po_snapshot(
            &self.db,
            payload.order_id,
            payload.order_no,
            payload.supplier_id,
            payload.supplier_name,
            payload.total_amount,
            None,
            "pending",
            None,
            None,
        )
        .await;
        Ok(())
    }

    async fn handle_po_approved(&self, event: Event) -> HandlerResult {
        let payload: PurchaseOrderApprovedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析采购订单审批事件 payload 失败: {}", e))?;
        tracing::info!(
            "[wms] 收到 PurchaseOrderApproved 事件 - order_id={}, order_no={}",
            payload.order_id,
            payload.order_no
        );
        let _ = store_po_snapshot(
            &self.db,
            payload.order_id,
            payload.order_no,
            payload.supplier_id,
            payload.supplier_name,
            payload.total_amount,
            payload.payable_amount,
            "approved",
            payload.approved_by,
            payload.approved_at,
        )
        .await;
        Ok(())
    }

    async fn handle_inbound_order_requested(&self, event: Event) -> HandlerResult {
        let payload: InboundOrderRequestedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析入库单请求事件 payload 失败: {}", e))?;
        tracing::info!(
            "[wms] 收到 InboundOrderRequested 事件 - inbound_id={}, purchase_order_id={}",
            payload.inbound_order_id,
            payload.purchase_order_id
        );

        let now = chrono::Utc::now();

        sqlx::query(
            r#"INSERT INTO wms.inbound_orders
                (id, order_number, warehouse_id, supplier_id,
                 order_type, status, received_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'purchase', 'pending', NULL, $5, $5)
            ON CONFLICT (id) DO NOTHING"#,
        )
        .bind(payload.inbound_order_id)
        .bind(&payload.inbound_order_number)
        .bind(payload.warehouse_id)
        .bind(payload.supplier_id)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("创建入库单失败: {}", e))?;

        tracing::info!(
            "[wms] 入库单创建成功 - inbound_id={}, order_number={}",
            payload.inbound_order_id,
            payload.inbound_order_number
        );
        Ok(())
    }

    /// 发布库存出库事件
    ///
    /// 在 `outbound_order::ship_outbound_order` 完成后调用，
    /// 通知 SCM（销售履约）/Finance（成本结转）。
    pub async fn publish_inventory_shipped(
        &self,
        payload: WmsInventoryItemShippedPayload,
    ) -> HandlerResult {
        let publisher = self
            .event_publisher
            .as_ref()
            .ok_or_else(|| "event_publisher 未配置".to_string())?
            .clone();
        publisher
            .publish_inventory_shipped(payload)
            .await
            .map_err(|e| e.to_string())
    }

    /// 发布库存入库事件
    ///
    /// 在 `inbound_order::receive_inbound_order` 完成后调用，
    /// 通知 SCM（采购履约）/Finance（应付确认）。
    pub async fn publish_inventory_received(
        &self,
        payload: WmsInventoryItemReceivedPayload,
    ) -> HandlerResult {
        let publisher = self
            .event_publisher
            .as_ref()
            .ok_or_else(|| "event_publisher 未配置".to_string())?
            .clone();
        publisher
            .publish_inventory_received(payload)
            .await
            .map_err(|e| e.to_string())
    }

    /// 发布仓库间调拨完成事件
    ///
    /// 在 `transfer_order::complete_transfer` 完成后调用，
    /// 通知 SCM（库存可见性）/Finance（仓间成本结转）。
    pub async fn publish_warehouse_transfer_completed(
        &self,
        payload: WmsWarehouseTransferCompletedPayload,
    ) -> HandlerResult {
        let publisher = self
            .event_publisher
            .as_ref()
            .ok_or_else(|| "event_publisher 未配置".to_string())?
            .clone();
        publisher
            .publish_warehouse_transfer_completed(payload)
            .await
            .map_err(|e| e.to_string())
    }

    /// 发布库存不足预警事件
    ///
    /// 在库存查询/入库出库后检测到低于阈值时调用，
    /// 通知 SCM（补货计划）/Portal（用户提醒）。
    pub async fn publish_inventory_low_stock(
        &self,
        payload: WmsInventoryLowStockPayload,
    ) -> HandlerResult {
        let publisher = self
            .event_publisher
            .as_ref()
            .ok_or_else(|| "event_publisher 未配置".to_string())?
            .clone();
        publisher
            .publish_inventory_low_stock(payload)
            .await
            .map_err(|e| e.to_string())
    }
}

/// 启动 WMS 事件订阅者
///
/// 在服务启动时调用，订阅上游服务事件。当前预留，后续按需扩展。
pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = WmsEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[wms] 启动事件订阅者，注册 PurchaseOrderCreated + PurchaseOrderApproved + InboundOrderRequested 事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[wms] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}

/// 批量发布库存低库存预警事件（供 inventory_alert 模块调用）
///
/// 从数据库查询当前所有低于阈值的库存项，并逐一发布 `WmsInventoryLowStock` 事件。
/// 调用方应在合适时机（如定时任务或入库/出库后）触发。
pub async fn emit_low_stock_alerts(
    db: &PgPool,
    event_publisher: &Option<Arc<EventPublisher>>,
) -> Result<u64, String> {
    let publisher = match event_publisher {
        Some(p) => p.clone(),
        None => return Ok(0),
    };

    let rows = sqlx::query(
        r#"
        SELECT
            i.id AS inventory_id,
            i.warehouse_id,
            w.warehouse_name,
            i.material_code,
            i.material_name,
            i.quantity AS current_quantity,
            COALESCE(i.min_quantity, i.reorder_point) AS threshold_quantity,
            CASE
                WHEN i.quantity <= 0 THEN 'out_of_stock'
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'below_min'
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN 'reorder_needed'
                ELSE NULL
            END AS alert_type,
            CASE
                WHEN i.quantity <= 0 THEN 'critical'
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity * 0.5 THEN 'critical'
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'warning'
                ELSE 'info'
            END AS severity
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        WHERE i.deleted_at IS NULL
          AND (
            (i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity)
            OR (i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point)
            OR i.quantity <= 0
          )
        "#,
    )
    .fetch_all(db)
    .await
    .map_err(|e| format!("查询低库存项失败: {}", e))?;

    let mut count: u64 = 0;
    for row in rows {
        let inventory_id: uuid::Uuid = row
            .try_get("inventory_id")
            .map_err(|e| format!("解析 inventory_id 失败: {}", e))?;
        let warehouse_id: Option<uuid::Uuid> = row
            .try_get("warehouse_id")
            .map_err(|e| format!("解析 warehouse_id 失败: {}", e))?;
        let warehouse_name: Option<String> = row
            .try_get("warehouse_name")
            .map_err(|e| format!("解析 warehouse_name 失败: {}", e))?;
        let material_code: String = row
            .try_get("material_code")
            .map_err(|e| format!("解析 material_code 失败: {}", e))?;
        let material_name: String = row
            .try_get("material_name")
            .map_err(|e| format!("解析 material_name 失败: {}", e))?;
        let current_quantity: f64 = row
            .try_get("current_quantity")
            .map_err(|e| format!("解析 current_quantity 失败: {}", e))?;
        let threshold_quantity: f64 = row
            .try_get("threshold_quantity")
            .map_err(|e| format!("解析 threshold_quantity 失败: {}", e))?;
        let alert_type: String = row
            .try_get("alert_type")
            .map_err(|e| format!("解析 alert_type 失败: {}", e))?;
        let severity: String = row
            .try_get("severity")
            .map_err(|e| format!("解析 severity 失败: {}", e))?;

        let payload = WmsInventoryLowStockPayload {
            inventory_id,
            warehouse_id,
            warehouse_name,
            material_code,
            material_name,
            current_quantity,
            threshold_quantity,
            alert_type,
            severity,
            detected_at: Some(chrono::Utc::now()),
        };

        let publisher_clone = publisher.clone();
        if let Err(e) = publisher_clone.publish_inventory_low_stock(payload).await {
            tracing::warn!(
                "[wms] WmsInventoryLowStock 事件发布失败（graceful fallback）: {}",
                e
            );
        } else {
            count += 1;
        }
    }

    if count > 0 {
        tracing::info!("[wms] 共发布 {} 条 WmsInventoryLowStock 事件", count);
    }
    Ok(count)
}

/// 显式标记 EventType 在 WMS 模块中的使用，避免未使用 import 警告。
/// 这些变体在后续扩展订阅逻辑时会被引用。
#[allow(dead_code)]
fn _wms_event_type_markers() {
    let _ = EventType::WmsInventoryItemShipped;
    let _ = EventType::WmsInventoryItemReceived;
    let _ = EventType::WmsWarehouseTransferCompleted;
    let _ = EventType::WmsInventoryLowStock;
    let _ = EventType::PurchaseOrderCreated;
    let _ = EventType::PurchaseOrderApproved;
}

async fn store_po_snapshot(
    db: &PgPool,
    id: uuid::Uuid,
    order_number: String,
    supplier_id: Option<uuid::Uuid>,
    supplier_name: Option<String>,
    total_amount: Option<f64>,
    payable_amount: Option<f64>,
    status: &str,
    approved_by: Option<String>,
    approved_at: Option<chrono::DateTime<chrono::Utc>>,
) {
    let now = chrono::Utc::now();
    let result = sqlx::query(
        r#"INSERT INTO plugin_wms.purchase_order_snapshots
           (id, order_number, supplier_id, supplier_name, total_amount, payable_amount,
            status, approved_by, approved_at, synced_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE
           SET order_number = EXCLUDED.order_number,
               supplier_id = EXCLUDED.supplier_id,
               supplier_name = EXCLUDED.supplier_name,
               total_amount = EXCLUDED.total_amount,
               payable_amount = EXCLUDED.payable_amount,
               status = EXCLUDED.status,
               approved_by = EXCLUDED.approved_by,
               approved_at = EXCLUDED.approved_at,
               synced_at = EXCLUDED.synced_at,
               updated_at = EXCLUDED.updated_at"#,
    )
    .bind(id)
    .bind(&order_number)
    .bind(supplier_id)
    .bind(supplier_name)
    .bind(total_amount)
    .bind(payable_amount)
    .bind(status)
    .bind(approved_by)
    .bind(approved_at)
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(db)
    .await;

    match result {
        Ok(_) => tracing::debug!(
            "[wms] 采购订单快照已存储 - id={}, order_number={}",
            id,
            order_number
        ),
        Err(e) => tracing::warn!(
            "[wms] 存储采购订单快照失败 - id={}, error={}",
            id,
            e
        ),
    }
}