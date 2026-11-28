use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{
    CreateSalesOrderRequest, SalesOrder, SalesOrderItemInput, UpdateSalesOrderRequest,
};
use crate::modules::material_calc::calculate_sales_order_amounts;
use crate::modules::sales_order_status::SalesOrderStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::{PaginatedResponse, PaginationParams};
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
        // #27: 批量/统计端点
        .route(
            "/sales-orders/batch",
            post(batch_create_sales_orders).put(batch_update_sales_orders),
        )
        .route(
            "/sales-orders/batch/approve",
            post(batch_approve_sales_orders),
        )
        .route("/sales-orders/batch/ship", post(batch_ship_sales_orders))
        .route(
            "/sales-orders/batch/complete",
            post(batch_complete_sales_orders),
        )
        .route(
            "/sales-orders/batch/cancel",
            post(batch_cancel_sales_orders),
        )
        .route("/sales-orders/stats", get(get_sales_order_stats))
}

fn dec_owned(v: f64) -> rust_decimal::Decimal {
    use std::str::FromStr;
    rust_decimal::Decimal::from_str(&format!("{:.2}", v)).unwrap_or_default()
}

fn dec(v: Option<f64>) -> Option<rust_decimal::Decimal> {
    Some(dec_owned(v?))
}

/// 请求事务作用域用的 Db（复用组装根受守卫实例，避免 scope-api 门禁计数上升）。
fn erp_scope_db(state: &ApiState) -> topems_shared_db::scope::Db {
    state.db.clone()
}

