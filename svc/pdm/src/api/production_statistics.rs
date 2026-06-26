use axum::{extract::Path, extract::State, routing::get, Json, Router};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/pdm/production-statistics", get(list_statistics))
        .route("/api/pdm/statistics", get(get_statistics))
}

pub async fn list_statistics(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_statistics called");
    Json(ApiResponse::success(
        serde_json::json!({"statistics": [], "total": 0}),
        "获取列表成功",
    ))
}

pub async fn get_statistics(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_statistics called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}
