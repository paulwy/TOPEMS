pub mod audit_query;
pub mod handlers;
pub mod models;

use axum::routing::get;
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::AppState;

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // ===== 权限变更审计 =====
        .route(
            "audit/permission-changes",
            get(handlers::list_permission_changes),
        )
        .route(
            "audit/permission-changes/{id}",
            get(handlers::get_permission_change),
        )
        .route(
            "audit/permission-changes/stats",
            get(handlers::get_permission_change_stats),
        )
        .route(
            "audit/permission-changes/export",
            get(handlers::export_permission_changes),
        )
        // ===== 访问控制审计 =====
        .route("audit/access-logs", get(handlers::list_access_logs))
        .route("audit/access-logs/{id}", get(handlers::get_access_log))
        .route(
            "audit/access-logs/stats",
            get(handlers::get_access_control_stats),
        )
        .route(
            "audit/access-logs/export",
            get(handlers::export_access_logs),
        )
        // ===== 统一 IAM 审计日志接口 (iam/v1/audit/*) =====
        .route("iam/v1/audit/logs", get(audit_query::query_audit_logs))
        .route(
            "iam/v1/audit/logs/stats",
            get(audit_query::get_audit_log_stats),
        )
        .route(
            "iam/v1/audit/logs/export",
            get(audit_query::export_audit_logs),
        )
        .route("iam/v1/audit/sources", get(audit_query::list_audit_sources))
        // ===== 限流配置接口 =====
        .route(
            "iam/v1/rate-limit/config",
            get(handlers::get_rate_limit_config)
                .put(handlers::update_rate_limit_config)
                .post(handlers::reset_rate_limit_config),
        )
        .route(
            "iam/v1/rate-limit/config/anti-replay",
            get(handlers::get_anti_replay_config).put(handlers::update_anti_replay_config),
        )
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            state,
            require_permission("system:audit"),
        ))
}
