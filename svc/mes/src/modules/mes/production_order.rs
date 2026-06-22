//! Production Order handlers

use axum::{extract::Path, extract::State, Json};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

// ==================== Production Order Handlers ====================

/// List production orders
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

/// Create a new production order
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

/// Get production order by ID
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

/// Update production order
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

/// Delete production order
pub async fn delete_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    tracing::info!("delete_production_order called: {}", id);
    Json(ApiResponse::success("".to_string(), "生产工单删除成功"))
}

/// Start production order
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

/// Complete production order
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

/// Cancel production order
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
