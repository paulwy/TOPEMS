use chrono::Utc;
use sqlx::PgPool;
use topems_shared::event::{
    Event, EventResult, EventSubscriber, EventType, PurchaseOrderApprovedPayload,
    PurchaseOrderCreatedPayload, StockInboundPayload, StockOutboundPayload,
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
            ))
    }

    async fn handle_purchase_order(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[scm] 采购订单事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::PurchaseOrderCreated => {
                let payload: PurchaseOrderCreatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析采购订单创建事件 payload 失败: {}", e))?;
                tracing::info!(
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
                            tracing::info!(
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
        tracing::info!(
            "[scm] 库存变更事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::StockInbound => {
                let payload: StockInboundPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析入库事件 payload 失败: {}", e))?;
                tracing::info!(
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
                tracing::info!(
                    "[scm] 库存出库: {} ({})，物料: {:?}，数量: {}，关联订单: {:?}",
                    payload.outbound_no,
                    payload.outbound_id,
                    payload.material_name,
                    payload.quantity,
                    payload.reference_order_id
                );

                if let Some(order_id) = payload.reference_order_id {
                    tracing::info!("[scm] 出库单关联订单 {}，更新发货跟踪记录", order_id);
                }
            }
            _ => {}
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = ScmEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[scm] 启动事件订阅者，注册 2 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[scm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
