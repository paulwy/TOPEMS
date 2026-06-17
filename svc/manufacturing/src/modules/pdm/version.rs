//! Version handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

// ==================== Version Handlers ====================

/// List versions
pub async fn list_versions(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_versions called");
    Json(ApiResponse::success(
        serde_json::json!({
            "versions": [],
            "total": 0
        }),
        "获取版本列表成功",
    ))
}

/// Create a new version
pub async fn create_version(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_version called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "版本创建成功",
    ))
}

/// Get version by ID
pub async fn get_version(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_version called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取版本成功",
    ))
}

/// Update version
pub async fn update_version(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_version called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "版本更新成功",
    ))
}
