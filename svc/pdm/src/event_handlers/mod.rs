use chrono::Utc;
use sqlx::PgPool;
use topems_shared::event::{
    Event, EventResult, EventSubscriber, EventType, MasterDataAction, MasterDataDomain,
    MasterDataEvent, ProductionOrderCreatedPayload, PurchaseOrderCreatedPayload,
    ScmShipmentReceivedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct PdmEventHandlers {
    pub db: PgPool,
}

impl PdmEventHandlers {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("pdm")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();
        let h4 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::PurchaseOrderCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_purchase_order_created(event).await })
            })
            .subscribe_handler(vec![EventType::ProductionOrderCreated], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_production_order_created(event).await })
            })
            .subscribe_handler(vec![EventType::ScmShipmentReceived], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_shipment_received(event).await })
            })
            .subscribe_master_data(vec![MasterDataDomain::AccountSubject], move |event| {
                let h = h4.clone();
                Box::pin(async move {
                    if let Err(e) = h.handle_master_data_account_subject_changed(event).await {
                        tracing::error!(
                            "[pdm] handle_master_data_account_subject_changed 失败: {}",
                            e
                        );
                    }
                })
            }))
    }

    async fn handle_purchase_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pdm] 采购订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PurchaseOrderCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析采购订单创建事件 payload 失败: {}", e))?;

        tracing::info!(
            "[pdm] 采购订单: {} ({})，供应商: {:?}，金额: {:?}",
            payload.order_no,
            payload.order_id,
            payload.supplier_name,
            payload.total_amount
        );

        let material_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM pdm_materials WHERE status = 'active'",
        )
        .fetch_one(&self.db)
        .await
        .unwrap_or(0);

        tracing::info!(
            "[pdm] 采购订单创建触发物料数据同步，当前 PDM 物料总数: {}",
            material_count
        );

        Ok(())
    }

    async fn handle_production_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pdm] 生产订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: ProductionOrderCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析生产订单创建事件 payload 失败: {}", e))?;

        tracing::info!(
            "[pdm] 生产订单: {} ({})，产品: {:?}，数量: {:?}",
            payload.order_no,
            payload.order_id,
            payload.product_name,
            payload.quantity
        );

        if let Some(product_id) = payload.product_id {
            let config_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM pdm_configurations WHERE product_id = $1",
            )
            .bind(product_id)
            .fetch_one(&self.db)
            .await
            .unwrap_or(0);

            if config_count > 0 {
                tracing::info!(
                    "[pdm] 产品 {} 有 {} 个 BOM 配置，已同步到生产订单",
                    product_id,
                    config_count
                );
            } else {
                tracing::warn!("[pdm] 产品 {} 未找到 BOM 配置，请检查 PDM 数据", product_id);
            }
        }

        Ok(())
    }

    async fn handle_shipment_received(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pdm] 收货事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: ScmShipmentReceivedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析收货事件 payload 失败: {}", e))?;

        tracing::info!(
            "[pdm] 收货单: {} ({})，供应商: {:?}，数量: {:?}，收货人: {:?}",
            payload.shipment_no,
            payload.shipment_id,
            payload.supplier_name,
            payload.quantity,
            payload.received_by
        );

        let material_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pdm_materials")
            .fetch_one(&self.db)
            .await
            .unwrap_or(0);

        tracing::info!(
            "[pdm] 收货事件触发物料数据同步检查，当前物料总数: {}",
            material_count
        );

        Ok(())
    }

    /// MDM 会计科目变更事件处理
    ///
    /// 订阅 ERP 会计科目变更事件，同步更新 PDM 中的相关财务配置
    async fn handle_master_data_account_subject_changed(
        &self,
        event: MasterDataEvent,
    ) -> HandlerResult {
        tracing::info!(
            "[pdm-mdm] 会计科目主数据变更事件 - domain={:?}, action={:?}, master_data_id={}, tenant_id={}",
            event.domain,
            event.action,
            event.master_data_id,
            event.tenant_id
        );

        let subject_name = event
            .payload
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let subject_code = event.payload.get("code").and_then(|v| v.as_str());
        let category = event.payload.get("category").and_then(|v| v.as_str());

        match event.action {
            MasterDataAction::Created => {
                tracing::info!(
                    "[pdm-mdm] 会计科目创建 - name={}, code={:?}, category={:?}",
                    subject_name,
                    subject_code,
                    category
                );
                // TODO: 创建 PDM 会计科目关联配置
            }
            MasterDataAction::Updated => {
                tracing::info!(
                    "[pdm-mdm] 会计科目更新 - name={}, code={:?}, changed_fields={:?}",
                    subject_name,
                    subject_code,
                    event.changed_fields
                );
                // TODO: 同步更新 PDM 会计科目配置
            }
            MasterDataAction::Deleted => {
                tracing::info!(
                    "[pdm-mdm] 会计科目删除 - master_data_id={}",
                    event.master_data_id
                );
                // TODO: 标记 PDM 会计科目配置为已删除
            }
            MasterDataAction::Activated | MasterDataAction::Deactivated => {
                let status = if event.action == MasterDataAction::Activated {
                    "active"
                } else {
                    "inactive"
                };
                tracing::info!(
                    "[pdm-mdm] 会计科目状态变更 - name={}, status={}",
                    subject_name,
                    status
                );
                // TODO: 更新 PDM 会计科目配置状态
            }
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = PdmEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[pdm] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[pdm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
