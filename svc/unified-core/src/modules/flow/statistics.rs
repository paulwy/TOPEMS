//! Statistics submodule - Workflow statistics handlers

use crate::AppState;
use axum::{extract::State, Json};

pub async fn get_statistics(State(_state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("Flow statistics get_statistics called");
    Json(serde_json::json!({
        "success": true,
        "message": "get_statistics success",
        "data": {}
    }))
}
