use axum::routing::{get, post};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn migration_routes(state: &AppState) -> Router<AppState> {
    Router::new()
        .route(
            "/api/migrations/services",
            get(modules::migration::handlers::list_services),
        )
        .route(
            "/api/migrations/services/{name}/status",
            get(modules::migration::handlers::get_status),
        )
        .route(
            "/api/migrations/services/{name}/apply",
            post(modules::migration::handlers::apply_migration),
        )
        .route(
            "/api/migrations/services/{name}/rollback",
            post(modules::migration::handlers::rollback_migration),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:migration"),
        ))
}
