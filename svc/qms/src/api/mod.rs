use axum::{
    Router,
};

pub mod quality_standard;
pub mod quality_inspection;
pub mod quality_issue;
pub mod corrective_action;
pub mod audit;

// Re-export AppState from main.rs
pub use crate::AppState as ApiState;

pub async fn create_routes(app_state: crate::AppState) -> Router<crate::AppState> {
    Router::new()
        .merge(quality_standard::create_routes().await.unwrap())
        .merge(quality_inspection::create_routes().await.unwrap())
        .merge(quality_issue::create_routes().await.unwrap())
        .merge(corrective_action::create_routes().await.unwrap())
        .with_state(app_state)
}
