pub mod audit;
pub mod data_sync;
pub mod inspection_record;
pub mod inspection_task;
pub mod integration;
pub mod instrument;
pub mod instrument_data;
pub mod lims_plugin;
pub mod process;
pub mod proficiency_testing;
pub mod reagent;
pub mod report;
pub mod sample;
pub mod sample_barcode;
pub mod statistics;
pub mod test_method;
pub mod uncertainty;

use crate::shared::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(audit::create_routes())
        .merge(sample::create_routes())
        .merge(inspection_task::create_routes())
        .merge(inspection_record::create_routes())
        .merge(instrument::create_routes())
        .merge(reagent::create_routes())
        .merge(statistics::create_routes())
        .merge(data_sync::create_routes())
        .merge(sample_barcode::create_routes())
        .merge(test_method::create_routes())
        .merge(proficiency_testing::create_routes())
        .merge(uncertainty::create_routes())
        .merge(instrument_data::create_routes())
        .merge(process::create_routes())
}