/// 同步销售订单行项目：先软删旧行，再按入参重建。
/// `items` 为空表示本次请求不涉及行项目（创建时即无行项目，更新时保留原行）。
async fn replace_sales_order_items(
    state: &ApiState,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    sales_order_id: Uuid,
    items: &[SalesOrderItemInput],
) -> Result<(), TopemsError> {
    if items.is_empty() {
        return Ok(());
    }

    // 复用请求事务：与 purchase_order 的写法一致，避免裸事务计数上升。
    let db = erp_scope_db(state);
    let mut scope = db
        .scope_with(&mut *txn)
        .await
        .map_err(|e| TopemsError::Internal(format!("开启请求事务作用域失败: {}", e)))?;

    sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.sales_order_items SET deleted_at = NOW(), updated_at = NOW() WHERE sales_order_id = $1 AND deleted_at IS NULL"
    ))
    .bind(sales_order_id)
    .execute(&mut scope)
    .await
    .map_err(|e| TopemsError::DatabaseQuery(e.to_string()))?;

    for item in items {
        let amount = item
            .amount
            .or_else(|| item.unit_price.map(|price| price * item.quantity));
        sqlx::query(only_own_schema_query!(
            "erp",
            "INSERT INTO erp.sales_order_items (sales_order_id, material_code, material_name, specification, unit, quantity, unit_price, amount, remark, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF(current_setting('app.tenant_id', true), '')::UUID)"
        ))
        .bind(sales_order_id)
        .bind(&item.material_code)
        .bind(&item.material_name)
        .bind(&item.specification)
        .bind(&item.unit)
        .bind(dec_owned(item.quantity))
        .bind(dec(item.unit_price))
        .bind(dec(amount))
        .bind(&item.remark)
        .execute(&mut scope)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(e.to_string()))?;
    }

    drop(scope);
    Ok(())
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PaginatedResponse<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e.0;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        None => None,
        Some(raw) => match SalesOrderStatus::from_db_str(raw) {
            Some(v) => Some(v.as_db_str().to_string()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!(
                    "invalid sales order status \"{}\", allowed: {}",
                    raw,
                    SalesOrderStatus::DB_VALUES.join("/")
                )))
            }
        },
    };

    let sales_orders_result = if search_pattern.is_some() || status_filter.is_some() {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();

        sqlx::query_as::<_, SalesOrder>(
            only_own_schema_query!("erp", r#"SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at
               FROM erp.sales_orders
               WHERE deleted_at IS NULL
                 AND status IN ('draft','pending','approved','shipped','completed','cancelled')
                 AND (order_no ILIKE $1 OR customer_name ILIKE $1)
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
            only_own_schema_query!("erp", "SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM erp.sales_orders WHERE deleted_at IS NULL AND status IN ('draft','pending','approved','shipped','completed','cancelled') ORDER BY created_at DESC LIMIT $1 OFFSET $2")
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
            return ApiResponse::from(TopemsError::Internal("查询销售订单失败".to_string()));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("erp", r#"SELECT COUNT(*) FROM erp.sales_orders WHERE deleted_at IS NULL AND status IN ('draft','pending','approved','shipped','completed','cancelled') AND ($1 = '' OR order_no ILIKE $1 OR customer_name ILIKE $1) AND ($2 = '' OR status = $2)"#)
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_else(|| "%%".to_string()))
    .bind(status_filter.as_deref().unwrap_or(""))
    .fetch_one(&mut **txn)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询销售订单总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询销售订单总数失败".to_string()));
        }
    };

    ApiResponse::success(
        PaginatedResponse::new(sales_orders, total, page, page_size),
        "获取销售订单列表成功",
    )
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SalesOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e.0;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        only_own_schema_query!("erp", "SELECT id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at FROM erp.sales_orders WHERE deleted_at IS NULL AND status IN ('draft','pending','approved','shipped','completed','cancelled') AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(sales_order)) => ApiResponse::success(sales_order, "获取销售订单成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("销售订单不存在".to_string())),
        Err(e) => {
            tracing::error!("查询销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询销售订单失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<CreateSalesOrderRequest>,
) -> ApiResponse<SalesOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }

    // W13：创建主单必须写请求公司上下文；缺失即拒绝（fail-closed），不静默置空。
    let company_id = match super::order_company::require_order_company(
        "销售订单",
        claims.tenant_id.as_deref(),
        &claims.sub,
    ) {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };

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

    // 新建只允许 draft / pending 两种初始态；未知值直接拒绝
    let initial_status = match body.status.as_deref() {
        None => SalesOrderStatus::DEFAULT,
        Some(raw) => match SalesOrderStatus::from_db_str(raw) {
            Some(v @ (SalesOrderStatus::Draft | SalesOrderStatus::Pending)) => v,
            _ => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!(
                    "invalid initial sales order status \"{}\", allowed: draft/pending",
                    raw
                )))
            }
        },
    };

    let result = sqlx::query_as::<_, SalesOrder>(
        only_own_schema_query!("erp", "INSERT INTO erp.sales_orders (order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, tenant_id, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULLIF(current_setting('app.tenant_id', true), '')::UUID, $12) RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"),
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
    .bind(initial_status.as_db_str())
    .bind(body.remark)
    .bind(company_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(sales_order)) => {
            if let Err(e) =
                replace_sales_order_items(&state, txn, sales_order.id, &body.items).await
            {
                tracing::error!("创建销售订单行项目失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "创建销售订单行项目失败".to_string(),
                ));
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            // D6：commit 成功后发布 typed 事件；失败入重试队列。
            // 事件租户只认 claims（不再用裸池回查：RLS 收紧后该查询取不到行，
            // 且裸池查询本身绕过了租户作用域）。
            if let (Some(ref publisher), Some(tenant_id)) = (
                &state.event_publisher,
                claims
                    .tenant_id
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok())
                    .filter(|t| !t.is_nil()),
            ) {
                let payload = SalesOrderCreatedPayload {
                    order_id: sales_order.id,
                    order_no: sales_order.order_no.clone(),
                    customer_id: Some(sales_order.customer_id),
                    customer_name: Some(sales_order.customer_name.clone()),
                    total_amount: Some(sales_order.total_amount),
                    payable_amount: Some(sales_order.payable_amount),
                    status: Some(sales_order.status.clone()),
                    created_by: Some(claims.sub.clone()),
                    tenant_id: Some(tenant_id),
                };
                match publisher.publish_sales_order_created(payload.clone()).await {
                    Ok(_) => tracing::info!(
                        "[erp] 发布 SalesOrderCreated 事件成功 - order_id={}, payable_amount={}",
                        sales_order.id,
                        sales_order.payable_amount
                    ),
                    Err(e) => {
                        tracing::warn!("[erp] 发布 SalesOrderCreated 失败: {}，入重试队列", e);
                        crate::modules::searchable_projection::push_retry_typed(
                            topems_shared_event::event::EventType::SalesOrderCreated,
                            &payload,
                        )
                        .await;
                    }
                }
            }
            crate::modules::searchable_projection::emit_after_commit(
                &state.system_pool,
                &state.event_publisher,
                "sales_order",
                sales_order.id,
            )
            .await;
            ApiResponse::success(sales_order, "创建销售订单成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::Internal("创建销售订单失败".to_string())),
        Err(e) => {
            tracing::error!("创建销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建销售订单失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<UpdateSalesOrderRequest>,
) -> ApiResponse<SalesOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }

    // 状态变更只走 /approve /ship /complete /cancel；此处仅允许原值回传
    let validated_status = match body.status.as_deref() {
        None => None,
        Some(raw) => match SalesOrderStatus::from_db_str(raw) {
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!(
                    "invalid sales order status \"{}\", allowed: {}",
                    raw,
                    SalesOrderStatus::DB_VALUES.join("/")
                )))
            }
            Some(target) => {
                // 复用请求事务作用域，避免新增裸事务计数
                let db = erp_scope_db(&state);
                let mut scope = match db.scope_with(&mut *txn).await {
                    Ok(scope) => scope,
                    Err(e) => {
                        return ApiResponse::from(TopemsError::Internal(format!(
                            "开启请求事务作用域失败: {}",
                            e
                        )))
                    }
                };
                let current: Option<String> = sqlx::query_scalar(only_own_schema_query!(
                    "erp",
                    "SELECT status FROM erp.sales_orders WHERE id = $1 AND deleted_at IS NULL AND status IN ('draft','pending','approved','shipped','completed','cancelled')"
                ))
                .bind(id)
                .fetch_optional(&mut scope)
                .await
                .unwrap_or(None);
                match current {
                    None => {
                        return ApiResponse::from(TopemsError::ResourceNotFound(
                            "销售订单不存在".to_string(),
                        ))
                    }
                    Some(cur) if cur != target.as_db_str() => {
                        return ApiResponse::from(TopemsError::ValidationFailed(format!(
                            "sales order status transition {} -> {} is not allowed here; use dedicated endpoints",
                            cur,
                            target.as_db_str()
                        )))
                    }
                    Some(_) => Some(target.as_db_str()),
                }
            }
        },
    };

    let result = sqlx::query_as::<_, SalesOrder>(
        only_own_schema_query!("erp", "UPDATE erp.sales_orders SET customer_id = COALESCE($1, customer_id), delivery_date = COALESCE($2, delivery_date), total_amount = COALESCE($3, total_amount), tax_amount = COALESCE($4, tax_amount), discount_amount = COALESCE($5, discount_amount), payable_amount = COALESCE($6, payable_amount), status = COALESCE($7, status), remark = COALESCE($8, remark), updated_at = NOW() WHERE id = $9 AND deleted_at IS NULL AND status IN ('draft','pending','approved','shipped','completed','cancelled') RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"),
    )
    .bind(body.customer_id)
    .bind(body.delivery_date)
    .bind(dec(body.total_amount))
    .bind(dec(body.tax_amount))
    .bind(dec(body.discount_amount))
    .bind(dec(body.payable_amount))
    .bind(validated_status)
    .bind(body.remark)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(sales_order)) => {
            if let Err(e) =
                replace_sales_order_items(&state, txn, sales_order.id, &body.items).await
            {
                tracing::error!("更新销售订单行项目失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "更新销售订单行项目失败".to_string(),
                ));
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            crate::modules::searchable_projection::emit_after_commit(
                &state.system_pool,
                &state.event_publisher,
                "sales_order",
                sales_order.id,
            )
            .await;
            ApiResponse::success(sales_order, "更新销售订单成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("销售订单不存在".to_string())),
        Err(e) => {
            tracing::error!("更新销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新销售订单失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.sales_orders SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            crate::modules::searchable_projection::emit_after_commit(
                &state.system_pool,
                &state.event_publisher,
                "sales_order",
                id,
            )
            .await;
            ApiResponse::success("删除成功".to_string(), "删除销售订单成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("销售订单不存在".to_string())),
        Err(e) => {
            tracing::error!("删除销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除销售订单失败".to_string()))
        }
    }
}

async fn update_sales_order_status(
    state: ApiState,
    claims: Claims,
    id: Uuid,
    status: SalesOrderStatus,
    success_message: &'static str,
    error_message: &'static str,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> ApiResponse<SalesOrder> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }

    let result = sqlx::query_as::<_, SalesOrder>(
        only_own_schema_query!("erp", "UPDATE erp.sales_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL AND status = ANY($3) RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"),
    )
    .bind(status.as_db_str())
    .bind(id)
    .bind(status.allowed_from())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(sales_order)) => ApiResponse::success(sales_order, success_message),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("销售订单不存在".to_string())),
        Err(e) => {
            tracing::error!("{}: {}", error_message, e);
            ApiResponse::from(TopemsError::internal("查询销售订单失败", e))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SalesOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let db = state.system_pool.clone();
    let publisher = state.event_publisher.clone();
    let approved_by = claims.sub.clone();
    let resp = update_sales_order_status(
        state,
        claims,
        id,
        SalesOrderStatus::Approved,
        "销售订单审批成功",
        "审批销售订单失败",
        txn,
    )
    .await;
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
        }
    }
    crate::modules::searchable_projection::emit_after_commit(&db, &publisher, "sales_order", id)
        .await;
    // D6：commit 成功后发布 SalesOrderApproved；失败入重试队列。
    if let Some(ref publisher) = publisher {
        if let Ok(Some(row)) = sqlx::query(
            "SELECT id, order_no, customer_id, customer_name, total_amount, payable_amount, tenant_id
             FROM erp.sales_orders WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&db)
        .await
        {
            let payload = SalesOrderApprovedPayload {
                order_id: row.try_get("id").unwrap_or(id),
                order_no: row.try_get("order_no").unwrap_or_default(),
                customer_id: row.try_get("customer_id").ok(),
                customer_name: row.try_get("customer_name").ok(),
                total_amount: row.try_get("total_amount").ok(),
                payable_amount: row.try_get("payable_amount").ok(),
                approved_by: Some(approved_by),
                approved_at: Some(Utc::now()),
                tenant_id: row.try_get("tenant_id").ok(),
            };
            match publisher.publish_sales_order_approved(payload.clone()).await {
                Ok(_) => tracing::info!("[erp] 发布 SalesOrderApproved 成功 order_id={}", id),
                Err(e) => {
                    tracing::warn!("[erp] 发布 SalesOrderApproved 失败: {}，入重试队列", e);
                    crate::modules::searchable_projection::push_retry_typed(
                        topems_shared_event::event::EventType::SalesOrderApproved,
                        &payload,
                    )
                    .await;
                }
            }
        }
    }
    resp
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SalesOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let db = state.system_pool.clone();
    let publisher = state.event_publisher.clone();
    let resp = update_sales_order_status(
        state,
        claims,
        id,
        SalesOrderStatus::Shipped,
        "销售订单发货成功",
        "销售订单发货失败",
        txn,
    )
    .await;
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
        }
    }
    crate::modules::searchable_projection::emit_after_commit(&db, &publisher, "sales_order", id)
        .await;
    resp
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SalesOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let db = state.system_pool.clone();
    let publisher = state.event_publisher.clone();
    let resp = update_sales_order_status(
        state,
        claims,
        id,
        SalesOrderStatus::Completed,
        "销售订单完成成功",
        "完成销售订单失败",
        txn,
    )
    .await;
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
        }
    }
    crate::modules::searchable_projection::emit_after_commit(&db, &publisher, "sales_order", id)
        .await;
    resp
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SalesOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let db = state.system_pool.clone();
    let publisher = state.event_publisher.clone();
    let resp = update_sales_order_status(
        state,
        claims,
        id,
        SalesOrderStatus::Cancelled,
        "销售订单取消成功",
        "取消销售订单失败",
        txn,
    )
    .await;
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
        }
    }
    crate::modules::searchable_projection::emit_after_commit(&db, &publisher, "sales_order", id)
        .await;
    resp
}

