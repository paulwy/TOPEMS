use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use topems_shared_event::event::{
    Event, EventPublisher, EventResult, EventSubscriber, EventType, HrmEmployeeCreatedPayload,
    HrmEmployeeUpdatedPayload, LimsInspectionAbnormalDetectedPayload,
    QmsCorrectiveActionCreatedPayload,
};

type HandlerResult = std::result::Result<(), TopemsError>;

#[derive(Clone)]
pub struct EhsEventHandlers {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl EhsEventHandlers {
    pub fn new(db: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        Self {
            db,
            event_publisher,
        }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("ehs")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();

        Ok(subscriber
            .subscribe_handler(
                vec![EventType::LimsInspectionAbnormalDetected],
                move |event| {
                    let h = h1.clone();
                    Box::pin(async move { h.handle_lims_abnormal_detected(event).await })
                },
            )
            .subscribe_handler(vec![EventType::QmsCorrectiveActionCreated], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_corrective_action_created(event).await })
            })
            .subscribe_handler(
                vec![EventType::HrmEmployeeCreated, EventType::HrmEmployeeUpdated],
                move |event| {
                    let h = h3.clone();
                    Box::pin(async move { h.handle_employee_changed(event).await })
                },
            ))
    }

    async fn handle_lims_abnormal_detected(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[ehs] LIMS 异常检测事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: LimsInspectionAbnormalDetectedPayload =
            event.parse_payload().map_err(|e| {
                TopemsError::ValidationFailed(format!("解析 LIMS 异常检测事件 payload 失败: {}", e))
            })?;

        tracing::info!(
            "[ehs] 检测异常: 任务 {}，样品 {}，检测项: {}，结论: {}",
            payload.task_no,
            payload.sample_no,
            payload.test_item,
            payload.conclusion
        );

        let Some(tenant_id) = require_event_tenant(
            payload.tenant_id,
            &event,
            "lims_inspection_abnormal_detected",
        ) else {
            return Ok(());
        };

        let hazard_no = format!("EHS-HZ-{}", Utc::now().timestamp_subsec_millis());
        let now = Utc::now();

        // D4：租户只来自 payload.tenant_id；写入走租户作用域，禁止 nil 业务行
        let db = topems_shared_db::scope::Db::new(self.db.clone(), "ehs, public, shared");
        let mut scope = match db.scope_for_tenant(tenant_id).await {
            Ok(s) => s,
            Err(e) => {
                return Err(TopemsError::DatabaseTransaction(format!(
                    "LIMS 异常事件打开租户事务失败: {e}"
                )))
            }
        };

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("ehs", "INSERT INTO ehs.qa_ehs_hazards (hazard_no, title, category, level, description, status, source, reported_by, tenant_id, created_at, updated_at)
             VALUES ($1, $2, 'environment', 'high', $3, 'reported', 'lims_abnormal', 'system', $5, $4, $4)
             ON CONFLICT (hazard_no) DO NOTHING
             RETURNING id"),
        )
        .bind(&hazard_no)
        .bind(format!("环境检测异常 - {}", payload.test_item))
        .bind(format!(
            "检测任务: {}, 样品: {}, 检测项: {}, 结论: {}",
            payload.task_no, payload.sample_no, payload.test_item, payload.conclusion
        ))
        .bind(now)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await;

        match result {
            Ok(Some(hazard_id)) => {
                tracing::info!(
                    "[ehs] 环境安全隐患记录创建成功: {} ({})",
                    hazard_no,
                    hazard_id
                );
            }
            Ok(None) => {
                tracing::info!("[ehs] 环境安全隐患记录已存在（幂等跳过）: {}", hazard_no);
            }
            Err(e) => {
                tracing::error!("[ehs] 环境安全隐患记录创建失败: {}", e);
                return Err(TopemsError::DatabaseQuery(format!(
                    "LIMS 异常事件写入隐患失败: {e}"
                )));
            }
        }

        if let Err(e) = scope.commit().await {
            return Err(TopemsError::DatabaseTransaction(format!(
                "LIMS 异常事件提交失败: {e}"
            )));
        }

        Ok(())
    }

    async fn handle_corrective_action_created(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[ehs] 纠正措施创建事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let payload: QmsCorrectiveActionCreatedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析纠正措施创建事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[ehs] 纠正措施: {} ({})，负责人: {}",
            payload.title,
            payload.action_id,
            payload.assigned_to
        );

        let Some(tenant_id) =
            require_event_tenant(payload.tenant_id, &event, "qms_corrective_action_created")
        else {
            return Ok(());
        };

        let hazard_no = format!("CA-QMS-{}", payload.action_id);
        let now = Utc::now();

        // D4：租户只来自 payload.tenant_id；写入走租户作用域，禁止 nil 业务行
        let db = topems_shared_db::scope::Db::new(self.db.clone(), "ehs, public, shared");
        let mut scope = match db.scope_for_tenant(tenant_id).await {
            Ok(s) => s,
            Err(e) => {
                return Err(TopemsError::DatabaseTransaction(format!(
                    "QMS 纠正措施事件打开租户事务失败: {e}"
                )))
            }
        };

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("ehs", "INSERT INTO ehs.qa_ehs_hazards (hazard_no, title, category, level, description, status, source, reported_by, tenant_id, created_at, updated_at)
             VALUES ($1, $2, 'quality_corrective', 'medium', $3, 'reported', 'qms_corrective', 'system', $5, $4, $4)
             ON CONFLICT (hazard_no) DO NOTHING
             RETURNING id"),
        )
        .bind(&hazard_no)
        .bind(&payload.title)
        .bind(payload.description.unwrap_or_default())
        .bind(now)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await;

        match result {
            Ok(Some(hazard_id)) => {
                tracing::info!(
                    "[ehs] 纠正措施已同步到环境安全管理: action_id={}, hazard_id={}",
                    payload.action_id,
                    hazard_id
                );
            }
            Ok(None) => {
                tracing::info!(
                    "[ehs] 纠正措施已存在（幂等跳过）: action_id={}",
                    payload.action_id
                );
            }
            Err(e) => {
                tracing::error!("[ehs] 纠正措施同步失败: {}", e);
                return Err(TopemsError::DatabaseQuery(format!(
                    "QMS 纠正措施事件写入隐患失败: {e}"
                )));
            }
        }

        if let Err(e) = scope.commit().await {
            return Err(TopemsError::DatabaseTransaction(format!(
                "QMS 纠正措施事件提交失败: {e}"
            )));
        }

        Ok(())
    }

    async fn handle_employee_changed(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[ehs] 员工变更事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let employee_id;
        let mut name = None;
        let mut email = None;
        let mut department_id = None;
        let payload_tenant_id;

        match event.event_type {
            EventType::HrmEmployeeCreated => {
                let payload: HrmEmployeeCreatedPayload = event.parse_payload().map_err(|e| {
                    TopemsError::ValidationFailed(format!("解析员工创建事件 payload 失败: {}", e))
                })?;
                payload_tenant_id = payload.tenant_id;
                employee_id = payload.employee_id;
                name = Some(payload.name);
                email = Some(payload.email);
                department_id = payload.department_id;
                tracing::info!(
                    "[ehs] 员工创建: {} ({})",
                    name.as_deref().unwrap_or(""),
                    employee_id
                );
            }
            EventType::HrmEmployeeUpdated => {
                let payload: HrmEmployeeUpdatedPayload = event.parse_payload().map_err(|e| {
                    TopemsError::ValidationFailed(format!("解析员工更新事件 payload 失败: {}", e))
                })?;
                payload_tenant_id = payload.tenant_id;
                employee_id = payload.employee_id;
                if let Some(new_data) = payload.new_data {
                    name = new_data
                        .get("name")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    email = new_data
                        .get("email")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    department_id = new_data
                        .get("department_id")
                        .and_then(|v| v.as_str())
                        .and_then(|s| uuid::Uuid::parse_str(s).ok());
                }
                tracing::info!(
                    "[ehs] 员工更新: {}，更新字段: {:?}",
                    employee_id,
                    payload.updated_fields
                );
            }
            _ => return Ok(()),
        }

        let Some(tenant_id) =
            require_event_tenant(payload_tenant_id, &event, "hrm_employee_changed")
        else {
            return Ok(());
        };

        let now = Utc::now();

        // D4：租户只来自 payload.tenant_id；写入走租户作用域，禁止 nil 业务行
        let db = topems_shared_db::scope::Db::new(self.db.clone(), "ehs, public, shared");
        let mut scope = match db.scope_for_tenant(tenant_id).await {
            Ok(s) => s,
            Err(e) => {
                return Err(TopemsError::DatabaseTransaction(format!(
                    "HRM 员工事件打开租户事务失败: {e}"
                )))
            }
        };

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("ehs", "INSERT INTO ehs.qa_ehs_employees (id, name, email, department_id, status, created_at, updated_at, tenant_id)
             VALUES ($1, $2, $3, $4, 'active', $5, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
                name = COALESCE(EXCLUDED.name, qa_ehs_employees.name),
                email = COALESCE(EXCLUDED.email, qa_ehs_employees.email),
                department_id = COALESCE(EXCLUDED.department_id, qa_ehs_employees.department_id),
                updated_at = $5
             RETURNING id"),
        )
        .bind(employee_id)
        .bind(name)
        .bind(email)
        .bind(department_id)
        .bind(now)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await;

        match result {
            Ok(Some(_)) => {
                tracing::info!("[ehs] 员工信息已同步: employee_id={}", employee_id);
            }
            Ok(None) => {
                tracing::info!("[ehs] 员工信息已存在且无变化: employee_id={}", employee_id);
            }
            Err(e) => {
                tracing::error!("[ehs] 员工信息同步失败: {}", e);
                return Err(TopemsError::DatabaseQuery(format!(
                    "HRM 员工事件写入失败: {e}"
                )));
            }
        }

        if let Err(e) = scope.commit().await {
            return Err(TopemsError::DatabaseTransaction(format!(
                "HRM 员工事件提交失败: {e}"
            )));
        }

        Ok(())
    }
}

