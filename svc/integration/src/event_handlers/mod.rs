use chrono::Utc;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    require_event_tenant, Event, EventResult, EventSubscriber, EventType,
};

use crate::qms_lims_ehs;

type HandlerResult = std::result::Result<(), TopemsError>;

#[derive(Clone)]
pub struct IntegrationEventHandlers {
    pub db: Db,
}

impl IntegrationEventHandlers {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    pub fn build_subscriber(&self) -> EventResult<EventSubscriber> {
        let subscriber = EventSubscriber::new("integration")?;

        let h1 = self.clone();
        let h2 = self.clone();
        let h3 = self.clone();
        let h_biz = self.clone();

        Ok(subscriber
            .subscribe_handler(vec![EventType::QmsToLimsSyncTriggered], move |event| {
                let h = h1.clone();
                Box::pin(async move { h.handle_qms_to_lims_sync(event).await })
            })
            .subscribe_handler(vec![EventType::EhsToQmsTriggered], move |event| {
                let h = h2.clone();
                Box::pin(async move { h.handle_ehs_to_qms_trigger(event).await })
            })
            .subscribe_handler(vec![EventType::LimsToEhsTriggered], move |event| {
                let h = h3.clone();
                Box::pin(async move { h.handle_lims_to_ehs_trigger(event).await })
            })
            // 7 类业务事件：编排方经 /api/internal/* 调用归属服务（D3 §5.1 选项 A），
            // 不再直写 qms.*/ehs.* schema。
            // 【死路径 3/3｜本次只标注不删除】无生产发布方的
            // `LimsInspectionAbnormalDetected` 订阅；该事件当前仅在
            // `svc/ehs/tests/event_flow_integration.rs` 中由测试构造。
            .subscribe_handler(
                vec![
                    EventType::QmsInspectionCompleted,
                    EventType::QmsQualityIssueCreated,
                    EventType::EhsHazardReported,
                    EventType::EhsAccidentReported,
                    EventType::LimsInspectionAbnormalDetected,
                    EventType::LimsRecordCompleted,
                    EventType::LimsReagentAlert,
                ],
                move |event| {
                    let h = h_biz.clone();
                    Box::pin(async move { h.handle_business_event(event).await })
                },
            ))
    }

    /// 7 类业务事件统一分发：解析 payload → 调归属服务 internal 端点（HTTP 编排）。
    async fn handle_business_event(&self, event: Event) -> HandlerResult {
        let event_type = event.event_type.clone();
        tracing::info!(
            "[integration] 业务事件编排 - event_type={:?}, trace_id={:?}",
            event_type,
            event.trace_id
        );
        qms_lims_ehs::dispatch(event_type, &event.payload)
            .await
            .map_err(|e| TopemsError::BusinessLogic(format!("业务事件编排失败: {}", e)))
    }

