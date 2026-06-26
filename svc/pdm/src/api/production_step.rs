use axum::{extract::Path, extract::State, routing::{delete, get, post, put}, Json, Router};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/pdm/production-steps", get(list_steps).post(create_step))
        .route("/api/pdm/production-steps/{id}", get(get_step).put(update_step).delete(delete_step))
}

pub async fn list_steps(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_steps called");
    Json(ApiResponse::success(
        serde_json::json!({"steps": [], "total": 0}),
        "获取列表成功",
    ))
}

pub async fn create_step(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_step called");
    Json(ApiResponse::success(
        serde_json::json!({"id": Uuid::new_v4()}),
        "创建成功",
    ))
}

pub async fn get_step(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_step called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}

pub async fn update_step(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_step called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "更新成功",
    ))
}

pub async fn delete_step(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    tracing::info!("delete_step called");
    Json(ApiResponse::success(true, "删除成功"))
}
