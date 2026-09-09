//! Monitor module - merged from svc/monitor
//! Provides alerts, metrics, SLO, business metrics, and health check routes.

pub mod alert_evaluator;
pub mod alerts;
pub mod business_metrics;
pub mod health_check;
pub mod metrics;
pub mod monitor_plugin;
pub mod settings;
pub mod slo;

use axum::Router;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .merge(metrics::create_routes())
        .merge(health_check::create_routes())
        .merge(alerts::create_routes())
        .merge(alert_evaluator::create_routes())
        .merge(business_metrics::create_routes())
        .merge(slo::create_routes())
        .merge(settings::create_routes())
}
