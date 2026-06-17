//! IM submodule - Instant messaging handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_rooms(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im list_rooms called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_rooms success",
        "data": []
    }))
}

pub async fn create_room(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im create_room called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_room success",
        "data": null
    }))
}

pub async fn get_room(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im get_room called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_room success",
        "data": null
    }))
}

pub async fn get_messages(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im get_messages called with room id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_messages success",
        "data": []
    }))
}

pub async fn send_message(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im send_message called with room id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "send_message success",
        "data": null
    }))
}

pub async fn list_contacts(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im list_contacts called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_contacts success",
        "data": []
    }))
}

pub async fn add_contact(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im add_contact called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "add_contact success",
        "data": null
    }))
}

pub async fn get_online_status(
    State(_state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication im get_online_status called with user_id: {}", user_id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_online_status success",
        "data": {"online": false}
    }))
}