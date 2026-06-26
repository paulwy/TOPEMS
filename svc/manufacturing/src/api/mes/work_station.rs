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
            "/api/mfg/work-station",
            get(list_work_stations).post(create_work_station),
        )
        .route(
            "/api/mfg/work-station/{id}",
            get(get_work_station).put(update_work_station),
        )
}

pub async fn list_work_stations(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_work_stations called");
    Json(ApiResponse::success(
        serde_json::json!({
            "workstations": [],
            "total": 0
        }),
        "获取工作站列表成功",
    ))
}

pub async fn create_work_station(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_work_station called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "工作站创建成功",
    ))
}

pub async fn get_work_station(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_work_station called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取工作站成功",
    ))
}

pub async fn update_work_station(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_work_station called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "工作站更新成功",
    ))
}
