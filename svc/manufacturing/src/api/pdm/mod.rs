pub mod product;
pub mod material;
pub mod configuration;
pub mod document;
pub mod version;

use crate::AppState;
use axum::Router;

pub fn create_pdm_routes() -> Router<AppState> {
    Router::new()
        .merge(product::create_routes())
        .merge(material::create_routes())
        .merge(configuration::create_routes())
        .merge(document::create_routes())
        .merge(version::create_routes())
}
