use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_core::cache::{
    CacheInvalidationEvent, CacheInvalidationListener, InvalidationLevel,
};
use topems_shared_core::l2_cache::{AsyncL2Cache, AsyncL2CacheInvalidationHandler};
use topems_shared_db::master_data_refs::{MasterDataRefService, UpsertLocalMasterDataRefRequest};
use topems_shared_event::event::{
    CacheInvalidatedPayload, Event, EventResult, EventSubscriber, EventType,
    InventoryUpdatedPayload, MasterDataAction, MasterDataDomain, MasterDataEvent,
    PurchaseOrderApprovedPayload, PurchaseOrderCreatedPayload, SrmSupplierCreatedPayload,
    SrmSupplierStatusChangedPayload, SrmSupplierUpdatedPayload, StockInboundPayload,
    StockOutboundPayload, SupplierDataSyncRequestedPayload, WmsInventoryItemReceivedPayload,
    WmsInventoryItemShippedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct ScmEventHandlers {
    pub db: PgPool,
    pub supplier_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    pub purchase_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl ScmEventHandlers {
    pub fn new(
        db: PgPool,
        supplier_cache: Arc<AsyncL2Cache<serde_json::Value>>,
        purchase_cache: Arc<AsyncL2Cache<serde_json::Value>>,
        dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    ) -> Self {
        Self {
            db,
            supplier_cache,
            purchase_cache,
            dict_cache,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("scm")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();
        let h4 = self.clone();
        let h5 = self.clone();
        let h6 = self.clone();
        let h7 = self.clone();
        let h8 = self.clone();
        let h9 = self.clone();
        let h10 = self.clone();
        let h11 = self.clone();

        Ok(subscriber
            .subscribe_handler(
                vec![
                    EventType::PurchaseOrderCreated,
                    EventType::PurchaseOrderApproved,
                ],
                move |event| {
                    let h = h1.clone();
                    Box::pin(async move { h.handle_purchase_order(event).await })
                },
            )
            .subscribe_handler(
                vec![EventType::StockInbound, EventType::StockOutbound],
                move |event| {
                    let h = h2.clone();
                    Box::pin(async move { h.handle_stock_change(event).await })
                },
            )
            .subscribe_handler(vec![EventType::SupplierDataSyncRequested], move |event| {
                let h = h5.clone();
                Box::pin(async move { h.handle_supplier_data_sync(event).await })
            })
            .subscribe_handler(vec![EventType::WmsInventoryItemReceived], move |event| {
                let h = h6.clone();
                Box::pin(async move { h.handle_wms_inbound_received(event).await })
            })
            .subscribe_handler(vec![EventType::WmsInventoryItemShipped], move |event| {
                let h = h7.clone();
                Box::pin(async move { h.handle_wms_outbound_shipped(event).await })
            })
            .subscribe_handler(vec![EventType::InventoryUpdated], move |event| {
                let h = h8.clone();
                Box::pin(async move { h.handle_inventory_updated(event).await })
            })
            .subscribe_handler(vec![EventType::SrmSupplierCreated], move |event| {
                let h = h9.clone();
                Box::pin(async move { h.handle_srm_supplier_created(event).await })
            })
            .subscribe_handler(vec![EventType::SrmSupplierUpdated], move |event| {
                let h = h10.clone();
                Box::pin(async move { h.handle_srm_supplier_updated(event).await })
            })
            .subscribe_handler(vec![EventType::SrmSupplierStatusChanged], move |event| {
                let h = h11.clone();
                Box::pin(async move { h.handle_srm_supplier_status_changed(event).await })
            })
            .subscribe_master_data(vec![MasterDataDomain::Supplier], move |event| {
                let h = h3.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_supplier_changed(event).await {
                        tracing::error!("[scm] handle_master_data_supplier_changed 失败: {}", e);
                    }
                })
            })
            .subscribe_master_data(vec![MasterDataDomain::Material], move |event| {
                let h = h4.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_material_changed(event).await {
                        tracing::error!("[scm] handle_master_data_material_changed 失败: {}", e);
                    }
                })
            }))
    }

    async fn handle_purchase_order(&self, event: Event) -> HandlerResult {
        tracing::debug!(
            "[scm] 采购订单事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::PurchaseOrderCreated => {
                let payload: PurchaseOrderCreatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析采购订单创建事件 payload 失败: {}", e))?;
                tracing::debug!(
                    "[scm] 采购订单创建: {} ({})，供应商: {:?}，金额: {:?}",
                    payload.order_no,
                    payload.order_id,
                    payload.supplier_name,
                    payload.total_amount
                );

                let result = sqlx::query(
                    "UPDATE scm.purchase_orders SET status = 'pending', updated_at = $1 WHERE id = $2",
                )
                .bind(Utc::now())
                .bind(payload.order_id)
                .execute(&self.db)
                .await;

                match result {
                    Ok(r) => {
                        if r.rows_affected() > 0 {
                            tracing::debug!(
                                "[scm] 采购订单 {} 状态已设置为 pending",
                                payload.order_no
                            );
                        } else {
                            tracing::debug!(
                                "[scm] 采购订单 {} 不在 SCM 模块中（可能由其他模块创建）",
                                payload.order_no
                            );
                        }
                    }
                    Err(e) => {
                        tracing::warn!("[scm] 更新采购订单状态失败（不阻塞主流程）: {}", e);
                    }
                }
            }
            EventType::PurchaseOrderApproved => {
                let payload: PurchaseOrderApprovedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析采购订单审批事件 payload 失败: {}", e))?;
                tracing::info!(
                    "[scm] 采购订单审批通过: {} ({})，审批人: {:?}",
                    payload.order_no,
                    payload.order_id,
                    payload.approved_by
                );

                let result = sqlx::query(
                    "UPDATE scm.purchase_orders SET status = 'approved', updated_at = $1 WHERE id = $2",
                )
                .bind(Utc::now())
                .bind(payload.order_id)
                .execute(&self.db)
                .await;

                match result {
                    Ok(r) => {
                        if r.rows_affected() > 0 {
                            tracing::info!(
                                "[scm] 采购订单 {} 状态已更新为 approved，通知供应商发货",
                                payload.order_no
                            );
                        } else {
                            tracing::debug!(
                                "[scm] 采购订单 {} 不在 SCM 模块中（可能由其他模块创建）",
                                payload.order_no
                            );
                        }
                    }
                    Err(e) => {
                        tracing::warn!("[scm] 更新采购订单状态失败（不阻塞主流程）: {}", e);
                    }
                }
            }
            _ => {}
        }

        Ok(())
    }

    async fn handle_stock_change(&self, event: Event) -> HandlerResult {
        tracing::debug!(
            "[scm] 库存变更事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::StockInbound => {
                let payload: StockInboundPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析入库事件 payload 失败: {}", e))?;
                tracing::debug!(
                    "[scm] 库存入库: {} ({})，物料: {:?}，数量: {}，关联订单: {:?}",
                    payload.inbound_no,
                    payload.inbound_id,
                    payload.material_name,
                    payload.quantity,
                    payload.reference_order_id
                );

                if let Some(order_id) = payload.reference_order_id {
                    let result = sqlx::query(
                        "UPDATE scm.purchase_orders SET status = 'receiving', updated_at = $1 WHERE id = $2 AND status IN ('approved', 'partially_received')",
                    )
                    .bind(Utc::now())
                    .bind(order_id)
                    .execute(&self.db)
                    .await;

                    match result {
                        Ok(r) => {
                            if r.rows_affected() > 0 {
                                tracing::info!(
                                    "[scm] 关联采购订单 {} 状态已更新为 receiving",
                                    order_id
                                );
                            } else {
                                tracing::debug!(
                                    "[scm] 入库单关联的订单 {} 不在 SCM 采购订单中",
                                    order_id
                                );
                            }
                        }
                        Err(e) => {
                            tracing::warn!("[scm] 更新采购订单收货状态失败（不阻塞主流程）: {}", e);
                        }
                    }
                }
            }
            EventType::StockOutbound => {
                let payload: StockOutboundPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析出库事件 payload 失败: {}", e))?;
                tracing::debug!(
                    "[scm] 库存出库: {} ({})，物料: {:?}，数量: {}，关联订单: {:?}",
                    payload.outbound_no,
                    payload.outbound_id,
                    payload.material_name,
                    payload.quantity,
                    payload.reference_order_id
                );

                if let Some(order_id) = payload.reference_order_id {
                    tracing::debug!("[scm] 出库单关联订单 {}，更新发货跟踪记录", order_id);
                }
            }
            _ => {}
        }

        Ok(())
    }

    async fn handle_supplier_data_sync(&self, event: Event) -> HandlerResult {
        let payload: SupplierDataSyncRequestedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析供应商同步事件 payload 失败: {}", e))?;
        tracing::info!(
            "[scm] 收到 SupplierDataSyncRequested 事件 - supplier_id={}, supplier_name={}, direction={}",
            payload.supplier_id,
            payload.supplier_name,
            payload.sync_direction
        );

        if payload.sync_direction != "srm_to_scm" {
            tracing::debug!(
                "[scm] 跳过非 srm_to_scm 方向的同步事件 - direction={}",
                payload.sync_direction
            );
            return Ok(());
        }

        let existing_count =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM scm.suppliers WHERE id = $1")
                .bind(payload.supplier_id)
                .fetch_one(&self.db)
                .await
                .unwrap_or(0);

        let now = Utc::now();

        if existing_count > 0 {
            let result = sqlx::query(
                r#"UPDATE scm.suppliers SET
                    name = $2, legal_name = $3, contact_person = $4, phone = $5,
                    email = $6, address = $7, tax_id = $8, status = $9,
                    sync_from_srm = TRUE, srm_supplier_id = $10, updated_at = $11
                WHERE id = $1"#,
            )
            .bind(payload.supplier_id)
            .bind(&payload.supplier_name)
            .bind(&payload.short_name)
            .bind(&payload.contact_name)
            .bind(&payload.contact_phone)
            .bind(&payload.email)
            .bind(&payload.address)
            .bind(&payload.tax_number)
            .bind(&payload.status)
            .bind(payload.supplier_id)
            .bind(now)
            .execute(&self.db)
            .await;

            match result {
                Ok(r) => {
                    tracing::info!(
                        "[scm] 供应商 {} 已更新 (supplier_id={}, rows_affected={})",
                        payload.supplier_name,
                        payload.supplier_id,
                        r.rows_affected()
                    );
                }
                Err(e) => {
                    tracing::warn!("[scm] 更新供应商失败: {}", e);
                }
            }
        } else {
            let result = sqlx::query(
                r#"INSERT INTO scm.suppliers
                    (id, tenant_id, name, legal_name, contact_person, phone,
                     email, address, bank_account, tax_id, status,
                     sync_from_srm, srm_supplier_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12, $13, $14)"#,
            )
            .bind(payload.supplier_id)
            .bind(payload.tenant_id)
            .bind(&payload.supplier_name)
            .bind(&payload.short_name)
            .bind(&payload.contact_name)
            .bind(&payload.contact_phone)
            .bind(&payload.email)
            .bind(&payload.address)
            .bind(&payload.bank_account)
            .bind(&payload.tax_number)
            .bind(&payload.status)
            .bind(payload.supplier_id)
            .bind(now)
            .bind(now)
            .execute(&self.db)
            .await;

            match result {
                Ok(_) => {
                    tracing::info!(
                        "[scm] 供应商 {} 已创建 (supplier_id={})",
                        payload.supplier_name,
                        payload.supplier_id
                    );
                }
                Err(e) => {
                    tracing::warn!("[scm] 创建供应商失败: {}", e);
                }
            }
        }

        sqlx::query(
            r#"INSERT INTO scm.srm_supplier_snapshots
                (id, supplier_code, supplier_name, legal_name, contact_name,
                 contact_email, contact_phone, address, tax_id, status,
                 tenant_id, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $12)
            ON CONFLICT (id) DO UPDATE SET
                supplier_code = EXCLUDED.supplier_code,
                supplier_name = EXCLUDED.supplier_name,
                legal_name = EXCLUDED.legal_name,
                contact_name = EXCLUDED.contact_name,
                contact_email = EXCLUDED.contact_email,
                contact_phone = EXCLUDED.contact_phone,
                address = EXCLUDED.address,
                tax_id = EXCLUDED.tax_id,
                status = EXCLUDED.status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.synced_at"#,
        )
        .bind(payload.supplier_id)
        .bind(
            payload
                .supplier_id
                .to_string()
                .split('-')
                .next()
                .map(|s| format!("SRM-{}", s))
                .unwrap_or_else(|| "SRM".to_string()),
        )
        .bind(&payload.supplier_name)
        .bind(&payload.short_name)
        .bind(&payload.contact_name)
        .bind(&payload.email)
        .bind(&payload.contact_phone)
        .bind(&payload.address)
        .bind(&payload.tax_number)
        .bind(&payload.status)
        .bind(payload.tenant_id)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("写入 scm.srm_supplier_snapshots 失败: {}", e))?;

        Ok(())
    }

    /// MDM 供应商变更事件处理
    ///
    /// 订阅 CRM/ERP 供应商变更事件，同步更新 SCM 中的供应商相关记录
    async fn handle_master_data_supplier_changed(&self, event: MasterDataEvent) -> HandlerResult {
        tracing::debug!(
            "[scm-mdm] 供应商主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let supplier_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "supplier", supplier_name, status)
            .await?;

        Ok(())
    }

    /// MDM 物料变更事件处理
    ///
    /// 订阅 PDM 物料变更事件，同步更新 SCM 中的物料相关记录
    async fn handle_master_data_material_changed(&self, event: MasterDataEvent) -> HandlerResult {
        tracing::debug!(
            "[scm-mdm] 物料主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let material_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let status = match event.action {
            MasterDataAction::Deleted => "deleted",
            MasterDataAction::Deactivated => "inactive",
            _ => "active",
        };

        self.upsert_local_master_data_ref(&event, "material", material_name, status)
            .await?;

        Ok(())
    }

    /// SRM 供应商创建事件处理 - 写快照表
    async fn handle_srm_supplier_created(&self, event: Event) -> HandlerResult {
        let payload: SrmSupplierCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析 SrmSupplierCreated payload 失败: {}", e))?;

        tracing::info!(
            "[scm] SRM 供应商创建: {} ({})",
            payload.supplier_name,
            payload.supplier_id
        );

        let now = Utc::now();

        sqlx::query(
            r#"INSERT INTO scm.srm_supplier_snapshots
                (id, supplier_code, supplier_name, contact_name, contact_email,
                 category, status, tenant_id, synced_at,
                 created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $9)
            ON CONFLICT (id) DO UPDATE SET
                supplier_code = EXCLUDED.supplier_code,
                supplier_name = EXCLUDED.supplier_name,
                contact_name = EXCLUDED.contact_name,
                contact_email = EXCLUDED.contact_email,
                category = EXCLUDED.category,
                status = EXCLUDED.status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.synced_at"#,
        )
        .bind(payload.supplier_id)
        .bind(&payload.supplier_no)
        .bind(&payload.supplier_name)
        .bind(payload.contact_person)
        .bind(payload.contact_email)
        .bind(payload.category.unwrap_or_else(|| "".to_string()))
        .bind(&payload.status)
        .bind(payload.tenant_id)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("写入 srm_supplier_snapshots 失败: {}", e))?;

        Ok(())
    }

    /// SRM 供应商更新事件处理 - 写快照表
    async fn handle_srm_supplier_updated(&self, event: Event) -> HandlerResult {
        let payload: SrmSupplierUpdatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析 SrmSupplierUpdated payload 失败: {}", e))?;

        tracing::info!(
            "[scm] SRM 供应商更新: {} ({})",
            payload.supplier_name,
            payload.supplier_id
        );

        let now = Utc::now();

        sqlx::query(
            r#"INSERT INTO scm.srm_supplier_snapshots
                (id, supplier_code, supplier_name, tenant_id, synced_at,
                 created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $5, $5)
            ON CONFLICT (id) DO UPDATE SET
                supplier_name = EXCLUDED.supplier_name,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.synced_at"#,
        )
        .bind(payload.supplier_id)
        .bind(&payload.supplier_no)
        .bind(&payload.supplier_name)
        .bind(payload.tenant_id)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("更新 srm_supplier_snapshots 失败: {}", e))?;

        Ok(())
    }

    /// SRM 供应商状态变更事件处理 - 写快照表
    async fn handle_srm_supplier_status_changed(&self, event: Event) -> HandlerResult {
        let payload: SrmSupplierStatusChangedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析 SrmSupplierStatusChanged payload 失败: {}", e))?;

        tracing::info!(
            "[scm] SRM 供应商状态变更: {} ({}) {} -> {}",
            payload.supplier_name,
            payload.supplier_id,
            payload.old_status,
            payload.new_status
        );

        let now = Utc::now();

        sqlx::query(
            r#"INSERT INTO scm.srm_supplier_snapshots
                (id, supplier_code, supplier_name, status, tenant_id, synced_at,
                 created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6, $6)
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.synced_at"#,
        )
        .bind(payload.supplier_id)
        .bind(&payload.supplier_no)
        .bind(&payload.supplier_name)
        .bind(&payload.new_status)
        .bind(payload.tenant_id)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("更新 srm_supplier_snapshots 状态失败: {}", e))?;

        Ok(())
    }

    /// AC-5: 将主数据变更事件持久化到本地 ref 表
    ///
    /// 通过 master_data_id（而非业务编码）建立跨服务关联。
    /// 消费端查询时使用 master_data_id 定位本地业务记录。
    async fn upsert_local_master_data_ref(
        &self,
        event: &MasterDataEvent,
        local_entity_type: &str,
        name: &str,
        status: &str,
    ) -> HandlerResult {
        let domain_str = format!("{:?}", event.domain).to_lowercase();

        // V284: 复用 shared-db MasterDataRefService（消除 scm_master_data_refs 内联 SQL）
        let svc = MasterDataRefService::with_table(self.db.clone(), "scm_master_data_refs");
        let req = UpsertLocalMasterDataRefRequest {
            master_data_id: event.master_data_id.clone(),
            tenant_id: event.tenant_id,
            domain: domain_str.clone(),
            code: event.code.clone(),
            name: name.to_string(),
            status: status.to_string(),
            source_service: event.source_service.clone(),
            local_entity_type: local_entity_type.to_string(),
            payload_snapshot: event.payload.clone(),
        };

        match svc.upsert_local_master_data_ref(&req).await {
            Ok(_) => {
                tracing::debug!(
                    "[scm-mdm] 本地 ref 已同步 - master_data_id={}, domain={}, action={:?}, local_entity_type={}",
                    event.master_data_id,
                    domain_str,
                    event.action,
                    local_entity_type
                );
            }
            Err(e) => {
                tracing::warn!(
                    "[scm-mdm] 本地 ref 同步失败（graceful fallback）- master_data_id={}: {}",
                    event.master_data_id,
                    e
                );
            }
        }

        Ok(())
    }

    /// WMS 入库单接收事件处理 - 写快照表
    async fn handle_wms_inbound_received(&self, event: Event) -> HandlerResult {
        let payload: WmsInventoryItemReceivedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析 WmsInventoryItemReceived payload 失败: {}", e))?;

        tracing::debug!(
            "[scm] WMS入库接收: {} ({})，物料: {:?}，数量: {}",
            payload.inbound_no,
            payload.inbound_id,
            payload.material_name,
            payload.quantity
        );

        let now = Utc::now();

        sqlx::query(
            r#"INSERT INTO scm.wms_inbound_order_snapshots
                (id, order_number, warehouse_id, supplier_id, order_type, status,
                 purchase_order_id, purchase_order_number, total_quantity, received_at,
                 tenant_id, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'purchase', 'received', $5, $6, $7, $8,
                    NULL, $9, $9, $9)
            ON CONFLICT (id) DO UPDATE SET
                status = 'received',
                warehouse_id = EXCLUDED.warehouse_id,
                supplier_id = EXCLUDED.supplier_id,
                total_quantity = EXCLUDED.total_quantity,
                received_at = EXCLUDED.received_at,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.synced_at"#,
        )
        .bind(payload.inbound_id)
        .bind(&payload.inbound_no)
        .bind(payload.warehouse_id)
        .bind(payload.supplier_id)
        .bind(payload.reference_order_id)
        .bind(payload.reference_order_no.unwrap_or_default())
        .bind(payload.quantity)
        .bind(payload.received_at)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("写入 wms_inbound_order_snapshots 失败: {}", e))?;

        // 同步写入入库库存移动历史（供 turnover 趋势查询）
        let _ = sqlx::query(
            r#"INSERT INTO scm.wms_inventory_movement_snapshots
                (movement_no, movement_type, warehouse_id, item_id, item_code, item_name,
                 quantity, unit, total_value, reference_type, reference_id,
                 movement_date, tenant_id, synced_at, created_at)
            VALUES ($1, 'inbound', $2, $3, $4, $5, $6, $7, 0, 'inbound_order', $8,
                    $9, NULL, $10, $10)"#,
        )
        .bind(&payload.inbound_no)
        .bind(payload.warehouse_id)
        .bind(payload.material_id)
        .bind(&payload.material_code)
        .bind(&payload.material_name)
        .bind(payload.quantity)
        .bind(payload.unit.unwrap_or_else(|| "".to_string()))
        .bind(payload.inbound_id)
        .bind(payload.received_at.unwrap_or(now))
        .bind(now)
        .execute(&self.db)
        .await;

        // 同步更新采购订单状态
        if let Some(po_id) = payload.reference_order_id {
            let _ = sqlx::query(
                "UPDATE scm.purchase_orders SET status = 'receiving', updated_at = $1 WHERE id = $2 AND status IN ('approved', 'partially_received')",
            )
            .bind(now)
            .bind(po_id)
            .execute(&self.db)
            .await;
        }

        Ok(())
    }

    /// WMS 出库单发货事件处理 - 写快照表
    async fn handle_wms_outbound_shipped(&self, event: Event) -> HandlerResult {
        let payload: WmsInventoryItemShippedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析 WmsInventoryItemShipped payload 失败: {}", e))?;

        tracing::debug!(
            "[scm] WMS出库发货: {} ({})，物料: {:?}，数量: {}",
            payload.outbound_no,
            payload.outbound_id,
            payload.material_name,
            payload.quantity
        );

        let now = Utc::now();

        sqlx::query(
            r#"INSERT INTO scm.wms_outbound_order_snapshots
                (id, order_number, warehouse_id, customer_id, order_type, status,
                 total_quantity, tenant_id, synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'sales', 'shipped', $5,
                    NULL, $6, $6, $6)
            ON CONFLICT (id) DO UPDATE SET
                status = 'shipped',
                warehouse_id = EXCLUDED.warehouse_id,
                customer_id = EXCLUDED.customer_id,
                total_quantity = EXCLUDED.total_quantity,
                synced_at = EXCLUDED.synced_at,
                updated_at = EXCLUDED.synced_at"#,
        )
        .bind(payload.outbound_id)
        .bind(&payload.outbound_no)
        .bind(payload.warehouse_id)
        .bind(payload.customer_id)
        .bind(payload.quantity)
        .bind(now)
        .execute(&self.db)
        .await
        .map_err(|e| format!("写入 wms_outbound_order_snapshots 失败: {}", e))?;

        // 同步写入出库库存移动历史（供 turnover 趋势查询）
        let _ = sqlx::query(
            r#"INSERT INTO scm.wms_inventory_movement_snapshots
                (movement_no, movement_type, warehouse_id, item_id, item_code, item_name,
                 quantity, unit, total_value, reference_type, reference_id,
                 movement_date, tenant_id, synced_at, created_at)
            VALUES ($1, 'outbound', $2, $3, $4, $5, $6, $7, 0, 'outbound_order', $8,
                    $9, NULL, $10, $10)"#,
        )
        .bind(&payload.outbound_no)
        .bind(payload.warehouse_id)
        .bind(payload.material_id)
        .bind(&payload.material_code)
        .bind(&payload.material_name)
        .bind(payload.quantity)
        .bind(payload.unit.unwrap_or_else(|| "".to_string()))
        .bind(payload.outbound_id)
        .bind(payload.shipped_at.unwrap_or(now))
        .bind(now)
        .execute(&self.db)
        .await;

        Ok(())
    }

    /// 库存更新事件处理 - 写快照表
    async fn handle_inventory_updated(&self, event: Event) -> HandlerResult {
        let payload: InventoryUpdatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析 InventoryUpdated payload 失败: {}", e))?;

        tracing::debug!(
            "[scm] 库存更新: warehouse={}, material={}, old={}, new={}, delta={}",
            payload.warehouse_id,
            payload.material_name,
            payload.old_quantity,
            payload.new_quantity,
            payload.delta
        );

        let now = Utc::now();

        if payload.change_type == "delete" {
            sqlx::query(
                r#"DELETE FROM scm.wms_inventory_snapshots
                   WHERE warehouse_id = $1 AND item_code = $2"#,
            )
            .bind(payload.warehouse_id)
            .bind(&payload.material_code)
            .execute(&self.db)
            .await
            .map_err(|e| format!("删除 wms_inventory_snapshots 失败: {}", e))?;
        } else {
            let available = payload.available_quantity.unwrap_or(payload.new_quantity);
            let min_qty = payload.min_quantity.unwrap_or(0.0);
            let total_value = payload.total_value.unwrap_or(0.0);

            sqlx::query(
                r#"INSERT INTO scm.wms_inventory_snapshots
                    (warehouse_id, item_code, item_name, quantity,
                     available_quantity, min_quantity, total_value,
                     unit, warehouse_name,
                     tenant_id, synced_at, snapshot_date, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL,
                        NULL, $8, CURRENT_DATE, $8, $8)
                ON CONFLICT (warehouse_id, item_code) DO UPDATE SET
                    quantity = EXCLUDED.quantity,
                    item_name = EXCLUDED.item_name,
                    available_quantity = EXCLUDED.available_quantity,
                    min_quantity = EXCLUDED.min_quantity,
                    total_value = EXCLUDED.total_value,
                    synced_at = EXCLUDED.synced_at,
                    snapshot_date = CURRENT_DATE,
                    updated_at = EXCLUDED.synced_at"#,
            )
            .bind(payload.warehouse_id)
            .bind(&payload.material_code)
            .bind(&payload.material_name)
            .bind(payload.new_quantity)
            .bind(available)
            .bind(min_qty)
            .bind(total_value)
            .bind(now)
            .execute(&self.db)
            .await
            .map_err(|e| format!("写入 wms_inventory_snapshots 失败: {}", e))?;

            // 同步写入库存移动历史（供 turnover 趋势查询）
            if payload.delta.abs() > f64::EPSILON {
                let _ = sqlx::query(
                    r#"INSERT INTO scm.wms_inventory_movement_snapshots
                        (movement_no, movement_type, warehouse_id, item_id, item_code, item_name,
                         quantity, unit, total_value, reference_type, reference_id,
                         movement_date, tenant_id, synced_at, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, 'inventory_adjust', $9,
                            $10, NULL, $11, $11)"#,
                )
                .bind(format!("INV-{}", payload.inventory_id))
                .bind(if payload.delta > 0.0 {
                    "inbound"
                } else {
                    "outbound"
                })
                .bind(payload.warehouse_id)
                .bind(payload.inventory_id)
                .bind(&payload.material_code)
                .bind(&payload.material_name)
                .bind(payload.delta.abs())
                .bind(total_value)
                .bind(payload.inventory_id)
                .bind(now)
                .bind(now)
                .execute(&self.db)
                .await;
            }
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    supplier_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    purchase_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
) -> Result<(), String> {
    let handlers = ScmEventHandlers::new(
        db,
        supplier_cache.clone(),
        purchase_cache.clone(),
        dict_cache.clone(),
    );
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    // 创建缓存失效监听器，注册三个缓存处理器
    let mut cache_invalidation_listener = CacheInvalidationListener::new("scm");
    let supplier_cache_handler =
        AsyncL2CacheInvalidationHandler::new("scm_supplier_cache", supplier_cache, "scm:supplier:");
    cache_invalidation_listener.register_handler(supplier_cache_handler);
    let purchase_cache_handler =
        AsyncL2CacheInvalidationHandler::new("scm_purchase_cache", purchase_cache, "scm:purchase:");
    cache_invalidation_listener.register_handler(purchase_cache_handler);
    let dict_cache_handler =
        AsyncL2CacheInvalidationHandler::new("scm_dict_cache", dict_cache, "scm:dict:");
    cache_invalidation_listener.register_handler(dict_cache_handler);
    let cache_invalidation_listener = Arc::new(cache_invalidation_listener);

    tracing::info!(
        "[scm] 启动事件订阅者，注册 2 类业务事件 + 2 个 MDM 主数据事件 + 1 个缓存失效事件 handler"
    );
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[scm] 事件订阅者异常退出: {}", e);
        }
    });

    // 订阅缓存失效事件
    let cache_listener = cache_invalidation_listener.clone();
    let cache_subscriber = EventSubscriber::new("scm-cache-invalidation")
        .map_err(|e| e.to_string())?
        .subscribe(vec![EventType::CacheInvalidated], move |event| {
            let listener = cache_listener.clone();
            Box::pin(async move {
                if let Ok(payload) = event.parse_payload::<CacheInvalidatedPayload>() {
                    let invalidation_event = CacheInvalidationEvent {
                        source_service: payload.source_service,
                        source_instance: payload.source_instance,
                        cache_key_pattern: payload.cache_key_pattern,
                        invalidation_level: InvalidationLevel::from_str(
                            &payload.invalidation_level,
                        ),
                        reason: payload.reason,
                    };
                    listener.dispatch_invalidation(&invalidation_event);
                }
            })
        });

    tokio::spawn(async move {
        if let Err(e) = cache_subscriber.start_listening().await {
            tracing::error!("[scm] 缓存失效事件订阅者异常退出: {}", e);
        }
    });

    Ok(())
}
