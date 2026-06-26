pub mod report;
pub mod template;
pub mod schedule;
pub mod subscription;

use crate::AppState;
use axum::Router;

pub fn create_api_routes() -> Router<AppState> {
    Router::new()
        .merge(report::create_routes())
        .merge(template::create_routes())
        .merge(schedule::create_routes())
        .merge(subscription::create_routes())
}