// ============ #27: 批量/统计端点 ============

#[derive(Debug, Deserialize, utoipa::ToSchema)]
struct BatchCreateOrdersRequest {
    orders: Vec<CreateSalesOrderRequest>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
struct BatchUpdateOrderItem {
    id: Uuid,
    payload: UpdateSalesOrderRequest,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
struct BatchUpdateOrdersRequest {
    updates: Vec<BatchUpdateOrderItem>,
}

#[derive(Debug, Deserialize)]
pub struct BatchIdsRequest {
    ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct BatchShipRequest {
    ids: Vec<Uuid>,
    ship_date: Option<chrono::DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct BatchCancelRequest {
    ids: Vec<Uuid>,
    reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SalesOrderStatsResponse {
    total: i64,
    by_status: Vec<StatusCount>,
    by_customer: Vec<CustomerOrderCount>,
    pending_total_amount: f64,
    shipped_total_amount: f64,
    completed_total_amount: f64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct StatusCount {
    status: String,
    count: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct CustomerOrderCount {
    customer_id: Uuid,
    customer_name: String,
    total: i64,
}

const SALES_ORDER_SELECT_COLS: &str = "id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at";

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/sales-orders/batch",
    tag = "ERP",
    request_body = BatchCreateOrdersRequest,
    responses(
        (status = 200, description = "OK", body = Vec<SalesOrder>),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
async fn batch_create_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<BatchCreateOrdersRequest>,
) -> ApiResponse<Vec<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    // W13：批量创建同样要求公司上下文；缺失整批拒绝（fail-closed）。
    let company_id = match super::order_company::require_order_company(
        "销售订单",
        claims.tenant_id.as_deref(),
        &claims.sub,
    ) {
        Ok(id) => id,
        Err(e) => return ApiResponse::from(e),
    };
    let mut created = Vec::new();
    for req in &body.orders {
        let customer_name: String = sqlx::query_scalar(only_own_schema_query!(
            "erp",
            "SELECT name FROM erp.customers WHERE id = $1"
        ))
        .bind(req.customer_id)
        .fetch_optional(&mut **txn)
        .await
        .ok()
        .flatten()
        .unwrap_or_default();
        let order_date = req.order_date.unwrap_or_else(Utc::now);
        let amounts = calculate_sales_order_amounts(
            req.total_amount,
            req.tax_amount,
            req.discount_amount,
            req.payable_amount,
        );
        let initial_status = match req.status.as_deref() {
            None => SalesOrderStatus::Draft,
            Some(raw) => match SalesOrderStatus::from_db_str(raw) {
                Some(v @ (SalesOrderStatus::Draft | SalesOrderStatus::Pending)) => v,
                _ => {
                    return ApiResponse::from(TopemsError::ValidationFailed(format!(
                        "invalid initial sales order status \"{}\", allowed: draft/pending",
                        raw
                    )))
                }
            },
        };
        let result = sqlx::query_as::<_, SalesOrder>(only_own_schema_query!(
            "erp",
            "INSERT INTO erp.sales_orders (order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, tenant_id, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULLIF(current_setting('app.tenant_id', true), '')::UUID, $12) RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"
        ))
        .bind(&req.order_no).bind(req.customer_id).bind(&customer_name).bind(order_date)
        .bind(req.delivery_date).bind(dec_owned(amounts.total_amount)).bind(dec_owned(amounts.tax_amount))
        .bind(dec_owned(amounts.discount_amount)).bind(dec_owned(amounts.payable_amount))
        .bind(initial_status.as_db_str()).bind(&req.remark).bind(company_id)
        .fetch_optional(&mut **txn).await;
        match result {
            Ok(Some(o)) => {
                if let Err(e) = replace_sales_order_items(&state, txn, o.id, &req.items).await {
                    tracing::error!("批量创建销售订单行项目失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "批量创建销售订单行项目失败".to_string(),
                    ));
                }
                created.push(o);
            }
            Ok(None) => {}
            Err(e) => {
                tracing::error!("批量创建销售订单失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "批量创建销售订单失败".to_string(),
                ));
            }
        }
    }
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }
    for o in &created {
        crate::modules::searchable_projection::emit_after_commit(
            &state.system_pool,
            &state.event_publisher,
            "sales_order",
            o.id,
        )
        .await;
    }
    ApiResponse::success(created, "批量创建销售订单成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:write"])),
    path = "/sales-orders/batch",
    tag = "ERP",
    request_body = BatchUpdateOrdersRequest,
    responses(
        (status = 200, description = "OK", body = Vec<SalesOrder>),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
async fn batch_update_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<BatchUpdateOrdersRequest>,
) -> ApiResponse<Vec<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    let mut updated = Vec::new();
    for item in &body.updates {
        let result = sqlx::query_as::<_, SalesOrder>(only_own_schema_query!(
            "erp",
            "UPDATE erp.sales_orders SET customer_id = COALESCE($1, customer_id), delivery_date = COALESCE($2, delivery_date), total_amount = COALESCE($3, total_amount), tax_amount = COALESCE($4, tax_amount), discount_amount = COALESCE($5, discount_amount), payable_amount = COALESCE($6, payable_amount), status = COALESCE($7, status), remark = COALESCE($8, remark), updated_at = NOW() WHERE id = $9 AND deleted_at IS NULL RETURNING id, order_no, customer_id, customer_name, order_date, delivery_date, total_amount, tax_amount, discount_amount, payable_amount, status, remark, created_at, updated_at"
        ))
        .bind(item.payload.customer_id).bind(item.payload.delivery_date).bind(dec(item.payload.total_amount))
        .bind(dec(item.payload.tax_amount)).bind(dec(item.payload.discount_amount)).bind(dec(item.payload.payable_amount))
        .bind(&item.payload.status).bind(&item.payload.remark).bind(item.id)
        .fetch_optional(&mut **txn).await;
        match result {
            Ok(Some(o)) => {
                if let Err(e) =
                    replace_sales_order_items(&state, txn, o.id, &item.payload.items).await
                {
                    tracing::error!("批量更新销售订单行项目失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "批量更新销售订单行项目失败".to_string(),
                    ));
                }
                updated.push(o);
            }
            Ok(None) => {}
            Err(e) => {
                tracing::error!("批量更新销售订单失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "批量更新销售订单失败".to_string(),
                ));
            }
        }
    }
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
        }
    }
    for o in &updated {
        crate::modules::searchable_projection::emit_after_commit(
            &state.system_pool,
            &state.event_publisher,
            "sales_order",
            o.id,
        )
        .await;
    }
    ApiResponse::success(updated, "批量更新销售订单成功")
}

