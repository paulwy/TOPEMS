//! User submodule - User management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_users(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user list_users called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_users success",
        "data": []
    }))
}

pub async fn create_user(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user create_user called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_user success",
        "data": null
    }))
}

pub async fn get_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_user success",
        "data": null
    }))
}

pub async fn update_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user update_user called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "update_user success",
        "data": null
    }))
}

pub async fn delete_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user delete_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_user success",
        "data": null
    }))
}

pub async fn disable_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user disable_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "disable_user success",
        "data": null
    }))
}

pub async fn enable_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user enable_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "enable_user success",
        "data": null
    }))
}

pub async fn change_password(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user change_password called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "change_password success",
        "data": null
    }))
}