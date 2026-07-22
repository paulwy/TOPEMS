use chrono::Utc;
use sqlx::PgPool;
use topems_shared::event::{
    Event, EventResult, EventSubscriber, EventType, PermissionChangedPayload,
    WorkflowApprovedPayload, WorkflowRejectedPayload, WorkflowStartedPayload,
};

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct MonitorEventHandlers {
    pub db: PgPool,
}

impl MonitorEventHandlers {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("monitor")?;

        let h1 = self.clone();
        let h2 = self.clone();

        Ok(subscriber
            .subscribe_handler(
                vec![
                    EventType::WorkflowStarted,
                    EventType::WorkflowApproved,
                    EventType::WorkflowRejected,
                ],
                move |event| {
                    let h = h1.clone();
                    Box::pin(async move { h.handle_workflow_event(event).await })
                },
            )
            .subscribe_handler(vec![EventType::PermissionChanged], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_permission_changed(event).await })
            }))
    }

    async fn record_system_activity(
        &self,
        activity_type: &str,
        activity_name: &str,
        source_type: &str,
        source_id: Option<uuid::Uuid>,
        operator: Option<&str>,
        detail: Option<&str>,
    ) -> Result<uuid::Uuid, String> {
        let now = Utc::now();
        let activity_id = uuid::Uuid::new_v4();

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO monitor_system_activities (id, activity_type, activity_name, source_type, source_id, operator, detail, occurred_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '00000000-0000-0000-0000-000000000000')
             ON CONFLICT (source_type, source_id, activity_name) DO NOTHING
             RETURNING id",
        )
        .bind(activity_id)
        .bind(activity_type)
        .bind(activity_name)
        .bind(source_type)
        .bind(source_id)
        .bind(operator.unwrap_or("system"))
        .bind(detail.unwrap_or(""))
        .bind(now)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(id)) => {
                tracing::info!(
                    "[monitor] 系统活动记录成功: type={}, name={}, id={}",
                    activity_type,
                    activity_name,
                    id
                );
                Ok(id)
            }
            Ok(None) => {
                tracing::info!(
                    "[monitor] 系统活动已存在（幂等跳过）: source_type={}, source_id={}, name={}",
                    source_type,
                    source_id.map(|i| i.to_string()).unwrap_or_default(),
                    activity_name
                );
                Ok(activity_id)
            }
            Err(e) => {
                tracing::error!("[monitor] 系统活动记录失败: {}", e);
                Err(format!("系统活动记录失败: {}", e))
            }
        }
    }

    async fn record_audit_log(
        &self,
        action: &str,
        resource_type: &str,
        resource_id: Option<uuid::Uuid>,
        operator: &str,
        detail: &str,
    ) -> Result<uuid::Uuid, String> {
        let now = Utc::now();
        let log_id = uuid::Uuid::new_v4();

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO monitor_audit_logs (id, action, resource_type, resource_id, operator, detail, occurred_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, '00000000-0000-0000-0000-000000000000')
             ON CONFLICT (action, resource_type, resource_id, detail) DO NOTHING
             RETURNING id",
        )
        .bind(log_id)
        .bind(action)
        .bind(resource_type)
        .bind(resource_id)
        .bind(operator)
        .bind(detail)
        .bind(now)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(id)) => {
                tracing::info!(
                    "[monitor] 审计日志记录成功: action={}, resource={}, id={}",
                    action,
                    resource_type,
                    id
                );
                Ok(id)
            }
            Ok(None) => {
                tracing::info!(
                    "[monitor] 审计日志已存在（幂等跳过）: action={}, resource_type={}, resource_id={}",
                    action,
                    resource_type,
                    resource_id.map(|i| i.to_string()).unwrap_or_default()
                );
                Ok(log_id)
            }
            Err(e) => {
                tracing::error!("[monitor] 审计日志记录失败: {}", e);
                Err(format!("审计日志记录失败: {}", e))
            }
        }
    }

    async fn handle_workflow_event(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[monitor] 工作流事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let (
            workflow_name,
            instance_id,
            business_type,
            business_id,
            operator,
            activity_name,
            detail,
        ) = match event.event_type {
            EventType::WorkflowStarted => {
                let payload: WorkflowStartedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析工作流启动事件 payload 失败: {}", e))?;
                (
                    payload.workflow_name.clone(),
                    payload.instance_id,
                    payload.business_type.clone(),
                    payload.business_id,
                    payload.started_by.clone(),
                    format!("工作流启动: {}", payload.workflow_name),
                    format!(
                        "business_type={}, business_key={}",
                        payload.business_type.unwrap_or_default(),
                        payload.business_key.unwrap_or_default()
                    ),
                )
            }
            EventType::WorkflowApproved => {
                let payload: WorkflowApprovedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析工作流审批事件 payload 失败: {}", e))?;
                (
                    payload.workflow_name.clone(),
                    payload.instance_id,
                    payload.business_type.clone(),
                    payload.business_id,
                    payload.approved_by.clone(),
                    format!("工作流审批通过: {}", payload.workflow_name),
                    format!(
                        "business_type={}, business_key={}",
                        payload.business_type.unwrap_or_default(),
                        payload.business_key.unwrap_or_default()
                    ),
                )
            }
            EventType::WorkflowRejected => {
                let payload: WorkflowRejectedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析工作流拒绝事件 payload 失败: {}", e))?;
                (
                    payload.workflow_name.clone(),
                    payload.instance_id,
                    payload.business_type.clone(),
                    payload.business_id,
                    payload.rejected_by.clone(),
                    format!("工作流审批拒绝: {}", payload.workflow_name),
                    format!(
                        "reason={}, business_type={}",
                        payload.reject_reason.unwrap_or_default(),
                        payload.business_type.unwrap_or_default()
                    ),
                )
            }
            _ => return Ok(()),
        };

        tracing::info!(
            "[monitor] 工作流事件: {} ({}), 类型: {:?}",
            activity_name,
            workflow_name,
            business_type
        );

        let _ = self
            .record_system_activity(
                "workflow",
                &activity_name,
                "workflow_instance",
                Some(instance_id),
                operator.as_deref(),
                Some(&detail),
            )
            .await;

        Ok(())
    }

    async fn handle_permission_changed(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[monitor] 权限变更事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: PermissionChangedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析权限变更事件 payload 失败: {}", e))?;

        tracing::info!(
            "[monitor] 权限变更: user_id={}, 新增 {} 项, 移除 {} 项",
            payload.user_id,
            payload.permissions_added.len(),
            payload.permissions_removed.len()
        );

        let detail = format!(
            "新增权限: [{}], 移除权限: [{}]",
            payload.permissions_added.join(", "),
            payload.permissions_removed.join(", ")
        );

        let _ = self
            .record_audit_log(
                "permission_changed",
                "user_permission",
                Some(payload.user_id),
                "system",
                &detail,
            )
            .await;

        Ok(())
    }
}

pub async fn start_event_subscribers(db: PgPool) -> Result<(), String> {
    let handlers = MonitorEventHandlers::new(db);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[monitor] 启动事件订阅者，注册 2 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[monitor] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
