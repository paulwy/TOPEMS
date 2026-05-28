use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateOutboundOrderRequest, OutboundOrder, UpdateOutboundOrderRequest};
use crate::api::audit::log_audit_event;
use topems_shared::{ApiResponse, PaginationParams, api_error};

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/outbound-orders", get(list_outbound_orders).post(create_outbound_order))
        .route(
            "/api/v1/outbound-orders/{id}",
            get(get_outbound_order).put(update_outbound_order).delete(delete_outbound_order),
        )
        .with_state(state);

    Ok(app)
}

async fn list_outbound_orders(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, expected_delivery, 
               actual_delivery, total_amount, status, remarks, created_at, updated_at
        FROM outbound_orders
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
                SELECT COUNT(*) FROM outbound_orders
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
                "获取出库订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取出库订单列表失败: {}", e);
            Json(api_error(500, "获取出库订单列表失败"))
        }
    }
}

async fn create_outbound_order(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateOutboundOrderRequest>,
) -> Json<ApiResponse<OutboundOrder>> {
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        INSERT INTO outbound_orders (id, order_number, warehouse_id, customer_id, order_date, 
                                      expected_delivery, total_amount, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
        RETURNING id, order_number, warehouse_id, customer_id, order_date, expected_delivery, 
                  actual_delivery, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.order_number)
    .bind(&req.warehouse_id)
    .bind(&req.customer_id)
    .bind(req.order_date)
    .bind(&req.expected_delivery)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "出库订单创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建出库订单失败: {}", e);
            (
                Json(api_error(500, "出库订单创建失败")),
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
        "outbound_order".to_string(),
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

async fn get_outbound_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OutboundOrder>> {
    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, expected_delivery, 
               actual_delivery, total_amount, status, remarks, created_at, updated_at
        FROM outbound_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取出库订单成功")),
        Ok(None) => Json(api_error(404, "出库订单不存在")),
        Err(e) => {
            tracing::error!("获取出库订单失败: {}", e);
            Json(api_error(500, "获取出库订单失败"))
        }
    }
}

async fn update_outbound_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateOutboundOrderRequest>,
) -> Json<ApiResponse<OutboundOrder>> {
    // 先获取 request_data 避免所有权问题
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, expected_delivery, 
               actual_delivery, total_amount, status, remarks, created_at, updated_at 
        FROM outbound_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "出库订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询出库订单失败: {}", e))),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let customer_id = req.customer_id.or(existing.customer_id);
    let expected_delivery = req.expected_delivery.or(existing.expected_delivery);
    let actual_delivery = req.actual_delivery.or(existing.actual_delivery);
    let total_amount = req.total_amount.or(existing.total_amount);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        UPDATE outbound_orders SET
            warehouse_id = $2, customer_id = $3, expected_delivery = $4, actual_delivery = $5, 
            total_amount = $6, status = $7, remarks = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, order_number, warehouse_id, customer_id, order_date, expected_delivery, 
                  actual_delivery, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&warehouse_id)
    .bind(&customer_id)
    .bind(&expected_delivery)
    .bind(&actual_delivery)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "出库订单更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新出库订单失败: {}", e);
            (
                Json(api_error(500, "出库订单更新失败")),
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
        "outbound_order".to_string(),
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

async fn delete_outbound_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM outbound_orders WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "出库订单删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "出库订单不存在")),
            "error",
            Some("出库订单不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除出库订单失败: {}", e);
            (
                Json(api_error(500, "出库订单删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}
