pub mod mes;
pub mod pdm;

use crate::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(mes::create_mes_routes())
        .merge(pdm::create_pdm_routes())
}
