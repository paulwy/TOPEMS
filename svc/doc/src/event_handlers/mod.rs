use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::event::{
    DocDocumentUploadedPayload, EhsAccidentReportedPayload, Event, EventPublisher, EventResult,
    EventSubscriber, EventType, PdmDocumentReleasedPayload, QmsQualityIssueCreatedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct DocEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl DocEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("doc")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::PdmDocumentReleased], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_document_released(event).await })
            })
            .subscribe_handler(vec![EventType::QmsQualityIssueCreated], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_quality_issue_created(event).await })
            })
            .subscribe_handler(vec![EventType::EhsAccidentReported], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_accident_reported(event).await })
            }))
    }

    async fn archive_document(
        &self,
        doc_no: &str,
        title: &str,
        doc_type: &str,
        category: &str,
        source_type: &str,
        source_id: uuid::Uuid,
        version: Option<&str>,
        created_by: Option<&str>,
    ) -> Result<Option<uuid::Uuid>, String> {
        let now = Utc::now();

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO doc_documents (id, doc_no, title, doc_type, category, status, version, source_type, source_id, created_by, tenant_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'archived', $6, $7, $8, $9, '00000000-0000-0000-0000-000000000000', $10, $10)
             ON CONFLICT (source_type, source_id) DO NOTHING
             RETURNING id",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(doc_no)
        .bind(title)
        .bind(doc_type)
        .bind(category)
        .bind(version.unwrap_or("1.0"))
        .bind(source_type)
        .bind(source_id)
        .bind(created_by.unwrap_or("system"))
        .bind(now)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(id)) => {
                tracing::info!(
                    "[doc] 文档归档成功: {} ({}), type={}, category={}",
                    title,
                    id,
                    doc_type,
                    category
                );

                if let Some(ref publisher) = self.event_publisher {
                    let publisher = publisher.clone();
                    let doc_id = id;
                    let doc_name = title.to_string();
                    let src_type = source_type.to_string();
                    let src_id = source_id;
                    let now = Utc::now();
                    tokio::spawn(async move {
                        let payload = DocDocumentUploadedPayload {
                            document_id: doc_id,
                            document_name: doc_name,
                            file_path: format!("/{}/{}", src_type, src_id),
                            file_size: None,
                            uploaded_by: Some("system".to_string()),
                            uploaded_at: Some(now),
                        };
                        if let Err(e) = publisher
                            .publish_event(EventType::DocDocumentUploaded, payload)
                            .await
                        {
                            tracing::warn!(
                                "[doc] DocDocumentUploaded 事件发布失败（graceful fallback）: {}",
                                e
                            );
                        } else {
                            tracing::info!(
                                "[doc] DocDocumentUploaded 事件发布成功 - doc_id={}",
                                doc_id
                            );
                        }
                    });
                }

                Ok(Some(id))
            }
            Ok(None) => {
                tracing::info!(
                    "[doc] 文档已存在（幂等跳过）: source={}/{}",
                    source_type,
                    source_id
                );
                Ok(None)
            }
            Err(e) => {
                tracing::error!("[doc] 文档归档失败: {}", e);
                Err(format!("文档归档失败: {}", e))
            }
        }
    }

    async fn handle_document_released(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[doc] 文档发布事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PdmDocumentReleasedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析文档发布事件 payload 失败: {}", e))?;

        tracing::info!(
            "[doc] PDM 文档发布: {} {} ({})，版本: {:?}",
            payload.document_no,
            payload.document_name,
            payload.document_id,
            payload.version
        );

        let _ = self
            .archive_document(
                &payload.document_no,
                &payload.document_name,
                "technical",
                "pdm_release",
                "pdm_document",
                payload.document_id,
                payload.version.as_deref(),
                payload.released_by.as_deref(),
            )
            .await;

        Ok(())
    }

    async fn handle_quality_issue_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[doc] 质量问题事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: QmsQualityIssueCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析质量问题事件 payload 失败: {}", e))?;

        tracing::info!(
            "[doc] 质量问题创建: {} ({})，严重度: {:?}",
            payload.title,
            payload.issue_id,
            payload.severity
        );

        let doc_no = format!("QA-{}", payload.issue_no);
        let title = format!("质量异常报告 - {}", payload.title);
        let category = match payload.severity.as_deref() {
            Some("critical") | Some("major") => "quality_critical",
            _ => "quality_general",
        };

        let _ = self
            .archive_document(
                &doc_no,
                &title,
                "quality_report",
                category,
                "qms_issue",
                payload.issue_id,
                Some("1.0"),
                payload.created_by.as_deref(),
            )
            .await;

        Ok(())
    }

    async fn handle_accident_reported(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[doc] 事故报告事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: EhsAccidentReportedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析事故报告事件 payload 失败: {}", e))?;

        tracing::info!(
            "[doc] 事故报告: {} ({})，严重度: {}，位置: {:?}",
            payload.title,
            payload.accident_id,
            payload.severity,
            payload.location
        );

        let doc_no = format!("EHS-{}", payload.accident_no);
        let title = format!("事故调查报告 - {}", payload.title);
        let category = format!("ehs_{}", payload.severity);

        let _ = self
            .archive_document(
                &doc_no,
                &title,
                "accident_report",
                &category,
                "ehs_accident",
                payload.accident_id,
                Some("1.0"),
                None,
            )
            .await;

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = DocEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[doc] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[doc] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