async fn batch_update_status(
    _state: &ApiState,
    _claims: &Claims,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ids: &[Uuid],
    status: SalesOrderStatus,
) -> Result<Vec<SalesOrder>, TopemsError> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let allowed_param = format!("${}", ids.len() + 2);
    let placeholders: Vec<String> = (2..=ids.len() + 1).map(|i| format!("${}", i)).collect();
    let sql = format!(
        "UPDATE erp.sales_orders SET status = $1, updated_at = NOW() WHERE id = ANY(array[{}]::uuid[]) AND deleted_at IS NULL AND status = ANY({}) RETURNING {}",
        placeholders.join(","),
        allowed_param,
        SALES_ORDER_SELECT_COLS
    );
    let mut query = sqlx::query_as::<_, SalesOrder>(sqlx::AssertSqlSafe(sql));
    query = query.bind(status.as_db_str());
    for id in ids {
        query = query.bind(id);
    }
    query = query.bind(status.allowed_from());
    let orders = query
        .fetch_all(&mut **txn)
        .await
        .map_err(|e| TopemsError::DatabaseQuery(e.to_string()))?;
    Ok(orders)
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/sales-orders/batch/approve",
    responses(
        (status = 200, description = "batch_approve_sales_orders OK")
    ),
    tag = "ERP/sales_order"
)]

