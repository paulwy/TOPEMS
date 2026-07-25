use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::event::{
    EhsHazardReportedPayload, Event, EventPublisher, EventResult, EventSubscriber, EventType,
    LimsInspectionAbnormalDetectedPayload, QmsQualityIssueCreatedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
#[allow(dead_code)]
pub struct AiEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl AiEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("ai")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::QmsQualityIssueCreated], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_quality_issue_created(event).await })
            })
            .subscribe_handler(
                vec![EventType::LimsInspectionAbnormalDetected],
                move |event| {
                    let h = h2.clone();
                    Box::pin(async move { h.handle_inspection_abnormal(event).await })
                },
            )
            .subscribe_handler(vec![EventType::EhsHazardReported], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_hazard_reported(event).await })
            }))
    }

    async fn add_training_sample(
        &self,
        model_type: &str,
        sample_type: &str,
        label: &str,
        source_type: &str,
        source_id: uuid::Uuid,
        features_json: Option<&str>,
    ) -> Result<uuid::Uuid, String> {
        let now = Utc::now();
        let sample_id = uuid::Uuid::new_v4();

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO ai_training_samples (id, model_type, sample_type, label, source_type, source_id, features_json, quality_score, is_used, created_at, updated_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 1.0, false, $8, $8, '00000000-0000-0000-0000-000000000000')
             ON CONFLICT (source_type, source_id) DO NOTHING
             RETURNING id",
        )
        .bind(sample_id)
        .bind(model_type)
        .bind(sample_type)
        .bind(label)
        .bind(source_type)
        .bind(source_id)
        .bind(features_json.unwrap_or("{}"))
        .bind(now)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(id)) => {
                tracing::info!(
                    "[ai] 训练样本入库成功: model={}, type={}, label={}, id={}",
                    model_type,
                    sample_type,
                    label,
                    id
                );
                Ok(id)
            }
            Ok(None) => {
                tracing::info!(
                    "[ai] 训练样本已存在（幂等跳过）: source_type={}, source_id={}",
                    source_type,
                    source_id
                );
                Ok(sample_id)
            }
            Err(e) => {
                tracing::error!("[ai] 训练样本入库失败: {}", e);
                Err(format!("训练样本入库失败: {}", e))
            }
        }
    }

    async fn handle_quality_issue_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[ai] 质量问题事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: QmsQualityIssueCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析质量问题事件 payload 失败: {}", e))?;

        tracing::info!(
            "[ai] 质量问题创建: {} ({})，严重度: {:?}",
            payload.title,
            payload.issue_id,
            payload.severity
        );

        let label = payload
            .severity
            .clone()
            .unwrap_or_else(|| "unknown".to_string());
        let features = format!(
            "{{\"title\":\"{}\",\"severity\":\"{}\",\"description\":\"{}\"}}",
            payload.title.replace('"', "\\\""),
            label,
            payload
                .description
                .clone()
                .unwrap_or_default()
                .replace('"', "\\\"")
        );

        let _ = self
            .add_training_sample(
                "quality_anomaly_detection",
                "quality_issue",
                &label,
                "qms_issue",
                payload.issue_id,
                Some(&features),
            )
            .await;

        Ok(())
    }

    async fn handle_inspection_abnormal(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[ai] 检验异常事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: LimsInspectionAbnormalDetectedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析检验异常事件 payload 失败: {}", e))?;

        tracing::info!(
            "[ai] 检验异常: 任务 {}，样品 {}，检测项: {}，结论: {}",
            payload.task_no,
            payload.sample_no,
            payload.test_item,
            payload.conclusion
        );

        let features = format!(
            "{{\"task_no\":\"{}\",\"sample_no\":\"{}\",\"test_item\":\"{}\",\"conclusion\":\"{}\"}}",
            payload.task_no.replace('"', "\\\""),
            payload.sample_no.replace('"', "\\\""),
            payload.test_item.replace('"', "\\\""),
            payload.conclusion.replace('"', "\\\"")
        );

        let _ = self
            .add_training_sample(
                "inspection_anomaly_detection",
                "lims_abnormal",
                &payload.conclusion,
                "lims_task",
                payload.task_id,
                Some(&features),
            )
            .await;

        Ok(())
    }

    async fn handle_hazard_reported(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[ai] 隐患报告事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: EhsHazardReportedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析隐患报告事件 payload 失败: {}", e))?;

        tracing::info!(
            "[ai] 隐患报告: {} ({})，类别: {}，等级: {}",
            payload.title,
            payload.hazard_id,
            payload.category,
            payload.level
        );

        let features = format!(
            "{{\"title\":\"{}\",\"category\":\"{}\",\"level\":\"{}\",\"location\":\"{}\"}}",
            payload.title.replace('"', "\\\""),
            payload.category.replace('"', "\\\""),
            payload.level.replace('"', "\\\""),
            payload
                .location
                .clone()
                .unwrap_or_default()
                .replace('"', "\\\"")
        );

        let _ = self
            .add_training_sample(
                "hazard_identification",
                "ehs_hazard",
                &payload.level,
                "ehs_hazard",
                payload.hazard_id,
                Some(&features),
            )
            .await;

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = AiEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[ai] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[ai] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
