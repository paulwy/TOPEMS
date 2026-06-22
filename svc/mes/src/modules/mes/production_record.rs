//! Production Record handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

// ==================== Production Record Handlers ====================

/// List production records
pub async fn list_records(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_records called");
    Json(ApiResponse::success(
        serde_json::json!({
            "records": [],
            "total": 0
        }),
        "获取生产记录列表成功",
    ))
}

/// Create a new production record
pub async fn create_record(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_record called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "生产记录创建成功",
    ))
}

/// Get production record by ID
pub async fn get_record(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_record called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取生产记录成功",
    ))
}