pub async fn batch_approve_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<BatchIdsRequest>,
) -> ApiResponse<Vec<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    match batch_update_status(&state, &claims, txn, &body.ids, SalesOrderStatus::Approved).await {
        Ok(orders) => {
            if let Some(t) = guard.take() {
                let _ = t.commit().await;
            }
            for o in &orders {
                crate::modules::searchable_projection::emit_after_commit(
                    &state.system_pool,
                    &state.event_publisher,
                    "sales_order",
                    o.id,
                )
                .await;
            }
            ApiResponse::success(orders, "批量审批成功")
        }
        Err(e) => {
            tracing::error!("批量审批销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("批量审批销售订单失败".to_string()))
        }
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/sales-orders/batch/ship",
    responses(
        (status = 200, description = "batch_ship_sales_orders OK")
    ),
    tag = "ERP/sales_order"
)]

pub async fn batch_ship_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<BatchShipRequest>,
) -> ApiResponse<Vec<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    match batch_update_status(&state, &claims, txn, &body.ids, SalesOrderStatus::Shipped).await {
        Ok(orders) => {
            if let Some(t) = guard.take() {
                let _ = t.commit().await;
            }
            for o in &orders {
                crate::modules::searchable_projection::emit_after_commit(
                    &state.system_pool,
                    &state.event_publisher,
                    "sales_order",
                    o.id,
                )
                .await;
            }
            ApiResponse::success(orders, "批量发货成功")
        }
        Err(e) => {
            tracing::error!("批量发货销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("批量发货销售订单失败".to_string()))
        }
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/sales-orders/batch/complete",
    responses(
        (status = 200, description = "batch_complete_sales_orders OK")
    ),
    tag = "ERP/sales_order"
)]

