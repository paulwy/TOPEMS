pub mod handlers;
pub mod models;
pub mod service;

pub use handlers::*;
pub use models::*;
pub use service::*;

use axum::{routing::get, Router};
use sqlx::PgPool;

use crate::middleware::permission::require_permission;
use crate::AppState;

pub async fn init_database(_pool: &PgPool) -> Result<(), sqlx::Error> {
    Ok(())
}

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/core/search/v1", get(handlers::search))
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            state,
            require_permission("system:search"),
        ))
}
