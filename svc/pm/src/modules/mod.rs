pub mod acceptance;
pub mod analytics;
pub mod budget;
pub mod contract;
pub mod contract_status;
pub mod document;
pub mod notification;
pub mod openapi;
pub mod pm_plugin;
pub mod project;
pub mod project_approval;
pub mod project_approval_status;
pub mod project_benefit;
pub mod project_expense;
pub mod project_member;
pub mod project_milestone;
pub mod project_phase;
pub mod project_resource;
pub mod project_type_config;
pub mod quality;
pub mod report;
pub mod risk;
pub mod service_integration;
pub mod settlement;
pub mod statistics;
pub mod task;
pub mod task_status;

use axum::{extract::Extension, Router};
use std::sync::Arc;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;

use crate::services::audit::PmAuditService;

pub fn create_routes(
    db: Db,
    audit_pool: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    workflow_client: TypedServiceClient<WorkflowApi>,
) -> Router {
    let audit_service = PmAuditService::new(audit_pool.clone());
    Router::new()
        .merge(project::create_routes(db.clone(), event_publisher.clone()))
        .merge(project_phase::create_routes(db.clone()))
        .merge(project_milestone::create_routes(db.clone()))
        .merge(project_member::create_routes(db.clone()))
        .merge(project_resource::create_routes(db.clone()))
        .merge(project_expense::create_routes(db.clone()))
        .merge(project_benefit::create_routes(db.clone()))
        .merge(project_approval::create_routes(
            db.clone(),
            audit_pool.clone(),
            workflow_client,
        ))
        .merge(project_type_config::create_routes(db.clone()))
        .merge(service_integration::create_routes(db.clone()))
        .merge(contract::create_routes(db.clone()))
        .merge(budget::create_routes(db.clone()))
        .merge(risk::create_routes(db.clone()))
        .merge(quality::create_routes(db.clone()))
        .merge(acceptance::create_routes(db.clone()))
        .merge(settlement::create_routes(db.clone(), event_publisher))
        .merge(document::create_routes(db.clone()))
        .merge(report::create_routes(db.clone()))
        .merge(notification::create_routes(db.clone()))
        .merge(task::create_routes(db.clone()))
        .merge(statistics::create_routes(db.clone()))
        .merge(analytics::create_routes(db))
        .layer(Extension(audit_service))
}

// ── 业务层写操作有效租户 ──────────────────────────────────────────────
// 唯一来源是请求上下文里的真实租户；不再为超管回退 `…0001` 常量租户。
// 超管的跨租户能力由 RLS 系统通道（`app.rls_system='on'`，见
// `shared_db::Db::scope_system/scope_read_system`）承担，把常量租户写进业务列
// 会让数据归属错误、并对普通租户会话不可见。
pub fn effective_tenant_id(
    ctx: &topems_shared_auth::middleware::tenant::TenantContext,
    _claims: &topems_shared_auth::auth::Claims,
) -> uuid::Uuid {
    ctx.tenant_id
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;
    use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let pool = make_pool();
        let db = Db::new(pool.clone(), "pm, public, shared");
        let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default().unwrap();
        let router = create_routes(db, pool, None, workflow_client);
        let _ = router;
    }
}
