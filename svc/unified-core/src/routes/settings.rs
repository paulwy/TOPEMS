//! External integration settings routes (P36-5).
//!
//! SMTP config CRUD + test email, and API Key vault CRUD. All routes are
//! gated with `system:read` / `system:write` permissions, consistent with the
//! existing `system_routes`.

use axum::routing::{get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn settings_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route(
            "/system/settings/smtp",
            get(modules::settings::smtp::get_smtp_config),
        )
        .route(
            "/system/api-keys",
            get(modules::settings::api_keys::list_api_keys),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let write = Router::new()
        .route(
            "/system/settings/smtp",
            put(modules::settings::smtp::update_smtp_config),
        )
        .route(
            "/system/settings/smtp/test",
            post(modules::settings::smtp::test_smtp_config),
        )
        .route(
            "/system/api-keys",
            post(modules::settings::api_keys::create_api_key),
        )
        .route(
            "/system/api-keys/{id}",
            axum::routing::delete(modules::settings::api_keys::delete_api_key),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    read.merge(write)
}
