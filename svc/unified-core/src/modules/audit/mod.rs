//! Operation Audit Module
//!
//! 业务操作审计日志（包含 `core_login_logs` 登录日志、`core_operation_logs` 业务操作日志
//! 与 `audit_logs` HTTP 请求审计）。记录所有写操作（POST/PUT/PATCH/DELETE）的业务级
//! 审计信息，包含模块、操作类型、资源类型与 ID、请求数据快照等。
//!
//! V68.1 A2.4.1: 原独立 login_log 模块已合并为本模块子模块（login_log_models + login_log_handlers），
//! 统一由 `audit::init_database` 和 `audit::create_routes` 管理，减少顶层模块计数。

pub mod audit_query;
pub mod handlers;
pub mod login_log_handlers;
pub mod login_log_models;
pub mod login_status;
pub mod middleware;
pub mod models;
pub mod service;

pub use middleware::operation_audit_middleware;
// V68.1 A2.4.1: 对外 re-export，兼容原先 `crate::modules::login_log::handlers::record_login_event`
// 等引用路径，调用方逐步迁移到 `audit::login_log_handlers::record_login_event`
pub use login_log_handlers::*;
pub use login_log_models::*;

use axum::routing::{delete, get, post};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::AppState;

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // ===== V68.1 A2.4.1: 登录日志（原 login_log 模块） =====
        // 路由路径与先前完全一致：/api/core/login-log/*
        .route("/login-log/logs", get(login_log_handlers::list_login_logs))
        .route("/login-log/logs", post(login_log_handlers::record_login))
        .route(
            "/login-log/logs/batch-delete",
            post(login_log_handlers::batch_delete_login_logs),
        )
        .route(
            "/login-log/logs/{id}",
            get(login_log_handlers::get_login_log),
        )
        .route(
            "/login-log/logs/{id}",
            delete(login_log_handlers::delete_login_log),
        )
        // ===== 操作审计 =====
        // 注意：本路由树已被 BFF nest 到 /api/core 之下（嵌入模式），路径不得再硬编码
        // /api/core 前缀，否则实际挂载为 /api/core/api/core/audit/...（前端探测 404）。
        .route("/audit/operations", get(handlers::list_operation_logs))
        .route(
            "/audit/operations/stats",
            get(handlers::get_operation_log_stats),
        )
        .route("/audit/operations/{id}", get(handlers::get_operation_log))
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
        // ===== 权限变更审计 (stub) =====
        .route(
            "/audit/permission-changes",
            get(handlers::list_permission_changes),
        )
        .route(
            "/audit/permission-changes/stats",
            get(handlers::get_permission_change_stats),
        )
        .route(
            "/audit/permission-changes/{id}",
            get(handlers::get_permission_change),
        )
        .route(
            "/audit/permission-changes/export",
            get(handlers::export_permission_changes),
        )
        // ===== 访问控制审计 (stub) =====
        .route("/audit/access-logs", get(handlers::list_access_logs))
        .route(
            "/audit/access-logs/stats",
            get(handlers::get_access_log_stats),
        )
        .route("/audit/access-logs/{id}", get(handlers::get_access_log))
        .route(
            "/audit/access-logs/export",
            get(handlers::export_access_logs),
        )
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            state,
            require_permission("system:audit"),
        ))
}
