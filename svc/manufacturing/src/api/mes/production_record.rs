use axum::{
    extract::Path, extract::State,
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/mfg/record", get(list_records).post(create_record))
        .route("/api/mfg/record/{id}", get(get_record))
}

pub async fn list_records(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_records called");
    Json(ApiResponse::success(
        serde_json::json!({
            "records": [],
            "total": 0
        }),
        "获取生产记录列表成功",
    ))
}

pub async fn create_record(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_record called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "生产记录创建成功",
    ))
}

pub async fn get_record(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_record called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取生产记录成功",
    ))
}