/// D4：事件消费者唯一的租户来源是 `payload.tenant_id`。
/// 缺失/nil → 丢弃事件并累计告警计数；非法由反序列化阶段拦截。
static EHS_EVENT_DROPPED_MISSING_TENANT: std::sync::atomic::AtomicU64 =
    std::sync::atomic::AtomicU64::new(0);

fn require_event_tenant(
    tenant_id: uuid::Uuid,
    event: &Event,
    handler: &'static str,
) -> Option<uuid::Uuid> {
    if tenant_id.is_nil() {
        let dropped =
            EHS_EVENT_DROPPED_MISSING_TENANT.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
        tracing::warn!(
            "[ehs] 丢弃事件：payload.tenant_id 缺失/nil（handler={}, event_type={:?}, trace_id={:?}, dropped_total={}）",
            handler,
            event.event_type,
            event.trace_id,
            dropped
        );
        return None;
    }
    Some(tenant_id)
}

pub async fn start_event_subscribers(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
) -> Result<(), TopemsError> {
    let handlers = EhsEventHandlers::new(db, event_publisher);
    let subscriber = handlers
        .build_subscriber()
        .map_err(|e| TopemsError::internal("构建事件订阅者失败", e))?;

    tracing::info!("[ehs] 启动事件订阅者，注册 3 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[ehs] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
