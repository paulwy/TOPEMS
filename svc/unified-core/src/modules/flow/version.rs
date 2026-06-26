//! Version submodule - Workflow version management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;

pub async fn list_versions(
    State(_state): State<AppState>,
    Path(workflow_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow version list_versions called with workflow_id: {}", workflow_id);
    Json(serde_json::json!({
        "success": true,
        "message": "list_versions success",
        "data": []
    }))
}

pub async fn get_version(
    State(_state): State<AppState>,
    Path((workflow_id, version_id)): Path<(String, String)>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow version get_version called with workflow_id: {} and version_id: {}", workflow_id, version_id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_version success",
        "data": null
    }))
}

pub async fn create_version(
    State(_state): State<AppState>,
    Path(workflow_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow version create_version called with workflow_id: {} and payload: {:?}", workflow_id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_version success",
        "data": null
    }))
}

pub async fn activate_version(
    State(_state): State<AppState>,
    Path((workflow_id, version_id)): Path<(String, String)>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow version activate_version called with workflow_id: {} and version_id: {}", workflow_id, version_id);
    Json(serde_json::json!({
        "success": true,
        "message": "activate_version success",
        "data": null
    }))
}

pub async fn compare_versions(
    State(_state): State<AppState>,
    Path((workflow_id, version_a, version_b)): Path<(String, String, String)>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow version compare_versions called with workflow_id: {}, version_a: {}, version_b: {}", workflow_id, version_a, version_b);
    Json(serde_json::json!({
        "success": true,
        "message": "compare_versions success",
        "data": null
    }))
}
