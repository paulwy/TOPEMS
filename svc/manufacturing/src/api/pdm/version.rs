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
        .route("/api/mfg/pdm/version", get(list_versions).post(create_version))
        .route(
            "/api/mfg/pdm/version/{id}",
            get(get_version).put(update_version),
        )
}

pub async fn list_versions(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_versions called");
    Json(ApiResponse::success(
        serde_json::json!({
            "versions": [],
            "total": 0
        }),
        "获取版本列表成功",
    ))
}

pub async fn create_version(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_version called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "版本创建成功",
    ))
}

pub async fn get_version(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_version called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取版本成功",
    ))
}

pub async fn update_version(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_version called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "版本更新成功",
    ))
}
