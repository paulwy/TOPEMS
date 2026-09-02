use chrono::Utc;
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_event::event::{
    EhsHazardReportedPayload, Event, EventResult, EventSubscriber, EventType,
    ScmShipmentReceivedPayload, StockInboundPayload, StockOutboundPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct GisEventHandlers {
    pub db: PgPool,
}

impl GisEventHandlers {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("gis")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::EhsHazardReported], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_hazard_reported(event).await })
            })
            .subscribe_handler(vec![EventType::ScmShipmentReceived], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_shipment_received(event).await })
            })
            .subscribe_handler(
                vec![EventType::StockInbound, EventType::StockOutbound],
                move |event| {
                    let h = h3.clone();
                    Box::pin(async move { h.handle_stock_change(event).await })
                },
            ))
    }

    async fn update_map_marker(
        &self,
        marker_type: &str,
        source_type: &str,
        source_id: uuid::Uuid,
        title: &str,
        description: Option<&str>,
        level: Option<&str>,
        location: Option<&str>,
    ) -> Result<uuid::Uuid, String> {
        let now = Utc::now();
        let marker_id = uuid::Uuid::new_v4();

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("gis", "INSERT INTO gis_map_markers (id, marker_type, source_type, source_id, title, description, level, location, status, created_at, updated_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $9, '00000000-0000-0000-0000-000000000000')
             ON CONFLICT (source_type, source_id, tenant_id) DO UPDATE SET
                 title = EXCLUDED.title,
                 description = EXCLUDED.description,
                 level = EXCLUDED.level,
                 location = EXCLUDED.location,
                 updated_at = EXCLUDED.updated_at
             RETURNING id"),
        )
        .bind(marker_id)
        .bind(marker_type)
        .bind(source_type)
        .bind(source_id)
        .bind(title)
        .bind(description.unwrap_or(""))
        .bind(level.unwrap_or("normal"))
        .bind(location.unwrap_or(""))
        .bind(now)
        .fetch_one(&self.db)
        .await;

        match result {
            Ok(id) => {
                tracing::info!(
                    "[gis] 地图标注更新成功: type={}, title={}, id={}",
                    marker_type,
                    title,
                    id
                );
                Ok(id)
            }
            Err(e) => {
                tracing::error!("[gis] 地图标注更新失败: {}", e);
                Err(format!("地图标注更新失败: {}", e))
            }
        }
    }

    async fn handle_hazard_reported(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[gis] 隐患报告事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: EhsHazardReportedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析隐患报告事件 payload 失败: {}", e))?;

        tracing::info!(
            "[gis] 隐患报告: {} ({})，类别: {}，等级: {}，位置: {:?}",
            payload.title,
            payload.hazard_id,
            payload.category,
            payload.level,
            payload.location
        );

        let _ = self
            .update_map_marker(
                "hazard",
                "ehs_hazard",
                payload.hazard_id,
                &payload.title,
                payload.description.as_deref(),
                Some(&payload.level),
                payload.location.as_deref(),
            )
            .await;

        Ok(())
    }

    async fn handle_shipment_received(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[gis] 收货事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: ScmShipmentReceivedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析收货事件 payload 失败: {}", e))?;

        tracing::info!(
            "[gis] 收货: {} ({})，供应商: {:?}，数量: {:?}",
            payload.shipment_no,
            payload.shipment_id,
            payload.supplier_name,
            payload.quantity
        );

        let title = format!("物流收货 - {}", payload.shipment_no);
        let description = format!(
            "供应商: {}, 数量: {}",
            payload.supplier_name.unwrap_or_else(|| "未知".to_string()),
            payload.quantity.unwrap_or(0.0)
        );

        let _ = self
            .update_map_marker(
                "logistics",
                "scm_shipment",
                payload.shipment_id,
                &title,
                Some(&description),
                Some("normal"),
                None,
            )
            .await;

        Ok(())
    }

    async fn handle_stock_change(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[gis] 库存变更事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::StockInbound => {
                let payload: StockInboundPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析入库事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[gis] 库存入库: {} ({})，仓库: {:?}，物料: {:?}，数量: {}",
                    payload.inbound_no,
                    payload.inbound_id,
                    payload.warehouse_name,
                    payload.material_name,
                    payload.quantity
                );

                let title = format!("仓库入库 - {}", payload.inbound_no);
                let description = format!(
                    "仓库: {}, 物料: {}, 数量: {}",
                    payload.warehouse_name.unwrap_or_else(|| "未知".to_string()),
                    payload.material_name.unwrap_or_else(|| "未知".to_string()),
                    payload.quantity
                );

                let _ = self
                    .update_map_marker(
                        "warehouse_in",
                        "stock_inbound",
                        payload.inbound_id,
                        &title,
                        Some(&description),
                        Some("normal"),
                        None,
                    )
                    .await;
            }
            EventType::StockOutbound => {
                let payload: StockOutboundPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析出库事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[gis] 库存出库: {} ({})，仓库: {:?}，物料: {:?}，数量: {}",
                    payload.outbound_no,
                    payload.outbound_id,
                    payload.warehouse_name,
                    payload.material_name,
                    payload.quantity
                );

                let title = format!("仓库出库 - {}", payload.outbound_no);
                let description = format!(
                    "仓库: {}, 物料: {}, 数量: {}",
                    payload.warehouse_name.unwrap_or_else(|| "未知".to_string()),
                    payload.material_name.unwrap_or_else(|| "未知".to_string()),
                    payload.quantity
                );

                let _ = self
                    .update_map_marker(
                        "warehouse_out",
                        "stock_outbound",
                        payload.outbound_id,
                        &title,
                        Some(&description),
                        Some("normal"),
                        None,
                    )
                    .await;
            }
            _ => {}
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = GisEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[gis] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[gis] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
