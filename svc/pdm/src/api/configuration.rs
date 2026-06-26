use axum::{extract::Path, extract::State, routing::{get, post, put}, Json, Router};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/pdm/configurations", get(list_configurations).post(create_configuration))
        .route("/api/pdm/configurations/{id}", get(get_configuration).put(update_configuration))
}

pub async fn list_configurations(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_configurations called");
    Json(ApiResponse::success(
        serde_json::json!({"configurations": [], "total": 0}),
        "获取列表成功",
    ))
}

pub async fn create_configuration(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_configuration called");
    Json(ApiResponse::success(
        serde_json::json!({"id": Uuid::new_v4()}),
        "创建成功",
    ))
}

pub async fn get_configuration(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_configuration called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}

pub async fn update_configuration(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_configuration called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "更新成功",
    ))
}
