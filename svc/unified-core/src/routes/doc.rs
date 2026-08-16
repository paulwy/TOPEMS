use axum::routing::get;
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

/// Doc routes registered under `/api/core/doc/*`.
/// Merges the doc module's create_routes() under the `/doc` prefix.
pub fn doc_routes(_state: &AppState) -> Router<AppState> {
    Router::new().nest("/doc", modules::doc::create_routes())
}

/// R4/R6 stub router: mounts require_permission("doc:dashboard:read") on
/// /internal/stubs/doc so backend module set covers the frontend doc module.
pub fn stub_router(state: &AppState) -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(|| async { "ok" }))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("doc:dashboard:read"),
        ))
}
