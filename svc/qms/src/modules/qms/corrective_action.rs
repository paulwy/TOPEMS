//! Corrective Action handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub async fn list_actions(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_actions called");
    Json(ApiResponse::success(
        serde_json::json!({
            "actions": [],
            "total": 0
        }),
        "获取整改措施列表成功",
    ))
}

pub async fn create_action(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_action called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "整改措施创建成功",
    ))
}

pub async fn get_action(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_action called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取整改措施成功",
    ))
}

pub async fn update_action(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_action called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "整改措施更新成功",
    ))
}

pub async fn delete_action(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    tracing::info!("delete_action called: {}", id);
    Json(ApiResponse::success(true, "整改措施删除成功"))
}
