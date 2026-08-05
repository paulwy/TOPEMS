//! Route registration for the unified-core service.
//!
//! Organized by business domain into sub-modules. The single public function
//! `create_routes` builds the full application router (public + protected routes
//! with all permission middleware layers applied) and returns a `Router<AppState>`
//! that the caller finalises with telemetry, CORS, prometheus and state.

#![allow(deprecated)]

mod communication;
mod doc;
mod file;
mod flow;
mod help;
mod iam;
mod master;
mod migration;
mod monitor;
mod plugin;
mod system;

use axum::routing::{get, post, put};
use axum::Router;

use topems_shared::{
    api_version::register_routes_with_legacy_alias, auth_middleware, get_api_info_handler,
};

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
    // ===== Public routes (no auth required, outside of /api/core/ dual-rail) =====
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
        .route("/api/plugins/health", get(handlers::plugin_health_check))
        // Monitor public health endpoint (no auth required)
        .route("/api/monitor/health", get(handlers::detailed_health))
        .route("/metrics", get(move || async move { metrics_render() }))
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
        );

    // ===== Core API public routes (dual-rail: /api/core/ + /api/v1/core/) =====
    let core_public_routes = Router::new()
        .route(
            "/plugin/navigation-config",
            get(modules::plugin::handlers::get_navigation_config),
        )
        .route(
            "/notification/notifications/health/detailed",
            get(modules::communication::notification::get_notification_health_detailed),
        )
        // IAM permission metadata (public - for service startup auto-sync)
        .route(
            "/iam/permissions/metadata",
            get(modules::iam::permission_metadata::get_permission_metadata),
        )
        // Auth endpoints (no auth required for login)
        .route("/iam/auth/login", post(modules::iam::auth::login))
        .route("/iam/auth/register", post(modules::iam::auth::register))
        .route("/iam/auth/refresh", post(modules::iam::auth::refresh_token))
        .route("/iam/auth/logout", post(modules::iam::auth::logout))
        .route(
            "/iam/auth/forgot-password",
            post(modules::iam::auth::forgot_password),
        )
        .route(
            "/iam/auth/reset-password",
            post(modules::iam::auth::reset_password),
        )
        // Plugin registration routes (no auth required - for service startup auto-registration)
        .route(
            "/plugin/dev/plugins/{code}/register",
            post(modules::plugin::handlers::register_plugin),
        )
        .route(
            "/plugin/dev/plugins/{code}/status",
            put(modules::plugin::handlers::update_plugin_status),
        )
        .route(
            "/plugin/dev/plugins/{code}/unregister",
            post(modules::plugin::handlers::unregister_plugin),
        );

    // ===== Core API protected routes (dual-rail: /api/core/ + /api/v1/core/) =====
    let core_protected_routes = iam::iam_routes(state)
        .nest("/flow", flow::flow_routes(state))
        .merge(file::file_routes(state))
        .merge(communication::communication_routes(state))
        .merge(master::master_routes(state))
        .merge(plugin::plugin_routes(state))
        .merge(help::help_routes(state))
        .merge(monitor::monitor_routes(state))
        .merge(system::system_routes(state))
        .merge(doc::doc_routes(state))
        .merge(modules::login_log::create_routes(state.clone()))
        .merge(modules::search::create_routes(state.clone()))
        .merge(modules::feedback::create_routes(state.clone()))
        .merge(modules::audit::create_routes(state.clone()))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ===== Combine core public + protected routes =====
    let core_routes = core_public_routes.merge(core_protected_routes);

    // ===== Apply dual-rail registration (new: /api/core/, legacy: /api/v1/core/) =====
    let core_router = register_routes_with_legacy_alias(
        Router::new(),
        "/api/core",
        &["/api/v1/core"],
        core_routes,
    );

    Router::new()
        .merge(public_routes)
        .merge(core_router)
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
