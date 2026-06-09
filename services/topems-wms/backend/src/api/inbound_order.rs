use axum::{
    extract::{FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use crate::models::{CreateInboundOrderRequest, InboundOrder, UpdateInboundOrderRequest};
use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use topems_shared::{ApiResponse, PaginationParams, api_error};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/api/v1/inbound-orders", get(list_inbound_orders).post(create_inbound_order))
        .route(
            "/api/v1/inbound-orders/{id}",
            get(get_inbound_order).put(update_inbound_order).delete(delete_inbound_order),
        )
}

async fn list_inbound_orders(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, supplier_id, order_date, expected_arrival, 
               actual_arrival, total_amount, status, remarks, created_at, updated_at
        FROM inbound_orders
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
                SELECT COUNT(*) FROM inbound_orders
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
                "获取入库订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取入库订单列表失败: {}", e);
            Json(api_error(500, "获取入库订单列表失败"))
        }
    }
}

async fn create_inbound_order(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateInboundOrderRequest>,
) -> Json<ApiResponse<InboundOrder>> {
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        INSERT INTO inbound_orders (id, order_number, warehouse_id, supplier_id, order_date, 
                                     expected_arrival, total_amount, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
        RETURNING id, order_number, warehouse_id, supplier_id, order_date, expected_arrival, 
                  actual_arrival, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.order_number)
    .bind(&req.warehouse_id)
    .bind(&req.supplier_id)
    .bind(req.order_date)
    .bind(&req.expected_arrival)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "入库订单创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建入库订单失败: {}", e);
            (
                Json(api_error(500, "入库订单创建失败")),
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
        "inbound_order".to_string(),
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

async fn get_inbound_order(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InboundOrder>> {
    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, supplier_id, order_date, expected_arrival, 
               actual_arrival, total_amount, status, remarks, created_at, updated_at
        FROM inbound_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取入库订单成功")),
        Ok(None) => Json(api_error(404, "入库订单不存在")),
        Err(e) => {
            tracing::error!("获取入库订单失败: {}", e);
            Json(api_error(500, "获取入库订单失败"))
        }
    }
}

async fn update_inbound_order(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInboundOrderRequest>,
) -> Json<ApiResponse<InboundOrder>> {
    // 先获取 request_data 避免所有权问题
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, InboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, supplier_id, order_date, expected_arrival, 
               actual_arrival, total_amount, status, remarks, created_at, updated_at 
        FROM inbound_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "入库订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询入库订单失败: {}", e))),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let supplier_id = req.supplier_id.or(existing.supplier_id);
    let expected_arrival = req.expected_arrival.or(existing.expected_arrival);
    let actual_arrival = req.actual_arrival.or(existing.actual_arrival);
    let total_amount = req.total_amount.or(existing.total_amount);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        UPDATE inbound_orders SET
            warehouse_id = $2, supplier_id = $3, expected_arrival = $4, actual_arrival = $5, 
            total_amount = $6, status = $7, remarks = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, order_number, warehouse_id, supplier_id, order_date, expected_arrival, 
                  actual_arrival, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&warehouse_id)
    .bind(&supplier_id)
    .bind(&expected_arrival)
    .bind(&actual_arrival)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "入库订单更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新入库订单失败: {}", e);
            (
                Json(api_error(500, "入库订单更新失败")),
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
        "inbound_order".to_string(),
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

async fn delete_inbound_order(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM inbound_orders WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "入库订单删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "入库订单不存在")),
            "error",
            Some("入库订单不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除入库订单失败: {}", e);
            (
                Json(api_error(500, "入库订单删除失败")),
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
        "inbound_order".to_string(),
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
