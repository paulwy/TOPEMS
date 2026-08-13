use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateSalesOrderRequest, SalesOrder, UpdateSalesOrderRequest};
use crate::modules::material_calc::{calculate_sales_order_amounts, default_sales_order_status};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse, PaginationParams};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/sales-orders",
            get(list_sales_orders).post(create_sales_order),
        )
        .route(
            "/sales-orders/{id}",
            get(get_sales_order)
                .put(update_sales_order)
                .delete(delete_sales_order),
        )
        .route("/sales-orders/{id}/approve", put(approve_sales_order))
        .route("/sales-orders/{id}/ship", put(ship_sales_order))
        .route("/sales-orders/{id}/complete", put(complete_sales_order))
        .route("/sales-orders/{id}/cancel", put(cancel_sales_order))
}

#[utoipa::path(
    get,
    path = "/erp/sales-orders",
    responses(
        (status = 200, description = "list_sales_orders OK")
    ),
    tag = "ERP/sales-order"
)]
pub async fn list_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<SalesOrder>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let sales_orders_result = if search_pattern.is_some() || status_filter.is_some() {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();

        sqlx::query_as::<_, SalesOrder>(
            r#"SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at 
               FROM sales_orders 
               WHERE (order_no ILIKE $1 OR customer_name ILIKE $1)
                 AND ($2 = '' OR status = $2)
               ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as::<_, SalesOrder>(
            "SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM sales_orders ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    let sales_orders = match sales_orders_result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询销售订单失败: {}", e);
            return Json(api_error(500, "查询销售订单失败"));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM sales_orders WHERE deleted_at IS NULL AND (order_no ILIKE $1 OR customer_name ILIKE $1) AND ($2 = '' OR status = $2)"#
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_default())
    .bind(status_filter.as_deref().unwrap_or(""))
    .fetch_one(&state.db)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询销售订单总数失败: {}", e);
            return Json(api_error(500, "查询销售订单总数失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(sales_orders, total, page, page_size),
        "获取销售订单列表成功",
    ))
}

#[utoipa::path(
    get,
    path = "/erp/sales-orders/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "get_sales_order OK")
    ),
    tag = "ERP/sales-order"
)]
pub async fn get_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        "SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM sales_orders WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(sales_order)) => Json(ApiResponse::success(sales_order, "获取销售订单成功")),
        Ok(None) => Json(api_error(404, "销售订单不存在")),
        Err(e) => {
            tracing::error!("查询销售订单失败: {}", e);
            Json(api_error(500, "查询销售订单失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/erp/sales-orders",
    request_body = CreateSalesOrderRequest,
    responses(
        (status = 200, description = "create_sales_order OK")
    ),
    tag = "ERP/sales-order"
)]
pub async fn create_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let customer_result =
        sqlx::query_scalar::<_, String>("SELECT name FROM customers WHERE id = $1")
            .bind(body.customer_id)
            .fetch_optional(&state.db)
            .await;

    let customer_name = match customer_result {
        Ok(Some(name)) => name,
        _ => "".to_string(),
    };

    let order_date = body.order_date.unwrap_or_else(|| Utc::now());
    let amounts = calculate_sales_order_amounts(
        body.total_amount,
        body.tax_amount,
        body.discount_amount,
        body.payable_amount,
    );
    let total_amount = amounts.total_amount;
    let tax_amount = amounts.tax_amount;
    let discount_amount = amounts.discount_amount;
    let payable_amount = amounts.payable_amount;

    let result = sqlx::query_as::<_, SalesOrder>(
        "INSERT INTO sales_orders (order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at",
    )
    .bind(body.order_no)
    .bind(body.customer_id)
    .bind(customer_name)
    .bind(order_date)
    .bind(body.delivery_date)
    .bind(total_amount)
    .bind(tax_amount)
    .bind(discount_amount)
    .bind(payable_amount)
    .bind(default_sales_order_status(body.status))
    .bind(body.remark)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(sales_order)) => Json(ApiResponse::success(sales_order, "创建销售订单成功")),
        Ok(None) => Json(api_error(500, "创建销售订单失败")),
        Err(e) => {
            tracing::error!("创建销售订单失败: {}", e);
            Json(api_error(500, "创建销售订单失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/erp/sales-orders/{id}",
    request_body = UpdateSalesOrderRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "update_sales_order OK")
    ),
    tag = "ERP/sales-order"
)]
pub async fn update_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        "UPDATE sales_orders SET customer_id = COALESCE($1, customer_id), delivery_date = COALESCE($2, delivery_date), total_amount = COALESCE($3, total_amount), tax_amount = COALESCE($4, tax_amount), discount_amount = COALESCE($5, discount_amount), payable_amount = COALESCE($6, payable_amount), status = COALESCE($7, status), remark = COALESCE($8, remark), updated_at = NOW() WHERE id = $9 RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at",
    )
    .bind(body.customer_id)
    .bind(body.delivery_date)
    .bind(body.total_amount)
    .bind(body.tax_amount)
    .bind(body.discount_amount)
    .bind(body.payable_amount)
    .bind(body.status)
    .bind(body.remark)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(sales_order)) => Json(ApiResponse::success(sales_order, "更新销售订单成功")),
        Ok(None) => Json(api_error(404, "销售订单不存在")),
        Err(e) => {
            tracing::error!("更新销售订单失败: {}", e);
            Json(api_error(500, "更新销售订单失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/erp/sales-orders/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "delete_sales_order OK")
    ),
    tag = "ERP/sales-order"
)]
pub async fn delete_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("UPDATE sales_orders SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            "删除成功".to_string(),
            "删除销售订单成功",
        )),
        Ok(_) => Json(api_error(404, "销售订单不存在")),
        Err(e) => {
            tracing::error!("删除销售订单失败: {}", e);
            Json(api_error(500, "删除销售订单失败"))
        }
    }
}

async fn update_sales_order_status(
    state: ApiState,
    claims: Claims,
    id: Uuid,
    status: &'static str,
    success_message: &'static str,
    error_message: &'static str,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        "UPDATE sales_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at",
    )
    .bind(status)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(sales_order)) => Json(ApiResponse::success(sales_order, success_message)),
        Ok(None) => Json(api_error(404, "销售订单不存在")),
        Err(e) => {
            tracing::error!("{}: {}", error_message, e);
            Json(api_error(500, error_message))
        }
    }
}

#[utoipa::path(
    put,
    path = "/erp/sales-orders/{id}/approve",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "approve_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn approve_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    update_sales_order_status(
        state,
        claims,
        id,
        "approved",
        "销售订单审批成功",
        "审批销售订单失败",
    )
    .await
}

#[utoipa::path(
    put,
    path = "/erp/sales-orders/{id}/ship",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "ship_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn ship_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    update_sales_order_status(
        state,
        claims,
        id,
        "shipped",
        "销售订单发货成功",
        "销售订单发货失败",
    )
    .await
}

#[utoipa::path(
    put,
    path = "/erp/sales-orders/{id}/complete",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "complete_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn complete_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    update_sales_order_status(
        state,
        claims,
        id,
        "completed",
        "销售订单完成成功",
        "完成销售订单失败",
    )
    .await
}

#[utoipa::path(
    put,
    path = "/erp/sales-orders/{id}/cancel",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "cancel_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn cancel_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    update_sales_order_status(
        state,
        claims,
        id,
        "cancelled",
        "销售订单取消成功",
        "取消销售订单失败",
    )
    .await
}
