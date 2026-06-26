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
        .route("/api/mfg/pdm/document", get(list_documents).post(create_document))
        .route(
            "/api/mfg/pdm/document/{id}",
            get(get_document).put(update_document),
        )
}

pub async fn list_documents(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_documents called");
    Json(ApiResponse::success(
        serde_json::json!({
            "documents": [],
            "total": 0
        }),
        "获取文档列表成功",
    ))
}

pub async fn create_document(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_document called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "文档创建成功",
    ))
}

pub async fn get_document(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_document called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取文档成功",
    ))
}

pub async fn update_document(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_document called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "文档更新成功",
    ))
}
