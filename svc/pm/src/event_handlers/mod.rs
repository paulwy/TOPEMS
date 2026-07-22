use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::event::{
    Event, EventPublisher, EventResult, EventSubscriber, EventType, HrmEmployeeCreatedPayload,
    HrmEmployeeUpdatedPayload, RdProjectCreatedPayload, WorkflowApprovedPayload,
    WorkflowRejectedPayload,
};
use uuid::Uuid;

type HandlerResult = std::result::Result<(), String>;

#[derive(Clone)]
pub struct PmEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl PmEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("pm")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(
                vec![EventType::HrmEmployeeCreated, EventType::HrmEmployeeUpdated],
                move |event| {
                    let h = h1.clone();
                    Box::pin(async move { h.handle_employee_changed(event).await })
                },
            )
            .subscribe_handler(
                vec![EventType::WorkflowApproved, EventType::WorkflowRejected],
                move |event| {
                    let h = h2.clone();
                    Box::pin(async move { h.handle_workflow_result(event).await })
                },
            )
            .subscribe_handler(vec![EventType::RdProjectCreated], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_rd_project_created(event).await })
            }))
    }

    async fn handle_employee_changed(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pm] 员工变更事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let employee_id: Uuid;
        let employee_name: Option<String>;

        match event.event_type {
            EventType::HrmEmployeeCreated => {
                let payload: HrmEmployeeCreatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析员工创建事件 payload 失败: {}", e))?;
                employee_id = payload.employee_id;
                employee_name = Some(payload.name);
                tracing::info!(
                    "[pm] 员工创建: {} ({})，刷新相关项目成员缓存",
                    employee_name.as_deref().unwrap_or(""),
                    employee_id
                );
            }
            EventType::HrmEmployeeUpdated => {
                let payload: HrmEmployeeUpdatedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析员工更新事件 payload 失败: {}", e))?;
                employee_id = payload.employee_id;
                employee_name = None;
                tracing::info!(
                    "[pm] 员工更新: {}，更新字段: {:?}，刷新相关项目成员缓存",
                    employee_id,
                    payload.updated_fields
                );
            }
            _ => return Ok(()),
        }

        let member_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM pm.project_members WHERE user_id = $1",
        )
        .bind(employee_id.to_string())
        .fetch_one(&self.db)
        .await
        .unwrap_or(0);

        tracing::info!(
            "[pm] 员工 {} 参与了 {} 个项目，项目成员关联已同步",
            employee_id,
            member_count
        );

        Ok(())
    }

    async fn handle_workflow_result(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pm] 审批结果事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let (business_id, business_type, approved, operator, reason) = match event.event_type {
            EventType::WorkflowApproved => {
                let payload: WorkflowApprovedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析审批通过事件 payload 失败: {}", e))?;
                (
                    payload.business_id,
                    payload.business_type,
                    true,
                    payload.approved_by,
                    None,
                )
            }
            EventType::WorkflowRejected => {
                let payload: WorkflowRejectedPayload = event
                    .parse_payload()
                    .map_err(|e| format!("解析审批拒绝事件 payload 失败: {}", e))?;
                (
                    payload.business_id,
                    payload.business_type,
                    false,
                    payload.rejected_by,
                    payload.reject_reason,
                )
            }
            _ => return Ok(()),
        };

        let business_type = match business_type {
            Some(bt) => bt,
            None => {
                tracing::info!("[pm] 审批事件无 business_type，跳过");
                return Ok(());
            }
        };

        if business_type != "project_approval" && business_type != "pm_project_approval" {
            tracing::info!(
                "[pm] 非项目审批事件 (business_type={})，跳过",
                business_type
            );
            return Ok(());
        }

        let project_id = match business_id {
            Some(id) => id,
            None => {
                tracing::warn!("[pm] 审批事件无 business_id，无法处理");
                return Ok(());
            }
        };

        let now = Utc::now();
        let status = if approved { "approved" } else { "rejected" };

        let result = sqlx::query(
            r#"
            UPDATE plugin_pm.project_approvals
            SET status = $1, comments = $2, updated_at = $3
            WHERE project_id = $4 AND status = 'pending'
            "#,
        )
        .bind(status)
        .bind(reason.unwrap_or_default())
        .bind(now)
        .bind(project_id)
        .execute(&self.db)
        .await;

        match result {
            Ok(r) => {
                if r.rows_affected() > 0 {
                    let _ = sqlx::query(
                        "UPDATE plugin_pm.projects SET status = $1, updated_at = $2 WHERE id = $3",
                    )
                    .bind(if approved { "active" } else { "rejected" })
                    .bind(now)
                    .bind(project_id)
                    .execute(&self.db)
                    .await;

                    tracing::info!(
                        "[pm] 项目 {} 审批状态已更新为 {} (操作人: {:?})",
                        project_id,
                        status,
                        operator
                    );
                } else {
                    tracing::info!("[pm] 项目 {} 无待处理审批，或审批已处理", project_id);
                }
            }
            Err(e) => {
                tracing::error!("[pm] 更新项目审批状态失败: {}", e);
                return Err(format!("更新项目审批状态失败: {}", e));
            }
        }

        Ok(())
    }

    async fn handle_rd_project_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[pm] RD 项目创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: RdProjectCreatedPayload = event
            .parse_payload()
            .map_err(|e| format!("解析 RD 项目创建事件 payload 失败: {}", e))?;

        tracing::info!(
            "[pm] RD 项目创建: {} ({})，负责人: {:?}",
            payload.project_name,
            payload.project_id,
            payload.owner_name
        );

        let now = Utc::now();
        let project_code = payload
            .project_code
            .clone()
            .unwrap_or_else(|| format!("RD-{}", payload.project_id));

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO plugin_pm.projects (id, name, code, description, project_type, status, leader, start_date, progress, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'rd_project', 'active', $5, $6, 0, $7, $7)
             ON CONFLICT (id) DO NOTHING
             RETURNING id",
        )
        .bind(payload.project_id)
        .bind(&payload.project_name)
        .bind(&project_code)
        .bind(format!("RD 项目同步 - {}", payload.project_name))
        .bind(payload.owner_name)
        .bind(payload.created_at.unwrap_or(now))
        .bind(now)
        .fetch_optional(&self.db)
        .await;

        match result {
            Ok(Some(project_id)) => {
                tracing::info!(
                    "[pm] RD 项目已同步到 PM: rd_project_id={}, pm_project_id={}",
                    payload.project_id,
                    project_id
                );
            }
            Ok(None) => {
                tracing::info!(
                    "[pm] RD 项目已存在（幂等跳过）: project_id={}",
                    payload.project_id
                );
            }
            Err(e) => {
                tracing::error!("[pm] RD 项目同步失败: {}", e);
            }
        }

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), String> {
    let handlers = PmEventHandlers::new(db, event_publisher);
    let subscriber = handlers.build_subscriber().map_err(|e| e.to_string())?;

    tracing::info!("[pm] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[pm] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
