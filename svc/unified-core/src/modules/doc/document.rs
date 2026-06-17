//! Document submodule - Document management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_documents(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc document list_documents called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_documents success",
        "data": []
    }))
}

pub async fn create_document(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc document create_document called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_document success",
        "data": null
    }))
}

pub async fn get_document(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc document get_document called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_document success",
        "data": null
    }))
}

pub async fn update_document(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc document update_document called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "update_document success",
        "data": null
    }))
}

pub async fn delete_document(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc document delete_document called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_document success",
        "data": null
    }))
}

pub async fn publish_document(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc document publish_document called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "publish_document success",
        "data": null
    }))
}

pub async fn archive_document(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Doc document archive_document called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "archive_document success",
        "data": null
    }))
}