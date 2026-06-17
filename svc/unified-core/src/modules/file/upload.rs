//! Upload submodule - File upload handlers

use axum::{extract::State, Json};
use crate::AppState;

pub async fn upload_file(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("File upload upload_file called");
    Json(serde_json::json!({
        "success": true,
        "message": "upload_file success",
        "data": null
    }))
}

pub async fn upload_multiple(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("File upload upload_multiple called");
    Json(serde_json::json!({
        "success": true,
        "message": "upload_multiple success",
        "data": []
    }))
}