//! Manage submodule - File management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_files(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage list_files called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_files success",
        "data": []
    }))
}

pub async fn get_file(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage get_file called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_file success",
        "data": null
    }))
}

pub async fn delete_file(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage delete_file called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_file success",
        "data": null
    }))
}

pub async fn move_file(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage move_file called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "move_file success",
        "data": null
    }))
}

pub async fn copy_file(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("File manage copy_file called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "copy_file success",
        "data": null
    }))
}