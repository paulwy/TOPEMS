//! Approval submodule - Approval task handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_pending_approvals(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow approval list_pending_approvals called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_pending_approvals success",
        "data": []
    }))
}

pub async fn approve_task(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow approval approve_task called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "approve_task success",
        "data": null
    }))
}

pub async fn reject_task(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow approval reject_task called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "reject_task success",
        "data": null
    }))
}