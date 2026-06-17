//! User Permission submodule - User permission management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn get_user_permissions(
    State(_state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user_permission get_user_permissions called with user_id: {}", user_id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_user_permissions success",
        "data": []
    }))
}

pub async fn update_user_permissions(
    State(_state): State<AppState>,
    Path(user_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user_permission update_user_permissions called with user_id: {} and payload: {:?}", user_id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "update_user_permissions success",
        "data": null
    }))
}