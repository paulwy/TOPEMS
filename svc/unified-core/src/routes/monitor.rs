use axum::{routing::delete, routing::get, routing::post, routing::put, Router};

use topems_shared::auth_middleware;

use crate::handlers;
use crate::modules::monitor::handlers as monitor_handlers;
use crate::AppState;

pub fn monitor_routes(state: &AppState) -> Router<AppState> {
    Router::new()
        .route("/api/core/health/detailed", get(handlers::detailed_health))
        .route(
            "/api/core/monitoring/alerts",
            get(monitor_handlers::list_alerts),
        )
        .route(
            "/api/core/monitoring/alerts/stats",
            get(monitor_handlers::get_alert_stats),
        )
        .route(
            "/api/core/monitoring/alerts/export",
            get(monitor_handlers::export_alerts),
        )
        .route(
            "/api/core/monitoring/alerts/test",
            post(monitor_handlers::trigger_test_alert),
        )
        .route(
            "/api/core/monitoring/alerts/{id}",
            get(monitor_handlers::get_alert),
        )
        .route(
            "/api/core/monitoring/alerts/{id}/acknowledge",
            post(monitor_handlers::acknowledge_alert),
        )
        .route(
            "/api/core/monitoring/alerts/{id}/resolve",
            post(monitor_handlers::resolve_alert),
        )
        .route(
            "/api/core/monitoring/alerts/{id}/escalate",
            post(monitor_handlers::escalate_alert),
        )
        .route(
            "/api/core/monitoring/alerts/{id}/dismiss",
            post(monitor_handlers::dismiss_alert),
        )
        .route(
            "/api/core/monitoring/alert-rules",
            get(monitor_handlers::list_alert_rules),
        )
        .route(
            "/api/core/monitoring/alert-rules",
            post(monitor_handlers::create_alert_rule),
        )
        .route(
            "/api/core/monitoring/alert-rules/{id}",
            get(monitor_handlers::get_alert_rule),
        )
        .route(
            "/api/core/monitoring/alert-rules/{id}",
            put(monitor_handlers::update_alert_rule),
        )
        .route(
            "/api/core/monitoring/alert-rules/{id}",
            delete(monitor_handlers::delete_alert_rule),
        )
        .route(
            "/api/core/monitoring/alert-rules/{id}/enable",
            post(monitor_handlers::enable_alert_rule),
        )
        .route(
            "/api/core/monitoring/alert-rules/{id}/disable",
            post(monitor_handlers::disable_alert_rule),
        )
        .route(
            "/api/core/monitoring/health",
            get(monitor_handlers::get_system_health),
        )
        .route(
            "/api/core/monitoring/metrics",
            get(monitor_handlers::get_system_metrics),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
}
