pub mod handlers;
pub mod models;

use axum::{routing::get, Router};

use crate::middleware::permission::require_permission;
use crate::AppState;

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route(
            "/api/core/audit/permission-changes",
            get(handlers::list_permission_changes),
        )
        .route(
            "/api/core/audit/permission-changes/{id}",
            get(handlers::get_permission_change),
        )
        .route(
            "/api/core/audit/permission-changes/stats",
            get(handlers::get_permission_change_stats),
        )
        .route(
            "/api/core/audit/permission-changes/export",
            get(handlers::export_permission_changes),
        )
        .route(
            "/api/core/audit/access-logs",
            get(handlers::list_access_logs),
        )
        .route(
            "/api/core/audit/access-logs/{id}",
            get(handlers::get_access_log),
        )
        .route(
            "/api/core/audit/access-logs/stats",
            get(handlers::get_access_control_stats),
        )
        .route(
            "/api/core/audit/access-logs/export",
            get(handlers::export_access_logs),
        )
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            state,
            require_permission("system:audit"),
        ))
}
