//! BI Service API Layer

pub mod dashboard;
pub mod widget;
pub mod datasource;
pub mod analysis;
pub mod comparison_analysis;
pub mod visualization;
pub mod self_service_report;
pub mod data_drilldown;
pub mod multidimensional_analysis;
pub mod predictive_analysis;
pub mod row_level_permission;
pub mod analytics;
pub mod sync_records;
pub mod plugin;
pub mod openapi;

use axum::Router;

use crate::AppState;

pub fn create_api_routes(state: AppState) -> Router {
    Router::new()
        .merge(dashboard::create_routes(state.clone()))
        .merge(widget::create_routes(state.clone()))
        .merge(datasource::create_routes(state.clone()))
        .merge(analysis::create_routes(state.clone()))
        .merge(comparison_analysis::create_routes(state.clone()))
        .merge(visualization::create_routes(state.clone()))
        .merge(self_service_report::create_routes(state.clone()))
        .merge(data_drilldown::create_routes(state.clone()))
        .merge(multidimensional_analysis::create_routes(state.clone()))
        .merge(predictive_analysis::create_routes(state.clone()))
        .merge(row_level_permission::create_routes(state.clone()))
        .merge(analytics::create_routes(state.clone()))
        .merge(sync_records::create_routes(state))
}
