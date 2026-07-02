//! History submodule - Workflow history record handlers

use crate::AppState;
use axum::{
    extract::{Path, State},
    Json,
};

pub async fn list_history(State(_state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("Flow history list_history called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_history success",
        "data": []
    }))
}

pub async fn get_history(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow history get_history called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_history success",
        "data": null
    }))
}

pub async fn get_instance_history(
    State(_state): State<AppState>,
    Path(instance_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Flow history get_instance_history called with instance_id: {}",
        instance_id
    );
    Json(serde_json::json!({
        "success": true,
        "message": "get_instance_history success",
        "data": []
    }))
}

pub async fn get_workflow_history(
    State(_state): State<AppState>,
    Path(workflow_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Flow history get_workflow_history called with workflow_id: {}",
        workflow_id
    );
    Json(serde_json::json!({
        "success": true,
        "message": "get_workflow_history success",
        "data": []
    }))
}
