use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_core::TopemsError;
use topems_shared_event::event::commit_retry;
use topems_shared_event::event::{
    require_event_tenant, AfterSalesTicketCreatedPayload, EmployeeOnboardedPayload, Event,
    EventPublisher, EventResult, EventSubscriber, EventType, PmProjectCreatedPayload,
};

type HandlerResult = std::result::Result<(), TopemsError>;

#[derive(Clone)]
pub struct PortalEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl PortalEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("portal")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::EmployeeOnboarded], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_employee_onboarded(event).await })
            })
            .subscribe_handler(vec![EventType::PmProjectCreated], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_project_created(event).await })
            })
            .subscribe_handler(vec![EventType::AfterSalesTicketCreated], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_after_sales_ticket(event).await })
            }))
    }

    async fn create_notification(
        &self,
        tenant_id: uuid::Uuid,
        title: &str,
        content: &str,
        service: &str,
        service_name: &str,
        notification_type: &str,
        link_url: Option<&str>,
        target_user: Option<&str>,
    ) -> Result<uuid::Uuid, TopemsError> {
        let now = Utc::now();
        let notif_id = uuid::Uuid::new_v4();
        // 目标用户若存在但非法，必须显式失败：降级为空目标会被下游当成全员广播。
        let target_users = match target_user {
            Some(uid) => vec![uuid::Uuid::parse_str(uid).map_err(|e| {
                TopemsError::ValidationFailed(format!(
                    "门户通知目标用户非法 - target_user={uid}: {e}"
                ))
            })?],
            None => Vec::new(),
        };
        let db = topems_shared_db::scope::Db::new(self.db.clone(), "portal, public, shared");
        let mut scope = db.scope_for_tenant(tenant_id).await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "打开门户通知写入作用域失败 - tenant_id={tenant_id}: {e}"
            ))
        })?;

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO portal.portal_notifications (id, title, content, service, service_name, notification_type, read, created_at, link_url, target_user, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9, $10)
             RETURNING id",
        )
        .bind(notif_id)
        .bind(title)
        .bind(content)
        .bind(service)
        .bind(service_name)
        .bind(notification_type)
        .bind(now)
        .bind(link_url)
        .bind(target_user)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await;

        match result {
            Ok(id) => {
                scope.commit().await.map_err(|e| {
                    TopemsError::DatabaseTransaction(format!(
                        "提交门户通知写入失败 - tenant_id={tenant_id}, id={id}: {e}"
                    ))
                })?;

                tracing::info!(
                    "[portal] 通知创建成功: {} ({}), type={}",
                    title,
                    id,
                    notification_type
                );

                if let Some(ref publisher) = self.event_publisher {
                    let publisher = publisher.clone();
                    let notification_id = id;
                    let title_owned = title.to_string();
                    let message = content.to_string();
                    let published_at = Some(Utc::now());
                    tokio::spawn(async move {
                        let payload =
                            topems_shared_event::event::PortalNotificationPublishedPayload {
                                notification_id,
                                title: title_owned,
                                message,
                                target_users,
                                published_at,
                            };
                        let et = EventType::PortalNotificationPublished;
                        if let Err(e) = publisher.publish_event(et, &payload).await {
                            tracing::warn!(
                                "[portal] PortalNotificationPublished 事件发布失败，已入重试队列: {}",
                                e
                            );
                            // D6：发布失败入 Redis ZSET，由 main.rs 15s run_relay 重发（typed 通道直重发 payload）。
                            commit_retry::push_retry_typed("portal", et, &payload).await;
                        } else {
                            tracing::info!(
                                "[portal] PortalNotificationPublished 事件发布成功 - notification_id={}",
                                notification_id
                            );
                        }
                    });
                }

                Ok(id)
            }
            Err(e) => {
                tracing::error!("[portal] 通知创建失败: {}", e);
                Err(TopemsError::DatabaseQuery(format!(
                    "门户通知创建失败 - tenant_id={tenant_id}: {e}"
                )))
            }
        }
    }

    async fn handle_employee_onboarded(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[portal] 员工入职事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let tenant_id = require_event_tenant(&event)
            .map_err(|e| TopemsError::ValidationFailed(e.to_string()))?
            .get();

        let payload: EmployeeOnboardedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析员工入职事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[portal] 新员工入职: {} ({})，工号: {:?}，部门: {:?}",
            payload.name,
            payload.employee_id,
            payload.employee_number,
            payload.department_id
        );

        let title = format!("欢迎新员工 {} 加入团队", payload.name);
        let content = format!(
            "{} 已加入公司，工号：{}，让我们一起欢迎新同事！",
            payload.name,
            payload
                .employee_number
                .unwrap_or_else(|| "待分配".to_string())
        );

        self.create_notification(
            tenant_id,
            &title,
            &content,
            "hrm",
            "人力资源",
            "welcome",
            None,
            None,
        )
        .await?;

        Ok(())
    }

    async fn handle_project_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[portal] 项目创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let tenant_id = require_event_tenant(&event)
            .map_err(|e| TopemsError::ValidationFailed(e.to_string()))?
            .get();

        let payload: PmProjectCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析项目创建事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[portal] 新项目创建: {} ({})，负责人: {}",
            payload.project_name,
            payload.project_id,
            payload.owner_id
        );

        let db = topems_shared_db::scope::Db::new(self.db.clone(), "portal, public, shared");
        let mut scope = db.scope_for_tenant(tenant_id).await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "打开门户项目概览作用域失败 - tenant_id={tenant_id}: {e}"
            ))
        })?;

        let project_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM portal.portal_dashboard_stats WHERE stat_key = 'total_projects' AND tenant_id = $1",
        )
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!(
                "读取门户项目概览失败 - tenant_id={tenant_id}: {e}"
            ))
        })?;

        sqlx::query(
            "INSERT INTO portal.portal_dashboard_stats (stat_key, stat_value, stat_label, updated_at, tenant_id)
             VALUES ('total_projects', $1, '项目总数', $2, $3)
             ON CONFLICT (stat_key, tenant_id) DO UPDATE SET
                 stat_value = portal_dashboard_stats.stat_value + 1,
                 updated_at = EXCLUDED.updated_at",
        )
        .bind(project_count + 1)
        .bind(Utc::now())
        .bind(tenant_id)
        .execute(&mut scope)
        .await
        .map_err(|e| {
            TopemsError::DatabaseQuery(format!(
                "更新门户项目概览失败 - tenant_id={tenant_id}: {e}"
            ))
        })?;

        scope.commit().await.map_err(|e| {
            TopemsError::DatabaseTransaction(format!(
                "提交门户项目概览失败 - tenant_id={tenant_id}: {e}"
            ))
        })?;

        tracing::info!(
            "[portal] 门户项目概览已更新: total_projects={}",
            project_count + 1
        );

        let title = format!("新项目启动：{}", payload.project_name);
        let content = format!(
            "项目 {} 已正式创建，请相关成员关注项目进展。",
            payload.project_name
        );

        self.create_notification(
            tenant_id,
            &title,
            &content,
            "pm",
            "项目管理",
            "info",
            None,
            Some(&payload.owner_id.to_string()),
        )
        .await?;

        Ok(())
    }

    async fn handle_after_sales_ticket(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[portal] 售后工单事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let tenant_id = require_event_tenant(&event)
            .map_err(|e| TopemsError::ValidationFailed(e.to_string()))?
            .get();

        let payload: AfterSalesTicketCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析售后工单事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[portal] 售后工单创建: {} ({})，客户: {:?}，优先级: {:?}",
            payload.title,
            payload.ticket_id,
            payload.customer_name,
            payload.priority
        );

        let priority_label = match payload.priority.as_deref() {
            Some("high") | Some("urgent") => "高优先级",
            Some("medium") => "中优先级",
            _ => "普通",
        };

        let title = format!("售后工单提醒：{}", payload.title);
        let content = format!(
            "客户 {} 提交了售后工单（{}），优先级：{}，请及时处理。",
            payload
                .customer_name
                .unwrap_or_else(|| "未知客户".to_string()),
            payload.ticket_no,
            priority_label
        );

        let notification_type = match payload.priority.as_deref() {
            Some("high") | Some("urgent") => "warning",
            _ => "info",
        };

        self.create_notification(
            tenant_id,
            &title,
            &content,
            "crm",
            "客户关系",
            notification_type,
            None,
            payload.created_by.as_deref(),
        )
        .await?;

        Ok(())
    }
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), TopemsError> {
    let handlers = PortalEventHandlers::new(db, event_publisher);
    let subscriber = handlers
        .build_subscriber()
        .map_err(|e| TopemsError::Internal(format!("事件订阅者初始化失败: {e}")))?;

    tracing::info!("[portal] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[portal] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
