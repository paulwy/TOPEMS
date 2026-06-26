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
        .route("/api/mfg/equipment", get(list_equipment).post(create_equipment))
        .route(
            "/api/mfg/equipment/{id}",
            get(get_equipment).put(update_equipment),
        )
}

pub async fn list_equipment(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_equipment called");
    Json(ApiResponse::success(
        serde_json::json!({
            "equipment": [],
            "total": 0
        }),
        "获取设备列表成功",
    ))
}

pub async fn create_equipment(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_equipment called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "设备创建成功",
    ))
}

pub async fn get_equipment(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_equipment called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取设备成功",
    ))
}

pub async fn update_equipment(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_equipment called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "设备更新成功",
    ))
}