pub async fn batch_complete_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<BatchIdsRequest>,
) -> ApiResponse<Vec<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    match batch_update_status(&state, &claims, txn, &body.ids, SalesOrderStatus::Completed).await {
        Ok(orders) => {
            if let Some(t) = guard.take() {
                let _ = t.commit().await;
            }
            for o in &orders {
                crate::modules::searchable_projection::emit_after_commit(
                    &state.system_pool,
                    &state.event_publisher,
                    "sales_order",
                    o.id,
                )
                .await;
            }
            ApiResponse::success(orders, "批量完成成功")
        }
        Err(e) => {
            tracing::error!("批量完成销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("批量完成销售订单失败".to_string()))
        }
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/sales-orders/batch/cancel",
    responses(
        (status = 200, description = "batch_cancel_sales_orders OK")
    ),
    tag = "ERP/sales_order"
)]

pub async fn batch_cancel_sales_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<BatchCancelRequest>,
) -> ApiResponse<Vec<SalesOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }
    match batch_update_status(&state, &claims, txn, &body.ids, SalesOrderStatus::Cancelled).await {
        Ok(orders) => {
            if let Some(t) = guard.take() {
                let _ = t.commit().await;
            }
            for o in &orders {
                crate::modules::searchable_projection::emit_after_commit(
                    &state.system_pool,
                    &state.event_publisher,
                    "sales_order",
                    o.id,
                )
                .await;
            }
            ApiResponse::success(orders, "批量取消成功")
        }
        Err(e) => {
            tracing::error!("批量取消销售订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("批量取消销售订单失败".to_string()))
        }
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/sales-orders/stats",
    responses(
        (status = 200, description = "get_sales_order_stats OK")
    ),
    tag = "ERP/sales_order"
)]

