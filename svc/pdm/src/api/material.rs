use axum::{
    extract::Path,
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/pdm/materials",
            get(list_materials).post(create_material),
        )
        .route(
            "/api/pdm/materials/{id}",
            get(get_material).put(update_material),
        )
}

pub async fn list_materials(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_materials called");
    Json(ApiResponse::success(
        serde_json::json!({"materials": [], "total": 0}),
        "获取列表成功",
    ))
}

pub async fn create_material(
    State(_state): State<AppState>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_material called");
    Json(ApiResponse::success(
        serde_json::json!({"id": Uuid::new_v4()}),
        "创建成功",
    ))
}

pub async fn get_material(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_material called");
    Json(ApiResponse::success(serde_json::json!({}), "获取成功"))
}

pub async fn update_material(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_material called");
    Json(ApiResponse::success(serde_json::json!({}), "更新成功"))
}
