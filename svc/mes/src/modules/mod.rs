pub mod analytics;
pub mod anomaly_detection;
pub mod approval_common;
pub mod aps_compat;
pub mod aps_scheduling;
pub mod audit;
pub mod basics;
pub mod capacity;
pub mod capacity_status;
pub mod dashboard_ws;
pub mod demand_forecast;
pub mod demand_forecast_status;
pub mod energy_management;
pub mod equipment;
pub mod equipment_maintenance_status;
pub mod equipment_oee;
pub mod material_bom;
pub mod material_plan;
pub mod material_plan_status;
pub mod material_requirement;
pub mod material_requirement_status;
pub mod mes_plugin;
pub mod oee_logic;
pub mod openapi;
pub mod process_flow;
pub mod process_route;
pub mod production_cost;
pub mod production_kanban;
pub mod production_order;
pub mod production_order_status;
pub mod production_plan;
pub mod production_plan_status;
pub mod production_process;
pub mod production_record;
pub mod production_record_status;
pub mod production_schedule_status;
pub mod production_scheduling;
pub mod quality_management;
pub mod quality_traceability;
pub mod settings;
pub mod team;
pub mod wip;
pub mod work_order;
pub mod work_order_status;
pub mod work_report;
pub mod work_report_status;
pub mod work_station;
pub mod work_station_status;

use crate::AppState;
use axum::Router;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .merge(anomaly_detection::create_routes())
        .merge(analytics::create_routes())
        .merge(aps_scheduling::create_routes())
        .merge(capacity::create_routes())
        .merge(demand_forecast::create_routes())
        .merge(production_cost::create_routes())
        .merge(energy_management::create_routes())
        .merge(equipment::create_routes())
        .merge(equipment_oee::create_routes())
        .merge(material_bom::create_routes())
        .merge(material_plan::create_routes())
        .merge(material_requirement::create_routes())
        .merge(process_flow::create_routes())
        .merge(process_route::create_routes())
        .merge(production_kanban::create_routes())
        .merge(production_order::create_routes())
        .merge(production_plan::create_routes())
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
        .merge(audit::create_routes())
        .merge(settings::create_routes())
        .merge(basics::create_routes())
}
