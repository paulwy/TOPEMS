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
        .route(
            "/api/mfg/production-order",
            get(list_production_orders).post(create_production_order),
        )
        .route(
            "/api/mfg/production-order/{id}",
            get(get_production_order)
                .put(update_production_order)
                .delete(delete_production_order),
        )
        .route(
            "/api/mfg/production-order/{id}/start",
            post(start_production_order),
        )
        .route(
            "/api/mfg/production-order/{id}/complete",
            post(complete_production_order),
        )
        .route(
            "/api/mfg/production-order/{id}/cancel",
            post(cancel_production_order),
        )
}

pub async fn list_production_orders(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_production_orders called");
    Json(ApiResponse::success(
        serde_json::json!({
            "orders": [],
            "total": 0
        }),
        "获取生产工单列表成功",
    ))
}

pub async fn create_production_order(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_production_order called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "生产工单创建成功",
    ))
}

pub async fn get_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取生产工单成功",
    ))
}

pub async fn update_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_production_order called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单更新成功",
    ))
}

pub async fn delete_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    tracing::info!("delete_production_order called: {}", id);
    Json(ApiResponse::success("".to_string(), "生产工单删除成功"))
}

pub async fn start_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("start_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单启动成功",
    ))
}

pub async fn complete_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("complete_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单完成成功",
    ))
}

pub async fn cancel_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("cancel_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单取消成功",
    ))
}
