use axum::{
    extract::Path, extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/mfg/process", get(list_processes).post(create_process))
        .route(
            "/api/mfg/process/{id}",
            get(get_process).put(update_process).delete(delete_process),
        )
}

pub async fn list_processes(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_processes called");
    Json(ApiResponse::success(
        serde_json::json!({
            "processes": [],
            "total": 0
        }),
        "获取生产工序列表成功",
    ))
}

pub async fn create_process(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_process called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "生产工序创建成功",
    ))
}

pub async fn get_process(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_process called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取生产工序成功",
    ))
}

pub async fn update_process(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_process called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工序更新成功",
    ))
}

pub async fn delete_process(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    tracing::info!("delete_process called: {}", id);
    Json(ApiResponse::success("".to_string(), "生产工序删除成功"))
}
