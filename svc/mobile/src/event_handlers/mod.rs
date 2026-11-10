use chrono::Utc;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    EhsAccidentReportedPayload, EhsHazardReportedPayload, Event, EventPublisher, EventResult,
    EventSubscriber, EventType, PmProjectCreatedPayload, QmsQualityIssueCreatedPayload,
    RdProjectCreatedPayload, SalesOrderCreatedPayload,
};

type HandlerResult = std::result::Result<(), TopemsError>;

#[derive(Clone)]
pub struct MobileEventHandlers {
    pub db: Db,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl MobileEventHandlers {
    pub fn new(db: Db, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("mobile")?;

        let h3 = self.clone();
        let h4 = self.clone();
        let h5 = self.clone();
        let h6 = self.clone();
        let h7 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::EhsHazardReported], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_hazard_reported(event).await })
            })
            .subscribe_handler(vec![EventType::EhsAccidentReported], move |event| {
                let h = h4.clone();
                Box::pin(async move { h.handle_ehs_accident(event).await })
            })
            .subscribe_handler(vec![EventType::QmsQualityIssueCreated], move |event| {
                let h = h5.clone();
                Box::pin(async move { h.handle_qms_quality_issue(event).await })
            })
            .subscribe_handler(
                vec![EventType::RdProjectCreated, EventType::PmProjectCreated],
                move |event| {
                    let h = h6.clone();
                    Box::pin(async move { h.handle_project_created(event).await })
                },
            )
            .subscribe_handler(vec![EventType::SalesOrderCreated], move |event| {
                let h = h7.clone();
                Box::pin(async move { h.handle_sales_order_created(event).await })
            }))
    }

    async fn create_push_notification(
        &self,
        notification_type: &str,
        title: &str,
        content: &str,
        priority: &str,
        source_type: &str,
        source_id: uuid::Uuid,
        target_user: Option<&str>,
    ) -> Result<Option<uuid::Uuid>, TopemsError> {
        let now = Utc::now();
        let notification_id = uuid::Uuid::new_v4();
        let mut scope = match self.db.scope().await {
            Ok(scope) => scope,
            Err(e) => {
                tracing::error!("[mobile] 数据库作用域创建失败: {}", e);
                return Err(TopemsError::BusinessLogic(format!(
                    "推送通知创建失败: {}",
                    e
                )));
            }
        };

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("mobile", "INSERT INTO mobile.mobile_push_notifications (id, notification_type, title, content, priority, source_type, source_id, target_user, status, push_time, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, '00000000-0000-0000-0000-000000000000')
             ON CONFLICT (source_type, source_id) DO NOTHING
             RETURNING id"),
        )
        .bind(notification_id)
        .bind(notification_type)
        .bind(title)
        .bind(content)
        .bind(priority)
        .bind(source_type)
        .bind(source_id)
        .bind(target_user.unwrap_or("all"))
        .bind(now)
        .fetch_optional(&mut scope)
        .await;

        match result {
            Ok(Some(id)) => {
                let _ = scope.commit().await;
                tracing::info!(
                    "[mobile] 推送通知创建成功: type={}, title={}, id={}",
                    notification_type,
                    title,
                    id
                );
                Ok(Some(id))
            }
            Ok(None) => {
                let _ = scope.commit().await;
                tracing::info!(
                    "[mobile] 推送通知已存在（幂等跳过）: source_type={}, source_id={}",
                    source_type,
                    source_id
                );
                Ok(None)
            }
            Err(e) => {
                let _ = scope.rollback().await;
                tracing::error!("[mobile] 推送通知创建失败: {}", e);
                Err(TopemsError::BusinessLogic(format!(
                    "推送通知创建失败: {}",
                    e
                )))
            }
        }
    }

    async fn handle_hazard_reported(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[mobile] 隐患报告事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: EhsHazardReportedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析隐患报告事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[mobile] 隐患报告: {} ({})，等级: {}，类别: {}",
            payload.title,
            payload.hazard_id,
            payload.level,
            payload.category
        );

        let priority = match payload.level.as_str() {
            "critical" | "high" => "urgent",
            "medium" => "high",
            _ => "normal",
        };

        let title = format!("安全隐患告警 - {}", payload.title);
        let content = format!(
            "隐患等级: {}，类别: {}，位置: {}",
            payload.level,
            payload.category,
            payload
                .location
                .clone()
                .unwrap_or_else(|| "未指定".to_string())
        );

        let _ = self
            .create_push_notification(
                "safety_alert",
                &title,
                &content,
                priority,
                "ehs_hazard",
                payload.hazard_id,
                None,
            )
            .await;

        Ok(())
    }

    async fn handle_ehs_accident(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[mobile] EHS 事故报告事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: EhsAccidentReportedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 EHS 事故报告事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[mobile] 事故报告: {} ({})，严重程度: {}",
            payload.title,
            payload.accident_id,
            payload.severity
        );

        let priority = match payload.severity.as_str() {
            "critical" | "fatal" => "urgent",
            "major" | "high" => "high",
            _ => "normal",
        };

        let title = format!("安全事故告警 - {}", payload.title);
        let content = format!(
            "事故等级: {}，地点: {}",
            payload.severity,
            payload
                .location
                .clone()
                .unwrap_or_else(|| "未指定".to_string())
        );

        let _ = self
            .create_push_notification(
                "safety_accident",
                &title,
                &content,
                priority,
                "ehs_accident",
                payload.accident_id,
                None,
            )
            .await;

        Ok(())
    }

    async fn handle_qms_quality_issue(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[mobile] QMS 质量问题事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: QmsQualityIssueCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 QMS 质量问题事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[mobile] 质量问题: {} ({})，严重程度: {:?}",
            payload.title,
            payload.issue_id,
            payload.severity
        );

        let priority = match payload.severity.as_deref() {
            Some("critical") | Some("high") => "high",
            _ => "normal",
        };

        let title = format!("质量问题告警 - {}", payload.title);
        let content = format!(
            "问题编号: {}，严重程度: {}",
            payload.issue_no,
            payload.severity.unwrap_or_else(|| "medium".to_string())
        );

        let _ = self
            .create_push_notification(
                "quality_issue",
                &title,
                &content,
                priority,
                "qms_quality_issue",
                payload.issue_id,
                None,
            )
            .await;

        Ok(())
    }

    async fn handle_project_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[mobile] 项目创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        match event.event_type {
            EventType::RdProjectCreated => {
                let payload: RdProjectCreatedPayload = event.parse_payload().map_err(|e| {
                    TopemsError::ValidationFailed(format!(
                        "解析 RD 项目创建事件 payload 失败: {}",
                        e
                    ))
                })?;

                tracing::info!(
                    "[mobile] RD 项目创建: {} ({})",
                    payload.project_name,
                    payload.project_id
                );

                let title = format!("RD 项目创建 - {}", payload.project_name);
                let content = format!(
                    "项目负责人: {}",
                    payload.owner_name.unwrap_or_else(|| "未指定".to_string())
                );

                let _ = self
                    .create_push_notification(
                        "rd_project_created",
                        &title,
                        &content,
                        "normal",
                        "rd_project",
                        payload.project_id,
                        None,
                    )
                    .await;
            }
            EventType::PmProjectCreated => {
                let payload: PmProjectCreatedPayload = event.parse_payload().map_err(|e| {
                    TopemsError::ValidationFailed(format!(
                        "解析 PM 项目创建事件 payload 失败: {}",
                        e
                    ))
                })?;

                tracing::info!(
                    "[mobile] PM 项目创建: {} ({})",
                    payload.project_name,
                    payload.project_id
                );

                let title = format!("PM 项目创建 - {}", payload.project_name);
                let content = format!("项目负责人 ID: {}", payload.owner_id);

                let _ = self
                    .create_push_notification(
                        "pm_project_created",
                        &title,
                        &content,
                        "normal",
                        "pm_project",
                        payload.project_id,
                        None,
                    )
                    .await;
            }
            _ => {}
        }

        Ok(())
    }

    async fn handle_sales_order_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[mobile] 销售订单创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        // v1.85 闭环：payload 解析失败属不可恢复消息（重试无法修复），记录日志后跳过 ACK，
        // 避免 UUID 解析失败等坏事件触发无限重试/ERROR 风暴（历史 79 条 retry 键残留根因）。
        let payload: SalesOrderCreatedPayload = match event.parse_payload() {
            Ok(p) => p,
            Err(e) => {
                tracing::error!(
                    "[mobile] 解析销售订单创建事件 payload 失败（不可恢复，跳过）: {}",
                    e
                );
                return Ok(());
            }
        };

        tracing::info!(
            "[mobile] 销售订单创建: {} ({})，客户: {:?}",
            payload.order_no,
            payload.order_id,
            payload.customer_name
        );

        let title = format!("新销售订单 - {}", payload.order_no);
        let content = format!(
            "客户: {}，金额: {}",
            payload
                .customer_name
                .unwrap_or_else(|| "未知客户".to_string()),
            payload
                .total_amount
                .map(|a| format!("{:.2}", a))
                .unwrap_or_else(|| "待确认".to_string())
        );

        let _ = self
            .create_push_notification(
                "sales_order_created",
                &title,
                &content,
                "normal",
                "sales_order",
                payload.order_id,
                None,
            )
            .await;

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: Db,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), TopemsError> {
    let handlers = MobileEventHandlers::new(db, event_publisher);
    let subscriber = handlers
        .build_subscriber()
        .map_err(|e| TopemsError::internal("构建事件订阅者失败", e))?;

    tracing::info!("[mobile] 启动事件订阅者，注册 7 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[mobile] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
