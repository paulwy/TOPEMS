//! Operation Audit Module
//!
//! 业务操作审计日志（区别于 `core_login_logs` 登录日志与 `audit_logs`
//! HTTP 请求审计）。记录所有写操作（POST/PUT/PATCH/DELETE）的业务级
//! 审计信息，包含模块、操作类型、资源类型与 ID、请求数据快照等。

pub mod audit_query;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod service;

pub use middleware::operation_audit_middleware;

use axum::routing::get;
use axum::Router;
use sqlx::PgPool;

use crate::middleware::permission::require_permission;
use crate::AppState;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_operation_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            user_id UUID,
            user_name VARCHAR(128) NOT NULL,
            module VARCHAR(64) NOT NULL,
            operation VARCHAR(32) NOT NULL,
            resource_type VARCHAR(64) NOT NULL,
            resource_id VARCHAR(128),
            description TEXT,
            request_data JSONB,
            response_status INTEGER,
            ip_address VARCHAR(128),
            user_agent TEXT,
            trace_id VARCHAR(64),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 多租户隔离索引
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_operation_logs_tenant_id ON core_operation_logs(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON core_operation_logs(user_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON core_operation_logs(module)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_operation_logs_operation ON core_operation_logs(operation)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_operation_logs_resource ON core_operation_logs(resource_type, resource_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON core_operation_logs(created_at DESC)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_operation_logs_trace_id ON core_operation_logs(trace_id)",
    )
    .execute(pool)
    .await?;

    tracing::info!("Operation audit logs table initialized");
    Ok(())
}

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // ===== 操作审计 =====
        .route(
            "/api/core/audit/operations",
            get(handlers::list_operation_logs),
        )
        .route(
            "/api/core/audit/operations/stats",
            get(handlers::get_operation_log_stats),
        )
        .route(
            "/api/core/audit/operations/{id}",
            get(handlers::get_operation_log),
        )
        // ===== 统一 IAM 审计日志接口 (iam/v1/audit/*) =====
        .route("/iam/v1/audit/logs", get(audit_query::query_audit_logs))
        .route(
            "/iam/v1/audit/logs/stats",
            get(audit_query::get_audit_log_stats),
        )
        .route(
            "/iam/v1/audit/logs/export",
            get(audit_query::export_audit_logs),
        )
        .route(
            "/iam/v1/audit/sources",
            get(audit_query::list_audit_sources),
        )
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            state,
            require_permission("system:audit"),
        ))
}
