use axum::routing::get;
use axum::Router;

use topems_shared::auth_middleware;

use crate::handlers;
use crate::AppState;

pub fn monitor_routes(state: &AppState) -> Router<AppState> {
    Router::new()
        .route("/api/core/health/detailed", get(handlers::detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
}
