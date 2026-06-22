//! Production Process handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub async fn list_processes(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_processes called");
    Json(ApiResponse::success(
        serde_json::json!({"processes": [], "total": 0}),
        "获取列表成功",
    ))
}

pub async fn create_process(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_process called");
    Json(ApiResponse::success(
        serde_json::json!({"id": Uuid::new_v4()}),
        "创建成功",
    ))
}

pub async fn get_process(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_process called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}

pub async fn update_process(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_process called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "更新成功",
    ))
}

pub async fn delete_process(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    tracing::info!("delete_process called");
    Json(ApiResponse::success(true, "删除成功"))
}
