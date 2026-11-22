use crate::modules::safety_task_status::SafetyTaskStatus;
use chrono::Utc;
use topems_shared_core::error::TopemsError;
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    require_event_tenant, EhsHazardReportedPayload, Event, EventResult, EventSubscriber, EventType,
    QmsInspectionCompletedPayload,
};

type HandlerResult = std::result::Result<(), TopemsError>;

#[derive(Clone)]
pub struct LimsEventHandlers {
    pub db: Db,
}

impl LimsEventHandlers {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("lims")?;

        let h1 = self.clone();
        let h2 = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::QmsInspectionCompleted], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_qms_inspection_completed(event).await })
            })
            .subscribe_handler(vec![EventType::EhsHazardReported], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_ehs_hazard_reported(event).await })
            }))
    }

    async fn handle_qms_inspection_completed(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[lims] QMS 检验完成事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        // 租户只来自 payload；缺失/nil/非法 → 报错进重试上限 → DLQ
        let tenant = require_event_tenant(&event)?;

        let payload: QmsInspectionCompletedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 QMS 检验完成事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[lims] QMS 检验完成: {} ({})，产品: {:?}，结果: {}，合格率: {:?}%",
            payload.inspection_no,
            payload.inspection_id,
            payload.product_name,
            payload.result,
            payload.qualification_rate
        );

        let now = Utc::now();
        let mut scope = self
            .db
            .scope_for_tenant(tenant.get())
            .await
            .map_err(|e| TopemsError::internal("LIMS 事件处理器建立租户作用域失败", e))?;

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO lims.lims_inspection_records (record_no, source_type, source_inspection_id, product_id, product_name, result, qualification_rate, inspector, status, tenant_id, created_at, updated_at)
             VALUES ($1, 'qms', $2, $3, $4, $5, $6, $7, 'completed', $9, $8, $8)
             ON CONFLICT (tenant_id, source_type, source_inspection_id) DO NOTHING
             RETURNING id",
        )
        .bind(format!("LAB-{}", payload.inspection_no))
        .bind(payload.inspection_id)
        .bind(payload.product_id)
        .bind(payload.product_name.unwrap_or_default())
        .bind(&payload.result)
        .bind(payload.qualification_rate)
        .bind(&payload.inspector)
        .bind(now)
        .bind(tenant.get())
        .fetch_optional(&mut scope)
        .await;

        match result {
            Ok(Some(id)) => {
                tracing::info!(
                    "[lims] 检验结果已同步到实验室记录: inspection_id={}, record_id={}",
                    payload.inspection_id,
                    id
                );
            }
            Ok(None) => {
                tracing::info!(
                    "[lims] 检验记录已存在（幂等跳过）: inspection_id={}",
                    payload.inspection_id
                );
            }
            Err(e) => {
                tracing::error!("[lims] 检验结果同步失败: {}", e);
                return Err(TopemsError::internal("检验结果同步失败", e));
            }
        }

        scope
            .commit()
            .await
            .map_err(|e| TopemsError::internal("LIMS 事件处理器提交事务失败", e))
    }

    async fn handle_ehs_hazard_reported(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[lims] EHS 隐患报告事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        let tenant = require_event_tenant(&event)?;

        let payload: EhsHazardReportedPayload = event.parse_payload().map_err(|e| {
            TopemsError::ValidationFailed(format!("解析 EHS 隐患报告事件 payload 失败: {}", e))
        })?;

        tracing::info!(
            "[lims] EHS 隐患报告: {} ({})，类别: {}，等级: {}，位置: {:?}",
            payload.title,
            payload.hazard_id,
            payload.category,
            payload.level,
            payload.location
        );

        let now = Utc::now();
        let task_no = format!("SAFE-TASK-{}", payload.hazard_id);

        let mut scope = self
            .db
            .scope_for_tenant(tenant.get())
            .await
            .map_err(|e| TopemsError::internal("LIMS 事件处理器建立租户作用域失败", e))?;

        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            "INSERT INTO lims.lims_safety_tasks (task_no, title, category, level, description, location, status, source_type, source_hazard_id, assigned_to, tenant_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $10, 'ehs_hazard', $7, 'system', $9, $8, $8)
             ON CONFLICT (tenant_id, source_type, source_hazard_id) DO NOTHING
             RETURNING id",
        )
        .bind(&task_no)
        .bind(&payload.title)
        .bind(&payload.category)
        .bind(&payload.level)
        .bind(payload.description.unwrap_or_default())
        .bind(payload.location.unwrap_or_default())
        .bind(payload.hazard_id)
        .bind(now)
        .bind(tenant.get())
        .bind(SafetyTaskStatus::DEFAULT.as_db_str())
        .fetch_optional(&mut scope)
        .await;

        match result {
            Ok(Some(task_id)) => {
                tracing::info!(
                    "[lims] 实验室安全检测任务创建成功: {} ({})",
                    task_no,
                    task_id
                );
            }
            Ok(None) => {
                tracing::info!(
                    "[lims] 安全检测任务已存在（幂等跳过）: hazard_id={}",
                    payload.hazard_id
                );
            }
            Err(e) => {
                tracing::error!("[lims] 实验室安全检测任务创建失败: {}", e);
                return Err(TopemsError::internal("实验室安全检测任务创建失败", e));
            }
        }

        scope
            .commit()
            .await
            .map_err(|e| TopemsError::internal("LIMS 事件处理器提交事务失败", e))
    }
}

pub async fn start_event_subscribers(db: Db) -> Result<(), TopemsError> {
    let handlers = LimsEventHandlers::new(db);
    let subscriber = handlers
        .build_subscriber()
        .map_err(|e| TopemsError::internal("构建事件订阅者失败", e))?;

    tracing::info!("[lims] 启动事件订阅者，注册 2 类业务事件 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[lims] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
