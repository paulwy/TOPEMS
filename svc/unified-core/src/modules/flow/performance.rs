//! Performance submodule - Workflow performance statistics handlers

use crate::AppState;
use axum::{extract::State, Json};

pub async fn get_performance(State(_state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("Flow performance get_performance called");
    Json(serde_json::json!({
        "success": true,
        "message": "get_performance success",
        "data": {}
    }))
}

pub async fn reset_performance(State(_state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("Flow performance reset_performance called");
    Json(serde_json::json!({
        "success": true,
        "message": "reset_performance success",
        "data": null
    }))
}
