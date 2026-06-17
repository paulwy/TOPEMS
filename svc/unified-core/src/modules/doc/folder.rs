//! Folder submodule - Folder management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_folders(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc folder list_folders called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_folders success",
        "data": []
    }))
}

pub async fn create_folder(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc folder create_folder called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_folder success",
        "data": null
    }))
}

pub async fn get_folder(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc folder get_folder called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_folder success",
        "data": null
    }))
}

pub async fn update_folder(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc folder update_folder called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "update_folder success",
        "data": null
    }))
}

pub async fn delete_folder(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc folder delete_folder called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_folder success",
        "data": null
    }))
}