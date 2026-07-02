pub mod accident;
pub mod data_sync;
pub mod emergency_drill;
pub mod emergency_plan;
pub mod environment;
pub mod environmental_compliance;
pub mod hazard;
pub mod hazardous_material;
pub mod health;
pub mod occupational_disease;
pub mod occupational_health;
pub mod risk;
pub mod safety;
pub mod training;

use crate::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(risk::create_routes())
        .merge(safety::create_routes())
        .merge(accident::create_routes())
        .merge(environment::create_routes())
        .merge(training::create_routes())
        .merge(health::create_routes())
        .merge(hazard::create_routes())
        .merge(data_sync::create_routes())
        .merge(emergency_plan::create_routes())
        .merge(emergency_drill::create_routes())
        .merge(occupational_health::create_routes())
        .merge(occupational_disease::create_routes())
        .merge(hazardous_material::create_routes())
        .merge(environmental_compliance::create_routes())
}
