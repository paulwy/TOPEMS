use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateSalesOrderRequest, SalesOrder, UpdateSalesOrderRequest};
use crate::modules::material_calc::{calculate_sales_order_amounts, default_sales_order_status};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse, PaginationParams};
use topems_shared_event::event::{SalesOrderApprovedPayload, SalesOrderCreatedPayload};

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

use rust_decimal::prelude::ToPrimitive;

fn dec_owned(v: f64) -> rust_decimal::Decimal {
    use std::str::FromStr;
    rust_decimal::Decimal::from_str(&format!("{:.2}", v)).unwrap_or_default()
}

fn dec(v: Option<f64>) -> Option<rust_decimal::Decimal> {
    Some(dec_owned(v?))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<SalesOrder>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
            only_own_schema_query!("erp", r#"SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at 
               FROM erp.sales_orders 
               WHERE (order_no ILIKE $1 OR customer_name ILIKE $1)
                 AND ($2 = '' OR status = $2)
               ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query_as::<_, SalesOrder>(
            only_own_schema_query!("erp", "SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM erp.sales_orders ORDER BY created_at DESC LIMIT $1 OFFSET $2")
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
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
        only_own_schema_query!("erp", r#"SELECT COUNT(*) FROM erp.sales_orders WHERE deleted_at IS NULL AND ($1 = '' OR order_no ILIKE $1 OR customer_name ILIKE $1) AND ($2 = '' OR status = $2)"#)
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_default())
    .bind(status_filter.as_deref().unwrap_or(""))
    .fetch_one(&mut **txn)
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
    security(("BearerAuth" = ["erp:read"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        only_own_schema_query!("erp", "SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM erp.sales_orders WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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
    security(("BearerAuth" = ["erp:master-data:write"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<CreateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let customer_result = sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "erp",
        "SELECT name FROM erp.customers WHERE id = $1"
    ))
    .bind(body.customer_id)
    .fetch_optional(&mut **txn)
    .await;

    let customer_name = match customer_result {
        Ok(Some(name)) => name,
        _ => "".to_string(),
    };

    let order_date = body.order_date.unwrap_or_else(Utc::now);
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
        only_own_schema_query!("erp", "INSERT INTO erp.sales_orders (order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"),
    )
    .bind(body.order_no)
    .bind(body.customer_id)
    .bind(customer_name)
    .bind(order_date)
    .bind(body.delivery_date)
    .bind(dec_owned(total_amount))
    .bind(dec_owned(tax_amount))
    .bind(dec_owned(discount_amount))
    .bind(dec_owned(payable_amount))
    .bind(default_sales_order_status(body.status))
    .bind(body.remark)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(sales_order)) => {
            if let Some(ref publisher) = state.event_publisher {
                let tenant_id: Option<Uuid> = sqlx::query_scalar(
                    "SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid",
                )
                .fetch_optional(&mut **txn)
                .await
                .ok()
                .flatten();
                let payload = SalesOrderCreatedPayload {
                    order_id: sales_order.id,
                    order_no: sales_order.order_no.clone(),
                    customer_id: Some(sales_order.customer_id),
                    customer_name: Some(sales_order.customer_name.clone()),
                    total_amount: sales_order.total_amount.to_f64(),
                    payable_amount: sales_order.payable_amount.to_f64(),
                    created_by: Some(claims.sub.clone()),
                    tenant_id,
                };
                match publisher.publish_sales_order_created(payload).await {
                    Ok(_) => tracing::info!(
                        "[erp] 发布 SalesOrderCreated 事件成功 - order_id={}, payable_amount={}",
                        sales_order.id,
                        sales_order.payable_amount
                    ),
                    Err(e) => tracing::warn!(
                        "[erp] 发布 SalesOrderCreated 事件失败: {}，将由 Finance 定时补拉",
                        e
                    ),
                }
            }
            Json(ApiResponse::success(sales_order, "创建销售订单成功"))
        }
        Ok(None) => Json(api_error(500, "创建销售订单失败")),
        Err(e) => {
            tracing::error!("创建销售订单失败: {}", e);
            Json(api_error(500, "创建销售订单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<UpdateSalesOrderRequest>,
) -> Json<ApiResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        only_own_schema_query!("erp", "UPDATE erp.sales_orders SET customer_id = COALESCE($1, customer_id), delivery_date = COALESCE($2, delivery_date), total_amount = COALESCE($3, total_amount), tax_amount = COALESCE($4, tax_amount), discount_amount = COALESCE($5, discount_amount), payable_amount = COALESCE($6, payable_amount), status = COALESCE($7, status), remark = COALESCE($8, remark), updated_at = NOW() WHERE id = $9 RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"),
    )
    .bind(body.customer_id)
    .bind(body.delivery_date)
    .bind(dec(body.total_amount))
    .bind(dec(body.tax_amount))
    .bind(dec(body.discount_amount))
    .bind(dec(body.payable_amount))
    .bind(body.status)
    .bind(body.remark)
    .bind(id)
    .fetch_optional(&mut **txn)
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
    security(("BearerAuth" = ["erp:delete"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.sales_orders SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
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
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Json<ApiResponse<SalesOrder>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        only_own_schema_query!("erp", "UPDATE erp.sales_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"),
    )
    .bind(status)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(sales_order)) => {
            if status == "approved" {
                if let Some(ref publisher) = state.event_publisher {
                    let tenant_id: Option<Uuid> = sqlx::query_scalar(
                        "SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid",
                    )
                    .fetch_optional(&mut **txn)
                    .await
                    .ok()
                    .flatten();
                    let payload = SalesOrderApprovedPayload {
                        order_id: sales_order.id,
                        order_no: sales_order.order_no.clone(),
                        customer_id: Some(sales_order.customer_id),
                        customer_name: Some(sales_order.customer_name.clone()),
                        total_amount: sales_order.total_amount.to_f64(),
                        payable_amount: sales_order.payable_amount.to_f64(),
                        approved_by: Some(claims.sub.clone()),
                        approved_at: Some(Utc::now()),
                        tenant_id,
                    };
                    match publisher.publish_sales_order_approved(payload).await {
                        Ok(_) => tracing::info!(
                            "[erp] 发布 SalesOrderApproved 事件成功 - order_id={}, payable_amount={}",
                            sales_order.id, sales_order.payable_amount
                        ),
                        Err(e) => tracing::warn!(
                            "[erp] 发布 SalesOrderApproved 事件失败: {}，将由 Finance 定时补拉",
                            e
                        ),
                    }
                }
            }
            Json(ApiResponse::success(sales_order, success_message))
        }
        Ok(None) => Json(api_error(404, "销售订单不存在")),
        Err(e) => {
            tracing::error!("{}: {}", error_message, e);
            Json(api_error(500, error_message))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/sales-orders/{id}/approve",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "approve_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn approve_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    update_sales_order_status(
        state,
        claims,
        id,
        "approved",
        "销售订单审批成功",
        "审批销售订单失败",
        txn,
    )
    .await
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/sales-orders/{id}/ship",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "ship_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn ship_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    update_sales_order_status(
        state,
        claims,
        id,
        "shipped",
        "销售订单发货成功",
        "销售订单发货失败",
        txn,
    )
    .await
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/sales-orders/{id}/complete",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "complete_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn complete_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    update_sales_order_status(
        state,
        claims,
        id,
        "completed",
        "销售订单完成成功",
        "完成销售订单失败",
        txn,
    )
    .await
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/sales-orders/{id}/cancel",
    params(("id" = Uuid, Path, description = "销售订单ID")),
    responses((status = 200, description = "cancel_sales_order OK")),
    tag = "ERP/sales-order"
)]
pub async fn cancel_sales_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    update_sales_order_status(
        state,
        claims,
        id,
        "cancelled",
        "销售订单取消成功",
        "取消销售订单失败",
        txn,
    )
    .await
}
