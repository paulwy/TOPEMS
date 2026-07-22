use axum::{routing::delete, routing::get, routing::post, routing::put, Router};

use topems_shared::auth_middleware;

use crate::handlers;
use crate::modules::monitor::handlers as monitor_handlers;
use crate::AppState;

pub fn monitor_routes(state: &AppState) -> Router<AppState> {
    Router::new()
        .route("/health/detailed", get(handlers::detailed_health))
        .route("/monitoring/v1/alerts", get(monitor_handlers::list_alerts))
        .route(
            "/monitoring/v1/alerts/stats",
            get(monitor_handlers::get_alert_stats),
        )
        .route(
            "/monitoring/v1/alerts/export",
            get(monitor_handlers::export_alerts),
        )
        .route(
            "/monitoring/v1/alerts/test",
            post(monitor_handlers::trigger_test_alert),
        )
        .route(
            "/monitoring/v1/alerts/{id}",
            get(monitor_handlers::get_alert),
        )
        .route(
            "/monitoring/v1/alerts/{id}/acknowledge",
            post(monitor_handlers::acknowledge_alert),
        )
        .route(
            "/monitoring/v1/alerts/{id}/resolve",
            post(monitor_handlers::resolve_alert),
        )
        .route(
            "/monitoring/v1/alerts/{id}/escalate",
            post(monitor_handlers::escalate_alert),
        )
        .route(
            "/monitoring/v1/alerts/{id}/dismiss",
            post(monitor_handlers::dismiss_alert),
        )
        .route(
            "/monitoring/v1/alert-rules",
            get(monitor_handlers::list_alert_rules),
        )
        .route(
            "/monitoring/v1/alert-rules",
            post(monitor_handlers::create_alert_rule),
        )
        .route(
            "/monitoring/v1/alert-rules/{id}",
            get(monitor_handlers::get_alert_rule),
        )
        .route(
            "/monitoring/v1/alert-rules/{id}",
            put(monitor_handlers::update_alert_rule),
        )
        .route(
            "/monitoring/v1/alert-rules/{id}",
            delete(monitor_handlers::delete_alert_rule),
        )
        .route(
            "/monitoring/v1/alert-rules/{id}/enable",
            post(monitor_handlers::enable_alert_rule),
        )
        .route(
            "/monitoring/v1/alert-rules/{id}/disable",
            post(monitor_handlers::disable_alert_rule),
        )
        .route(
            "/monitoring/v1/health",
            get(monitor_handlers::get_system_health),
        )
        .route(
            "/monitoring/v1/metrics",
            get(monitor_handlers::get_system_metrics),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
}
