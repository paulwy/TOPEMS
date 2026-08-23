use chrono::Utc;
use sqlx::PgPool;
use topems_shared_db::master_data_refs::{MasterDataRefService, UpsertLocalMasterDataRefRequest};
use topems_shared_event::event::{
    Event, EventResult, EventSubscriber, EventType, MasterDataAction, MasterDataDomain,
    MasterDataEvent, PurchaseOrderApprovedPayload, PurchaseOrderCreatedPayload,
    StockInboundPayload, StockOutboundPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct ScmEventHandlers {
    pub db: PgPool,
}

impl ScmEventHandlers {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("scm")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();
        let h4 = self.clone();

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
}

pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = ScmEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[scm] 启动事件订阅者，注册 2 类业务事件 + 2 个 MDM 主数据事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[scm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
