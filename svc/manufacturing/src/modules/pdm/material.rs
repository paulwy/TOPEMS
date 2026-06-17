//! Material handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

// ==================== Material Handlers ====================

/// List materials
pub async fn list_materials(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_materials called");
    Json(ApiResponse::success(
        serde_json::json!({
            "materials": [],
            "total": 0
        }),
        "获取物料列表成功",
    ))
}

/// Create a new material
pub async fn create_material(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_material called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "物料创建成功",
    ))
}

/// Get material by ID
pub async fn get_material(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_material called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取物料成功",
    ))
}

/// Update material
pub async fn update_material(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_material called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "物料更新成功",
    ))
}
