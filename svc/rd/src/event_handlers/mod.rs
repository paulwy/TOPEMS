use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::event::{
    Event, EventPublisher, EventResult, EventSubscriber, EventType, PdmBomCreatedPayload,
    PdmBomUpdatedPayload, PdmMaterialCreatedPayload, PdmMaterialUpdatedPayload,
    PmProjectCompletedPayload, PmProjectCreatedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct RdEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl RdEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("rd")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(
                vec![EventType::PmProjectCreated, EventType::PmProjectCompleted],
                move |event| {
                    let h = h1.clone();
                    Box::pin(async move { h.handle_project_event(event).await })
                },
            )
            .subscribe_handler(
                vec![EventType::PdmMaterialCreated, EventType::PdmMaterialUpdated],
                move |event| {
                    let h = h2.clone();
                    Box::pin(async move { h.handle_material_event(event).await })
                },
            )
            .subscribe_handler(
                vec![EventType::PdmBomCreated, EventType::PdmBomUpdated],
                move |event| {
                    let h = h3.clone();
                    Box::pin(async move { h.handle_bom_event(event).await })
                },
            ))
    }

    async fn handle_project_event(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[rd] 项目事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::PmProjectCreated => {
                let payload: PmProjectCreatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析项目创建事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[rd] PM 项目创建: {} ({})，负责人: {}",
                    payload.project_name,
                    payload.project_id,
                    payload.owner_id
                );

                let code = format!(
                    "RD-{}-{}",
                    payload.project_name.chars().take(4).collect::<String>(),
                    Utc::now().timestamp_subsec_millis()
                );
                let result = sqlx::query_scalar::<_, uuid::Uuid>(
                    "INSERT INTO rs_projects (name, code, project_type, status, leader, progress, start_date, created_by, created_at, updated_at, source_type, source_id)
                     VALUES ($1, $2, 'r_d', 'pending', $3, 0, $4, 'system', $4, $4, 'pm_project', $5)
                     ON CONFLICT (source_type, source_id) DO NOTHING
                     RETURNING id",
                )
                .bind(&payload.project_name)
                .bind(code)
                .bind(payload.owner_id.to_string())
                .bind(Utc::now())
                .bind(payload.project_id)
                .fetch_optional(&self.db)
                .await;

                match result {
                    Ok(Some(_id)) => {
                        tracing::info!(
                            "[rd] 关联研发项目创建成功: project={}, source_id={}",
                            payload.project_name,
                            payload.project_id
                        );
                    }
                    Ok(None) => {
                        tracing::info!(
                            "[rd] 研发项目已存在（幂等跳过）: project={}, source_id={}",
                            payload.project_name,
                            payload.project_id
                        );
                    }
                    Err(e) => {
                        tracing::error!("[rd] 关联研发项目创建失败: {}", e);
                    }
                }
            }
            EventType::PmProjectCompleted => {
                let payload: PmProjectCompletedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析项目完成事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[rd] PM 项目完成: {} ({})，完成人: {:?}",
                    payload.project_name,
                    payload.project_id,
                    payload.completed_by
                );

                let result = sqlx::query(
                    "UPDATE rs_projects SET status = 'completed', progress = 100, updated_at = $1 WHERE name = $2",
                )
                .bind(Utc::now())
                .bind(&payload.project_name)
                .execute(&self.db)
                .await;

                match result {
                    Ok(r) => {
                        if r.rows_affected() > 0 {
                            tracing::info!(
                                "[rd] 研发项目状态同步完成: project={}",
                                payload.project_name
                            );
                        } else {
                            tracing::warn!(
                                "[rd] 未找到匹配的研发项目: project={}",
                                payload.project_name
                            );
                        }
                    }
                    Err(e) => {
                        tracing::error!("[rd] 研发项目状态同步失败: {}", e);
                    }
                }
            }
            _ => {}
        }

        Ok(())
    }

    async fn handle_material_event(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[rd] 物料事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::PdmMaterialCreated => {
                let payload: PdmMaterialCreatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析物料创建事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[rd] PDM 物料创建: {} {} ({})，类型: {:?}",
                    payload.material_code,
                    payload.material_name,
                    payload.material_id,
                    payload.material_type
                );

                let total_materials: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM rs_formulas")
                    .fetch_one(&self.db)
                    .await
                    .unwrap_or(0);

                tracing::info!(
                    "[rd] 研发物料库同步检查: 当前配方总数={}，新物料: {} 可用于研发配方",
                    total_materials,
                    payload.material_code
                );
            }
            EventType::PdmMaterialUpdated => {
                let payload: PdmMaterialUpdatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析物料更新事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[rd] PDM 物料更新: {} ({})，更新字段: {}",
                    payload.material_code,
                    payload.material_id,
                    payload.updates
                );

                tracing::info!(
                    "[rd] 研发物料库已同步更新: material_id={}",
                    payload.material_id
                );
            }
            _ => {}
        }

        Ok(())
    }

    async fn handle_bom_event(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[rd] BOM 事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::PdmBomCreated => {
                let payload: PdmBomCreatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析 BOM 创建事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[rd] PDM BOM 创建: {} ({})，产品: {:?}，版本: {:?}",
                    payload.bom_code,
                    payload.bom_id,
                    payload.product_name,
                    payload.version
                );

                let total_experiments: i64 =
                    sqlx::query_scalar("SELECT COUNT(*) FROM rs_experiments")
                        .fetch_one(&self.db)
                        .await
                        .unwrap_or(0);

                tracing::info!(
                    "[rd] 研发 BOM 数据同步: 当前实验总数={}，新 BOM: {} 可参考",
                    total_experiments,
                    payload.bom_code
                );
            }
            EventType::PdmBomUpdated => {
                let payload: PdmBomUpdatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析 BOM 更新事件 payload 失败: {}", e))?;

                tracing::info!(
                    "[rd] PDM BOM 更新: {} ({})，更新字段: {}",
                    payload.bom_code,
                    payload.bom_id,
                    payload.updates
                );

                tracing::info!("[rd] 研发 BOM 数据已同步更新: bom_id={}", payload.bom_id);
            }
            _ => {}
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = RdEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[rd] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[rd] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
