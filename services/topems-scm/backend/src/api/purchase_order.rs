use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use crate::models::{CreatePurchaseOrderRequest, PurchaseOrder, UpdatePurchaseOrderRequest};
use topems_shared::{ApiResponse, PaginationParams, api_error};
use crate::api::audit::log_audit_event;
use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/purchase-orders", get(list_orders).post(create_order))
        .route(
            "/api/v1/purchase-orders/{id}",
            get(get_order).put(update_order),
        )
}

async fn list_orders(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM purchase_orders
        WHERE ($1::text IS NULL OR order_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM purchase_orders
                WHERE ($1::text IS NULL OR order_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "orders": orders,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取采购订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取采购订单列表失败: {}", e);
            Json(api_error(500, "获取采购订单列表失败"))
        }
    }
}

async fn create_order(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        INSERT INTO purchase_orders (id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
        RETURNING id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.order_number)
    .bind(req.supplier_id)
    .bind(req.order_date)
    .bind(req.delivery_date)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "采购订单创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建采购订单失败: {}", e);
            (
                Json(api_error(500, "采购订单创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "purchase_order".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_order(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM purchase_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取采购订单成功")),
        Ok(None) => Json(api_error(404, "采购订单不存在")),
        Err(e) => {
            tracing::error!("获取采购订单失败: {}", e);
            Json(api_error(500, "获取采购订单失败"))
        }
    }
}

async fn update_order(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, PurchaseOrder>(
        "SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at FROM purchase_orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "采购订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询采购订单失败: {}", e))),
    };

    let supplier_id = req.supplier_id.or(existing.supplier_id);
    let delivery_date = req.delivery_date.or(existing.delivery_date);
    let total_amount = req.total_amount.or(existing.total_amount);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        UPDATE purchase_orders SET
            supplier_id = $2, delivery_date = $3, total_amount = $4, status = $5, remarks = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_id)
    .bind(delivery_date)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "采购订单更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新采购订单失败: {}", e);
            (
                Json(api_error(500, "采购订单更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "purchase_order".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}
