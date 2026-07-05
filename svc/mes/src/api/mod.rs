pub mod dashboard_ws;
pub mod equipment;
pub mod equipment_oee;
pub mod material_bom;
pub mod material_requirement;
pub mod process_flow;
pub mod process_route;
pub mod production_kanban;
pub mod production_order;
pub mod production_process;
pub mod production_record;
pub mod production_scheduling;
pub mod quality_management;
pub mod quality_traceability;
pub mod team;
pub mod wip;
pub mod work_order;
pub mod work_report;
pub mod work_station;

use crate::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(equipment::create_routes())
        .merge(equipment_oee::create_routes())
        .merge(material_bom::create_routes())
        .merge(material_requirement::create_routes())
        .merge(process_flow::create_routes())
        .merge(process_route::create_routes())
        .merge(production_kanban::create_routes())
        .merge(production_order::create_routes())
        .merge(production_process::create_routes())
        .merge(production_record::create_routes())
        .merge(production_scheduling::create_routes())
        .merge(quality_management::create_routes())
        .merge(quality_traceability::create_routes())
        .merge(team::create_routes())
        .merge(wip::create_routes())
        .merge(work_order::create_routes())
        .merge(work_report::create_routes())
        .merge(work_station::create_routes())
}
