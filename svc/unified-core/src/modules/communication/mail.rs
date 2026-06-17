//! Mail submodule - Email handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_emails(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail list_emails called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_emails success",
        "data": []
    }))
}

pub async fn send_email(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail send_email called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "send_email success",
        "data": null
    }))
}

pub async fn get_email(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail get_email called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_email success",
        "data": null
    }))
}

pub async fn delete_email(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail delete_email called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_email success",
        "data": null
    }))
}

pub async fn mark_as_read(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail mark_as_read called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "mark_as_read success",
        "data": null
    }))
}

pub async fn list_templates(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail list_templates called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_templates success",
        "data": []
    }))
}

pub async fn create_template(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail create_template called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_template success",
        "data": null
    }))
}

pub async fn get_template(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail get_template called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_template success",
        "data": null
    }))
}

pub async fn update_template(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail update_template called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "update_template success",
        "data": null
    }))
}

pub async fn send_with_template(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail send_with_template called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "send_with_template success",
        "data": null
    }))
}