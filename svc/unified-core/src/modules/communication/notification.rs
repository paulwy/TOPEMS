//! Notification submodule - Notification handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn send_notification(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification send_notification called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "send_notification success",
        "data": null
    }))
}

pub async fn broadcast_notification(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification broadcast_notification called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "broadcast_notification success",
        "data": null
    }))
}

pub async fn list_notifications(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification list_notifications called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_notifications success",
        "data": []
    }))
}

pub async fn mark_as_read(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification mark_as_read called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "mark_as_read success",
        "data": null
    }))
}

pub async fn mark_all_as_read(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification mark_all_as_read called");
    Json(serde_json::json!({
        "success": true,
        "message": "mark_all_as_read success",
        "data": null
    }))
}

pub async fn get_notifications(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification get_notifications called");
    Json(serde_json::json!({
        "success": true,
        "message": "get_notifications success",
        "data": {
            "notifications": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
            "unread_count": 0
        }
    }))
}

pub async fn get_unread_count(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification get_unread_count called");
    Json(serde_json::json!({
        "success": true,
        "message": "get_unread_count success",
        "data": 0
    }))
}

pub async fn get_unread_notifications(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication notification get_unread_notifications called");
    Json(serde_json::json!({
        "success": true,
        "message": "get_unread_notifications success",
        "data": []
    }))
}