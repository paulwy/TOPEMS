//! Auth submodule - Authentication handlers

use axum::{extract::State, Json};
use crate::AppState;

pub async fn login(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM auth login called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "login success",
        "data": null
    }))
}

pub async fn register(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM auth register called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "register success",
        "data": null
    }))
}

pub async fn refresh_token(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM auth refresh_token called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "refresh_token success",
        "data": null
    }))
}