use axum::{extract::Path, extract::State, routing::{delete, get, post, put}, Json, Router};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/pdm/production-formulas", get(list_formulas).post(create_formula))
        .route("/api/pdm/production-formulas/{id}", get(get_formula).put(update_formula).delete(delete_formula))
}

pub async fn list_formulas(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_formulas called");
    Json(ApiResponse::success(
        serde_json::json!({"formulas": [], "total": 0}),
        "获取列表成功",
    ))
}

pub async fn create_formula(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_formula called");
    Json(ApiResponse::success(
        serde_json::json!({"id": Uuid::new_v4()}),
        "创建成功",
    ))
}

pub async fn get_formula(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_formula called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}

pub async fn update_formula(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_formula called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "更新成功",
    ))
}

pub async fn delete_formula(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    tracing::info!("delete_formula called");
    Json(ApiResponse::success(true, "删除成功"))
}
