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
        .route("/api/mfg/pdm/product", get(list_products).post(create_product))
        .route(
            "/api/mfg/pdm/product/{id}",
            get(get_product).put(update_product).delete(delete_product),
        )
}

pub async fn list_products(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_products called");
    Json(ApiResponse::success(
        serde_json::json!({
            "products": [],
            "total": 0
        }),
        "获取产品列表成功",
    ))
}

pub async fn create_product(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_product called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "产品创建成功",
    ))
}

pub async fn get_product(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_product called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取产品成功",
    ))
}

pub async fn update_product(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_product called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "产品更新成功",
    ))
}

pub async fn delete_product(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    tracing::info!("delete_product called: {}", id);
    Json(ApiResponse::success("".to_string(), "产品删除成功"))
}
