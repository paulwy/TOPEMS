//! Audit handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub async fn list_audit_plans(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_audit_plans called");
    Json(ApiResponse::success(
        serde_json::json!({
            "plans": [],
            "total": 0
        }),
        "获取审核计划列表成功",
    ))
}

pub async fn create_audit_plan(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_audit_plan called");
    Json(ApiResponse::success(
        serde_json::json!({"id": Uuid::new_v4()}),
        "审核计划创建成功",
    ))
}

pub async fn get_audit_plan(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_audit_plan called");
    Json(ApiResponse::success(serde_json::json!({}), "获取审核计划成功"))
}

pub async fn list_audit_tasks(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_audit_tasks called");
    Json(ApiResponse::success(
        serde_json::json!({
            "tasks": [],
            "total": 0
        }),
        "获取审核任务列表成功",
    ))
}

pub async fn complete_audit_task(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("complete_audit_task called");
    Json(ApiResponse::success(serde_json::json!({}), "审核任务完成成功"))
}

pub async fn list_audit_findings(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_audit_findings called");
    Json(ApiResponse::success(
        serde_json::json!({
            "findings": [],
            "total": 0
        }),
        "获取审核发现列表成功",
    ))
}
