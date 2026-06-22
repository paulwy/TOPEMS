//! Work Station handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

// ==================== Work Station Handlers ====================

/// List work stations
pub async fn list_work_stations(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_work_stations called");
    Json(ApiResponse::success(
        serde_json::json!({
            "workstations": [],
            "total": 0
        }),
        "获取工作站列表成功",
    ))
}

/// Create a new work station
pub async fn create_work_station(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_work_station called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "工作站创建成功",
    ))
}

/// Get work station by ID
pub async fn get_work_station(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_work_station called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取工作站成功",
    ))
}

/// Update work station
pub async fn update_work_station(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_work_station called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "工作站更新成功",
    ))
}
