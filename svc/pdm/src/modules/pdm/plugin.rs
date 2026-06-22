//! Plugin handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub async fn list(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list called");
    Json(ApiResponse::success(
        serde_json::json!({
            "items": [],
            "total": 0
        }),
        "获取列表成功",
    ))
}

pub async fn create(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create called");
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "创建成功",
    ))
}

pub async fn get(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}

pub async fn update(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "更新成功",
    ))
}

pub async fn delete(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    tracing::info!("delete called");
    Json(ApiResponse::success(true, "删除成功"))
}
