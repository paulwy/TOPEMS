pub mod change_notice;
pub mod configuration;
pub mod document;
pub mod material;
pub mod product;
pub mod production_batch;
pub mod production_formula;
pub mod production_process;
pub mod production_statistics;
pub mod production_step;
pub mod version;
pub mod workflow;

use crate::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(product::create_routes())
        .merge(material::create_routes())
        .merge(configuration::create_routes())
        .merge(document::create_routes())
        .merge(version::create_routes())
        .merge(production_process::create_routes())
        .merge(production_step::create_routes())
        .merge(production_formula::create_routes())
        .merge(production_batch::create_routes())
        .merge(production_statistics::create_routes())
        .merge(change_notice::create_routes())
        .merge(workflow::create_routes())
}