    async fn record_sync_log(
        &self,
        tenant_id: uuid::Uuid,
        sync_type: &str,
        source_system: &str,
        target_system: &str,
        status: &str,
        trace_id: Option<String>,
        details: Option<&str>,
        source_type: &str,
        source_id: uuid::Uuid,
    ) -> Result<uuid::Uuid, TopemsError> {
        let now = Utc::now();
        let log_id = uuid::Uuid::new_v4();

        // tenant-system: 后台事件编排无请求上下文，同步日志按事件携带的租户落库，走系统通道。
        let scope_res = self.db.scope_system().await;
        let mut scope = scope_res
            .map_err(|e| TopemsError::BusinessLogic(format!("建立同步日志作用域失败: {}", e)))?;
        let result = sqlx::query_scalar::<_, uuid::Uuid>(
            only_own_schema_query!("integration", "INSERT INTO integration_sync_logs (id, sync_type, source_system, target_system, status, trace_id, details, started_at, source_type, source_id, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (source_type, source_id, tenant_id) DO NOTHING
             RETURNING id"),
        )
        .bind(log_id)
        .bind(sync_type)
        .bind(source_system)
        .bind(target_system)
        .bind(status)
        .bind(trace_id.unwrap_or_default())
        .bind(details.unwrap_or(""))
        .bind(now)
        .bind(source_type)
        .bind(source_id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await;
        let result = match (result, scope.commit().await) {
            (Ok(row), Ok(())) => Ok(row),
            (Err(e), _) => Err(e),
            (Ok(_), Err(e)) => Err(e),
        };

        match result {
            Ok(Some(id)) => {
                tracing::info!(
                    "[integration] 同步日志记录成功: {}→{}, type={}, id={}",
                    source_system,
                    target_system,
                    sync_type,
                    id
                );
                Ok(id)
            }
            Ok(None) => {
                tracing::info!(
                    "[integration] 同步日志已存在（幂等跳过）: source_type={}, source_id={}",
                    source_type,
                    source_id
                );
                Ok(log_id)
            }
            Err(e) => {
                tracing::error!("[integration] 同步日志记录失败: {}", e);
                Err(TopemsError::BusinessLogic(format!(
                    "同步日志记录失败: {}",
                    e
                )))
            }
        }
    }

    async fn handle_qms_to_lims_sync(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[integration] QMS→LIMS 同步事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        // 同步日志表有租户维度且事件本应携带租户：缺失时告警并跳过记录，禁止写零 UUID 共享行。
        let tenant_id = match require_event_tenant(&event) {
            Ok(t) => t.get(),
            Err(e) => {
                tracing::warn!(
                    "[integration] 跳过 QMS→LIMS 同步日志：事件缺少租户上下文（{}）",
                    e
                );
                return Ok(());
            }
        };

        tracing::info!("[integration] 触发 QMS→LIMS 数据同步流程");

        let _ = self
            .record_sync_log(
                tenant_id,
                "quality_inspection",
                "qms",
                "lims",
                "triggered",
                event.trace_id.clone(),
                Some("QMS 质量检验数据同步到 LIMS 实验室管理系统"),
                "qms_to_lims_sync",
                event.event_id,
            )
            .await;

        Ok(())
    }

    async fn handle_ehs_to_qms_trigger(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[integration] EHS→QMS 触发事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        // 同步日志表有租户维度且事件本应携带租户：缺失时告警并跳过记录，禁止写零 UUID 共享行。
        let tenant_id = match require_event_tenant(&event) {
            Ok(t) => t.get(),
            Err(e) => {
                tracing::warn!(
                    "[integration] 跳过 EHS→QMS 同步日志：事件缺少租户上下文（{}）",
                    e
                );
                return Ok(());
            }
        };

        tracing::info!("[integration] 触发 EHS→QMS 数据同步流程");

        let _ = self
            .record_sync_log(
                tenant_id,
                "ehs_incident",
                "ehs",
                "qms",
                "triggered",
                event.trace_id.clone(),
                Some("EHS 环境安全事件同步到 QMS 质量管理系统"),
                "ehs_to_qms_trigger",
                event.event_id,
            )
            .await;

        Ok(())
    }

    async fn handle_lims_to_ehs_trigger(&self, event: Event) -> HandlerResult {
        tracing::info!(
            "[integration] LIMS→EHS 触发事件 - event_type={:?}, trace_id={:?}",
            event.event_type,
            event.trace_id
        );

        // 同步日志表有租户维度且事件本应携带租户：缺失时告警并跳过记录，禁止写零 UUID 共享行。
        let tenant_id = match require_event_tenant(&event) {
            Ok(t) => t.get(),
            Err(e) => {
                tracing::warn!(
                    "[integration] 跳过 LIMS→EHS 同步日志：事件缺少租户上下文（{}）",
                    e
                );
                return Ok(());
            }
        };

        tracing::info!("[integration] 触发 LIMS→EHS 数据同步流程");

        let _ = self
            .record_sync_log(
                tenant_id,
                "lab_result",
                "lims",
                "ehs",
                "triggered",
                event.trace_id.clone(),
                Some("LIMS 实验室检测结果同步到 EHS 环境安全管理系统"),
                "lims_to_ehs_trigger",
                event.event_id,
            )
            .await;

        Ok(())
    }
}

pub async fn start_event_subscribers(db: Db) -> Result<(), TopemsError> {
    let handlers = IntegrationEventHandlers::new(db);
    let subscriber = handlers.build_subscriber()?;

    tracing::info!("[integration] 启动事件订阅者，注册 3 类触发事件 + 7 类业务事件编排 handler");
    tokio::spawn(async move {
        if let Err(e) = subscriber.start_listening().await {
            tracing::error!("[integration] 事件订阅者异常退出: {}", e);
        }
    });
    Ok(())
}
