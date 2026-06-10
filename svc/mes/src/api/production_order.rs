use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateProductionOrderRequest, ProductionOrder, UpdateProductionOrderRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::{ApiResponse, PaginationParams, api_error, auth::Claims};
use crate::api::audit::log_audit_event;

use super::ApiState;

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/orders", get(list_orders).post(create_order))
        .route(
            "/api/v1/orders/{id}",
            get(get_order).put(update_order).delete(delete_order),
        );

    Ok(app)
}

async fn list_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::ProductionOrderRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        SELECT id, order_number, product_name, product_code, quantity, unit, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, priority, created_at, updated_at
        FROM production_orders
        WHERE ($1::text IS NULL OR order_number ILIKE $1 OR product_name ILIKE $1)
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
                SELECT COUNT(*) FROM production_orders
                WHERE ($1::text IS NULL OR order_number ILIKE $1 OR product_name ILIKE $1)
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
                "获取生产工单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产工单列表失败: {}", e);
            Json(api_error(500, "获取生产工单列表失败"))
        }
    }
}

async fn create_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateProductionOrderRequest>,
) -> Json<ApiResponse<ProductionOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::ProductionOrderWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        INSERT INTO production_orders (id, order_number, product_name, product_code, quantity, unit, scheduled_start_date, scheduled_end_date, status, priority, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
        RETURNING id, order_number, product_name, product_code, quantity, unit, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, priority, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.order_number)
    .bind(&req.product_name)
    .bind(&req.product_code)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(req.scheduled_start_date)
    .bind(req.scheduled_end_date)
    .bind(&req.priority)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "生产工单创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建生产工单失败: {}", e);
            (
                Json(api_error(500, "生产工单创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "production_order".to_string(),
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
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::ProductionOrderRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        SELECT id, order_number, product_name, product_code, quantity, unit, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, priority, created_at, updated_at
        FROM production_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取生产工单成功")),
        Ok(None) => Json(api_error(404, "生产工单不存在")),
        Err(e) => {
            tracing::error!("获取生产工单失败: {}", e);
            Json(api_error(500, "获取生产工单失败"))
        }
    }
}

async fn update_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateProductionOrderRequest>,
) -> Json<ApiResponse<ProductionOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::ProductionOrderWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    // 先获取 request_data 避免所有权问题
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, ProductionOrder>(
        "SELECT id, order_number, product_name, product_code, quantity, unit, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, priority, created_at, updated_at FROM production_orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "生产工单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询生产工单失败: {}", e))),
    };

    let product_name = req.product_name.unwrap_or(existing.product_name);
    let product_code = req.product_code.or(existing.product_code);
    let quantity = req.quantity.unwrap_or(existing.quantity);
    let unit = req.unit.or(existing.unit);
    let scheduled_start_date = req.scheduled_start_date.or(existing.scheduled_start_date);
    let scheduled_end_date = req.scheduled_end_date.or(existing.scheduled_end_date);
    let actual_start_date = req.actual_start_date.or(existing.actual_start_date);
    let actual_end_date = req.actual_end_date.or(existing.actual_end_date);
    let status = req.status.unwrap_or(existing.status);
    let priority = req.priority.or(existing.priority);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        UPDATE production_orders SET
            product_name = $2, product_code = $3, quantity = $4, unit = $5, scheduled_start_date = $6, scheduled_end_date = $7, actual_start_date = $8, actual_end_date = $9, status = $10, priority = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, order_number, product_name, product_code, quantity, unit, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, status, priority, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&product_name)
    .bind(&product_code)
    .bind(quantity)
    .bind(&unit)
    .bind(scheduled_start_date)
    .bind(scheduled_end_date)
    .bind(actual_start_date)
    .bind(actual_end_date)
    .bind(&status)
    .bind(&priority)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "生产工单更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新生产工单失败: {}", e);
            (
                Json(api_error(500, "生产工单更新失败")),
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
        "production_order".to_string(),
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

async fn delete_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::ProductionOrderWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM production_orders WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "生产工单删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "生产工单不存在")),
            "error",
            Some("生产工单不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除生产工单失败: {}", e);
            (
                Json(api_error(500, "生产工单删除失败")),
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
        "production_order".to_string(),
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
