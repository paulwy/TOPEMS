pub mod equipment;
pub mod production_order;
pub mod production_process;
pub mod production_record;
pub mod work_station;

use crate::AppState;
use axum::Router;

pub fn create_mes_routes() -> Router<AppState> {
    Router::new()
        .merge(production_order::create_routes())
        .merge(production_process::create_routes())
        .merge(production_record::create_routes())
        .merge(equipment::create_routes())
        .merge(work_station::create_routes())
}
