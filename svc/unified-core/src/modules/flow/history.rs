//! History submodule - Workflow history record handlers

use crate::AppState;
use axum::{
    extract::{Path, State},
    Json,
};

#[utoipa::path(
    get,
    path = "/api/core/flow/history",
    tag = "Flow-History",
    responses(
        (status = 200, description = "查询成功", body = serde_json::Value),
    ),
)]
pub async fn list_history(State(_state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("Flow history list_history called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_history success",
        "data": []
    }))
}

#[utoipa::path(
    get,
    path = "/api/core/flow/history/{id}",
    tag = "Flow-History",
    params(
        ("id" = String, Path, description = "历史记录ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = serde_json::Value),
    ),
)]
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

#[utoipa::path(
    get,
    path = "/api/core/flow/history/instance/{instance_id}",
    tag = "Flow-History",
    params(
        ("instance_id" = String, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = serde_json::Value),
    ),
)]
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

#[utoipa::path(
    get,
    path = "/api/core/flow/history/workflow/{workflow_id}",
    tag = "Flow-History",
    params(
        ("workflow_id" = String, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = serde_json::Value),
    ),
)]
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
