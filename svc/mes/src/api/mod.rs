pub mod dashboard_ws;
pub mod equipment;
pub mod equipment_oee;
pub mod material_bom;
pub mod production_order;
pub mod production_process;
pub mod production_record;
pub mod production_scheduling;
pub mod quality_traceability;
pub mod wip;
pub mod work_station;

use crate::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(equipment::create_routes())
        .merge(equipment_oee::create_routes())
        .merge(material_bom::create_routes())
        .merge(production_order::create_routes())
        .merge(production_process::create_routes())
        .merge(production_record::create_routes())
        .merge(production_scheduling::create_routes())
        .merge(quality_traceability::create_routes())
        .merge(wip::create_routes())
        .merge(work_station::create_routes())
}