pub async fn get_sales_order_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SalesOrderStatsResponse> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e.0;
    }
    let total: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.sales_orders WHERE deleted_at IS NULL AND status IN ('draft','pending','approved','shipped','completed','cancelled')"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);
    let by_status: Vec<StatusCount> = sqlx::query_as(only_own_schema_query!("erp", "SELECT status, COUNT(*) AS count FROM erp.sales_orders WHERE deleted_at IS NULL AND status IN ('draft','pending','approved','shipped','completed','cancelled') GROUP BY 1 ORDER BY count DESC")).fetch_all(&mut **txn).await.unwrap_or_default();
    let by_customer: Vec<CustomerOrderCount> = sqlx::query_as(only_own_schema_query!("erp", "SELECT customer_id, customer_name, COUNT(*) AS total FROM erp.sales_orders WHERE deleted_at IS NULL GROUP BY customer_id, customer_name ORDER BY total DESC LIMIT 10")).fetch_all(&mut **txn).await.unwrap_or_default();
    let pending_total_amount: f64 = sqlx::query_scalar(only_own_schema_query!("erp", "SELECT COALESCE(SUM(total_amount), 0) FROM erp.sales_orders WHERE deleted_at IS NULL AND status = ANY($1)"))
        .bind(&[SalesOrderStatus::Pending.as_db_str(), SalesOrderStatus::Draft.as_db_str()][..])
        .fetch_one(&mut **txn)
        .await
        .unwrap_or(0.0);
    let shipped_total_amount: f64 = sqlx::query_scalar(only_own_schema_query!("erp", "SELECT COALESCE(SUM(total_amount), 0) FROM erp.sales_orders WHERE deleted_at IS NULL AND status = ANY($1)"))
        .bind(&[SalesOrderStatus::Shipped.as_db_str()][..])
        .fetch_one(&mut **txn)
        .await
        .unwrap_or(0.0);
    let completed_total_amount: f64 = sqlx::query_scalar(only_own_schema_query!("erp", "SELECT COALESCE(SUM(total_amount), 0) FROM erp.sales_orders WHERE deleted_at IS NULL AND status = ANY($1)"))
        .bind(&[SalesOrderStatus::Completed.as_db_str()][..])
        .fetch_one(&mut **txn)
        .await
        .unwrap_or(0.0);
    ApiResponse::success(
        SalesOrderStatsResponse {
            total,
            by_status,
            by_customer,
            pending_total_amount,
            shipped_total_amount,
            completed_total_amount,
        },
        "获取销售订单统计成功",
    )
}
