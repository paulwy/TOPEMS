pub mod handlers;

use crate::AppState;
use axum::Router;

pub fn create_mobile_routes(state: &AppState) -> Router<AppState> {
    Router::new().nest("/api/mobile", handlers::create_mobile_api_routes(state))
}
