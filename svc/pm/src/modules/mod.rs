pub mod acceptance;
pub mod analytics;
pub mod budget;
pub mod contract;
pub mod document;
pub mod notification;
pub mod openapi;
pub mod pm_plugin;
pub mod project;
pub mod project_approval;
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

use axum::{extract::Extension, Router};
use std::sync::Arc;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;

use crate::services::audit::PmAuditService;

pub fn create_routes(
    pool: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    workflow_client: TypedServiceClient<WorkflowApi>,
) -> Router {
    let audit_service = PmAuditService::new(pool.clone());
    Router::new()
        .merge(project::create_routes(
            pool.clone(),
            event_publisher.clone(),
        ))
        .merge(project_phase::create_routes(pool.clone()))
        .merge(project_milestone::create_routes(pool.clone()))
        .merge(project_member::create_routes(pool.clone()))
        .merge(project_resource::create_routes(pool.clone()))
        .merge(project_expense::create_routes(pool.clone()))
        .merge(project_benefit::create_routes(pool.clone()))
        .merge(project_approval::create_routes(
            pool.clone(),
            workflow_client.clone(),
        ))
        .merge(project_type_config::create_routes(pool.clone()))
        .merge(service_integration::create_routes(pool.clone()))
        .merge(contract::create_routes(pool.clone()))
        .merge(budget::create_routes(pool.clone()))
        .merge(risk::create_routes(pool.clone()))
        .merge(quality::create_routes(pool.clone()))
        .merge(acceptance::create_routes(pool.clone()))
        .merge(settlement::create_routes(
            pool.clone(),
            event_publisher.clone(),
        ))
        .merge(document::create_routes(pool.clone()))
        .merge(report::create_routes(pool.clone()))
        .merge(notification::create_routes(pool.clone()))
        .merge(task::create_routes(pool.clone()))
        .merge(statistics::create_routes(pool.clone()))
        .merge(analytics::create_routes(pool))
        .layer(Extension(audit_service))
}

// ── 业务层写操作有效租户 ──────────────────────────────────────────────
// superuser 会话无业务租户（Claims.tenant_id=None，TenantContext=nil 供 RLS
// 豁免）→ 回退默认租户 00000000-0000-0000-0000-000000000001（与 create_project
// 历史行为一致）；普通用户 → 会话租户 ctx.tenant_id。
// 历史缺陷：pm 各模块 INSERT 直接绑定 Uuid::nil()，RLS 策略仅对 nil 会话或
// SQL NULL 行放行，nil UUID 行对普通租户会话不可见——用户创建的数据自己看不到。
pub fn effective_tenant_id(
    ctx: &topems_shared_auth::middleware::tenant::TenantContext,
    claims: &topems_shared_auth::auth::Claims,
) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_default()
    } else {
        ctx.tenant_id
    }
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
        let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default().unwrap();
        let router = create_routes(pool, None, workflow_client);
        let _ = router;
    }
}
