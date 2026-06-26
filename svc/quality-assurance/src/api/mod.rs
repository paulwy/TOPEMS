pub mod quality_inspection;
pub mod quality_issue;
pub mod quality_standard;
pub mod qms_dashboard;
pub mod lab_sample;
pub mod lab_task;
pub mod lab_record;
pub mod lab_instrument;
pub mod lab_reagent;
pub mod lab_statistics;
pub mod ehs_risk;
pub mod ehs_safety;
pub mod ehs_accident;
pub mod ehs_environment;
pub mod ehs_training;
pub mod ehs_health;

use crate::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(quality_inspection::create_routes())
        .merge(quality_issue::create_routes())
        .merge(quality_standard::create_routes())
        .merge(qms_dashboard::create_routes())
        .merge(lab_sample::create_routes())
        .merge(lab_task::create_routes())
        .merge(lab_record::create_routes())
        .merge(lab_instrument::create_routes())
        .merge(lab_reagent::create_routes())
        .merge(lab_statistics::create_routes())
        .merge(ehs_risk::create_routes())
        .merge(ehs_safety::create_routes())
        .merge(ehs_accident::create_routes())
        .merge(ehs_environment::create_routes())
        .merge(ehs_training::create_routes())
        .merge(ehs_health::create_routes())
}
