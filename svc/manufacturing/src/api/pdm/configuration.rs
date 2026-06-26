use axum::{
    extract::Path, extract::State,
    routing::{get, post, put},
    Json, Router,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/mfg/pdm/configuration",
            get(list_configurations).post(create_configuration),
        )
        .route(
            "/api/mfg/pdm/configuration/{id}",
            get(get_configuration).put(update_configuration),
        )
}

pub async fn list_configurations(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_configurations called");
    Json(ApiResponse::success(
        serde_json::json!({
            "configurations": [],
            "total": 0
        }),
        "获取配置列表成功",
    ))
}

pub async fn create_configuration(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_configuration called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "配置创建成功",
    ))
}

pub async fn get_configuration(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_configuration called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取配置成功",
    ))
}

pub async fn update_configuration(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_configuration called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "配置更新成功",
    ))
}
