//! Document handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub async fn list_documents(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_documents called");
    Json(ApiResponse::success(
        serde_json::json!({"documents": [], "total": 0}),
        "获取列表成功",
    ))
}

pub async fn create_document(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_document called");
    Json(ApiResponse::success(
        serde_json::json!({"id": Uuid::new_v4()}),
        "创建成功",
    ))
}

pub async fn get_document(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_document called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}

pub async fn update_document(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_document called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "更新成功",
    ))
}
