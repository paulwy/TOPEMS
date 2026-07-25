use axum::routing::get;
use axum::Router;

use topems_shared::auth_middleware;

use crate::handlers;
use crate::modules;
use crate::AppState;

/// Monitor routes registered under `/api/core/monitor/*`.
/// Applies auth middleware to all monitor module routes.
pub fn monitor_routes(state: &AppState) -> Router<AppState> {
    Router::new()
        .nest("/monitor", modules::monitor::create_routes())
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
}

/// Public monitor health endpoint (no auth required).
pub fn monitor_public_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/monitor/health",
            get(handlers::detailed_health),
        )
        .route(
            "/api/plugins/info",
            get(modules::monitor::monitor_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::monitor::monitor_plugin::plugin_health_check),
        )
}
