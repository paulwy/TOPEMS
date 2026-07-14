use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateSalesOrderRequest, SalesOrder, UpdateSalesOrderRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/erp/sales-orders",
            get(list_sales_orders).post(create_sales_order),
        )
        .route(
            "/api/erp/sales-orders/{id}",
            get(get_sales_order)
                .put(update_sales_order)
                .delete(delete_sales_order),
        )
}

pub async fn list_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<SalesOrder>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
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

    let total = match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sales_orders")
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

pub async fn get_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        "SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM sales_orders WHERE id = $1",
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

pub async fn create_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
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
    let total_amount = body.total_amount.unwrap_or(0.0);
    let tax_amount = body.tax_amount.unwrap_or(0.0);
    let discount_amount = body.discount_amount.unwrap_or(0.0);
    let payable_amount = body
        .payable_amount
        .unwrap_or(total_amount + tax_amount - discount_amount);

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
    .bind(body.status.unwrap_or_else(|| "draft".to_string()))
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

pub async fn update_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
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

pub async fn delete_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM sales_orders WHERE id = $1")
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
