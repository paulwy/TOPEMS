//! Record submodule - Approval record handlers

use crate::AppState;
use axum::{
    extract::{Path, State},
    Json,
};

pub async fn list_records(State(_state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("Flow record list_records called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_records success",
        "data": []
    }))
}

pub async fn get_record(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow record get_record called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_record success",
        "data": null
    }))
}
