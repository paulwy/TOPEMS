//! Document handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

// ==================== Document Handlers ====================

/// List documents
pub async fn list_documents(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_documents called");
    Json(ApiResponse::success(
        serde_json::json!({
            "documents": [],
            "total": 0
        }),
        "获取文档列表成功",
    ))
}

/// Create a new document
pub async fn create_document(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_document called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "文档创建成功",
    ))
}

/// Get document by ID
pub async fn get_document(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_document called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取文档成功",
    ))
}

/// Update document
pub async fn update_document(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_document called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "文档更新成功",
    ))
}
