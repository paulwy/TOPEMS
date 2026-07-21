//! Route registration for the unified-core service.
//!
//! Organized by business domain into sub-modules. The single public function
//! `create_routes` builds the full application router (public + protected routes
//! with all permission middleware layers applied) and returns a `Router<AppState>`
//! that the caller finalises with telemetry, CORS, prometheus and state.

mod communication;
mod file;
mod flow;
mod help;
mod iam;
mod master;
mod migration;
mod mobile;
mod monitor;
mod plugin;
mod system;

use axum::routing::{get, post, put};
use axum::Router;

use topems_shared::{auth_middleware, get_api_info_handler};

use crate::handlers;
use crate::middleware;
use crate::middleware::tenant_rls::tenant_rls_middleware;
use crate::modules;
use crate::AppState;

/// Build the full application router.
///
/// The returned `Router<AppState>` still needs the outermost layers
/// (telemetry, CORS, prometheus) and the final `.with_state(state)` call,
/// which are applied by `main.rs`.
///
/// `metrics_render` is a closure that renders the prometheus metrics as a
/// `String`. It is captured by the `/metrics` route handler. Using a closure
/// here avoids naming the private `PrometheusHandle` type from
/// `axum_prometheus`.
pub fn create_routes(
    state: &AppState,
    metrics_render: impl Fn() -> String + Clone + Send + Sync + 'static,
) -> Router<AppState> {
    // ===== Public routes (no auth required) =====
    let public_routes = Router::new()
        .route("/", get(handlers::home))
        .route("/health", get(handlers::health))
        .route("/api", get(|| get_api_info_handler("unified-core-service")))
        .route(
            "/api/info",
            get(|| get_api_info_handler("unified-core-service")),
        )
        .route(
            "/api/plugins/info",
            get(modules::plugin::handlers::list_plugins_with_status),
        )
        .route(
            "/api/core/plugin/navigation-config",
            get(modules::plugin::handlers::get_navigation_config),
        )
        .route("/api/plugins/health", get(handlers::plugin_health_check))
        .route(
            "/api/core/notification/notifications/health/detailed",
            get(modules::communication::notification::get_notification_health_detailed),
        )
        .route("/metrics", get(move || async move { metrics_render() }))
        // Auth endpoints (no auth required for login) - /v1 prefix aligned with frontend
        .route("/api/core/iam/auth/login", post(modules::iam::auth::login))
        .route(
            "/api/core/iam/auth/register",
            post(modules::iam::auth::register),
        )
        .route(
            "/api/core/iam/auth/refresh",
            post(modules::iam::auth::refresh_token),
        )
        .route(
            "/api/core/iam/auth/logout",
            post(modules::iam::auth::logout),
        )
        .route(
            "/api/core/iam/auth/forgot-password",
            post(modules::iam::auth::forgot_password),
        )
        .route(
            "/api/core/iam/auth/reset-password",
            post(modules::iam::auth::reset_password),
        )
        // WebSocket endpoints (auth handled via token query param or subscribe message)
        // Unified WebSocket routes with module prefix
        .route(
            "/ws/core/notifications",
            get(modules::communication::ws::websocket_handler),
        )
        .route(
            "/ws/core/im",
            get(modules::communication::ws::websocket_handler),
        )
        // Plugin proxy route (no auth required - plugins handle their own auth)
        .route(
            "/api/plugins/{plugin_code}/{*path}",
            get(handlers::plugin_proxy),
        )
        // Plugin registration routes (no auth required - for service startup auto-registration)
        .route(
            "/api/core/plugin/dev/plugins/{code}/register",
            post(modules::plugin::handlers::register_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/status",
            put(modules::plugin::handlers::update_plugin_status),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/unregister",
            post(modules::plugin::handlers::unregister_plugin),
        );

    // ===== Protected routes =====
    let protected_routes = iam::iam_routes(state)
        .merge(flow::flow_routes(state))
        .merge(file::file_routes(state))
        .merge(communication::communication_routes(state))
        .merge(master::master_routes(state))
        .merge(plugin::plugin_routes(state))
        .merge(mobile::mobile_routes(state))
        .merge(help::help_routes(state))
        .merge(migration::migration_routes(state))
        .merge(monitor::monitor_routes(state))
        .merge(system::system_routes(state))
        .merge(modules::login_log::create_routes(state.clone()))
        .merge(modules::search::create_routes(state.clone()))
        .merge(modules::feedback::create_routes(state.clone()))
        .merge(modules::audit::create_routes(state.clone()))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::input_validation::input_validation_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::audit_logger_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::body_limit_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            tenant_rls_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::security_headers_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::compression_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::rate_limit_middleware_fn,
        ))
}
