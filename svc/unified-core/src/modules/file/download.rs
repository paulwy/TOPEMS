//! Download submodule - File download handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn download_file(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("File download download_file called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "download_file success",
        "data": null
    }))
}