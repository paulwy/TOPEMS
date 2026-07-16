use axum::routing::{get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn plugin_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route(
            "/api/core/plugin/marketplace",
            get(modules::plugin::handlers::get_marketplace_summary),
        )
        .route(
            "/api/core/plugin/marketplace/list",
            get(modules::plugin::handlers::list_plugins),
        )
        .route(
            "/api/core/plugin/marketplace/categories",
            get(modules::plugin::handlers::list_categories),
        )
        .route(
            "/api/core/plugin/plugins/{code}",
            get(modules::plugin::handlers::get_plugin),
        )
        .route(
            "/api/core/plugin/plugins/{plugin_id}/versions",
            get(modules::plugin::handlers::get_plugin_versions),
        )
        .route(
            "/api/core/plugin/plugins/{plugin_id}/reviews",
            get(modules::plugin::handlers::get_plugin_reviews),
        )
        .route(
            "/api/core/plugin/runtime/list",
            get(modules::plugin::handlers::list_plugins_with_status),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins",
            get(modules::plugin::handlers::list_tenant_plugins),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/available",
            get(modules::plugin::handlers::get_available_plugins),
        )
        .route(
            "/api/core/plugins/my",
            get(modules::plugin::handlers::list_my_plugins),
        )
        .route(
            "/api/core/plugin/plugins/{code}/status",
            get(modules::plugin::handlers::get_plugin_status),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("plugin:read"),
        ));

    let write = Router::new()
        .route(
            "/api/core/plugin/plugins/{plugin_id}/reviews",
            post(modules::plugin::handlers::create_review),
        )
        .route(
            "/api/core/plugin/dev/plugins",
            post(modules::plugin::handlers::upload_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}",
            put(modules::plugin::handlers::update_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/publish",
            post(modules::plugin::handlers::publish_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/unpublish",
            post(modules::plugin::handlers::unpublish_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{plugin_code}/versions",
            post(modules::plugin::handlers::upload_plugin_version),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/install",
            post(modules::plugin::handlers::install_plugin),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/uninstall",
            post(modules::plugin::handlers::uninstall_plugin),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/activate",
            post(modules::plugin::handlers::activate_plugin),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/deactivate",
            post(modules::plugin::handlers::deactivate_plugin),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("plugin:write"),
        ));

    read.merge(write)
}
