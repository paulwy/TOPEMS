use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::Deserialize;
use std::sync::Arc;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::purchase_order::{
    CreatePurchaseOrderRequest, PurchaseOrder, UpdatePurchaseOrderRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PurchaseOrderQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
}

pub struct AppState {
    pub db: Db,
}

pub async fn create_routes(db: Db) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/purchase-orders",
            get(list_purchase_orders).post(create_purchase_order),
        )
        .route(
            "/purchase-orders/{id}",
            get(get_purchase_order)
                .put(update_purchase_order)
                .delete(delete_purchase_order),
        )
        .with_state(state);

    Ok(app)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:purchase_order:read"])),
    path = "/purchase-orders",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/purchase_order"
)]
pub async fn list_purchase_orders(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PurchaseOrderQueryParams>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let supplier_id_filter = params
        .supplier_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        FROM srm.purchase_orders
          WHERE ($1::text IS NULL OR po_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR supplier_id = $3)
        ORDER BY order_date DESC
        LIMIT $4 OFFSET $5
        "#, "srm"),
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "srm",
                r#"
                SELECT COUNT(*) FROM srm.purchase_orders
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR po_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR supplier_id = $3)
                "#,
                "srm"
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "purchase_orders": orders,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取采购订单列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取采购订单列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取采购订单列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:purchase_order:write"])),
    path = "/purchase-orders",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/purchase_order"
)]
pub async fn create_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> ApiResponse<PurchaseOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    if req.po_no.is_empty() {
        return ApiResponse::<PurchaseOrder>::bad_request("采购订单编号不能为空");
    }

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::<PurchaseOrder>::bad_request("供应商ID格式错误");
        }
    };

    let supplier_exists = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'",
        "srm"
    ))
    .bind(supplier_id)
    .fetch_one(&mut **txn)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return ApiResponse::<PurchaseOrder>::bad_request("供应商不存在或已删除");
    }

    let existing = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.purchase_orders WHERE deleted_at IS NULL AND po_no = $1",
        "srm"
    ))
    .bind(&req.po_no)
    .fetch_one(&mut **txn)
    .await;

    if existing.unwrap_or(0) > 0 {
        return ApiResponse::<PurchaseOrder>::bad_request("采购订单编号已存在");
    }

    if let Some(amount) = req.total_amount {
        if amount < Decimal::ZERO {
            return ApiResponse::<PurchaseOrder>::bad_request("订单金额不能为负数");
        }
    }

    let expected_date = req.expected_date.as_ref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.purchase_orders (id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.po_no)
    .bind(supplier_id)
    .bind(now)
    .bind(expected_date)
    .bind(None::<chrono::DateTime<Utc>>)
    .bind(req.total_amount)
    .bind(&req.currency)
    .bind(&req.status)
    .bind(&req.remarks)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(order) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(order, "采购订单创建成功")
        }
        Err(e) => {
            tracing::error!("创建采购订单失败: {}", e);
            ApiResponse::<PurchaseOrder>::server_error("采购订单创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:purchase_order:read"])),
    path = "/purchase-orders/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/purchase_order"
)]
pub async fn get_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PurchaseOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        FROM srm.purchase_orders WHERE id = $1
        "#, "srm"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => ApiResponse::success(order, "获取采购订单成功"),
        Ok(None) => ApiResponse::<PurchaseOrder>::not_found("采购订单不存在"),
        Err(e) => {
            tracing::error!("获取采购订单失败: {}", e);
            ApiResponse::<PurchaseOrder>::server_error("获取采购订单失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["srm:purchase_order:write"])),
    path = "/purchase-orders/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/purchase_order"
)]
pub async fn update_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> ApiResponse<PurchaseOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", "SELECT id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at FROM srm.purchase_orders WHERE deleted_at IS NULL AND id = $1", "srm"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return ApiResponse::<PurchaseOrder>::not_found("采购订单不存在"),
        Err(e) => {
            return ApiResponse::<PurchaseOrder>::from(TopemsError::internal("查询采购订单失败", e))
        }
    };

    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid_val = match Uuid::parse_str(supplier_id_str) {
            Ok(uuid) => uuid,
            Err(_) => return ApiResponse::<PurchaseOrder>::bad_request("供应商ID格式错误"),
        };

        let supplier_exists = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "srm",
            "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'",
            "srm"
        ))
        .bind(supplier_uuid_val)
        .fetch_one(&mut **txn)
        .await;

        if supplier_exists.unwrap_or(0) == 0 {
            return ApiResponse::<PurchaseOrder>::bad_request("供应商不存在或已删除");
        }

        supplier_uuid_val
    } else {
        existing.supplier_id
    };

    if let Some(amount) = req.total_amount {
        if amount < Decimal::ZERO {
            return ApiResponse::<PurchaseOrder>::bad_request("订单金额不能为负数");
        }
    }

    let po_no = req.po_no.unwrap_or(existing.po_no);
    let expected_date = req.expected_date.or(existing.expected_date);
    let actual_date = req.actual_date.or(existing.actual_date);
    let total_amount = req.total_amount.or(existing.total_amount);
    let currency = req.currency.unwrap_or(existing.currency);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.purchase_orders SET
            po_no = $2, supplier_id = $3, expected_date = $4, actual_date = $5, total_amount = $6, currency = $7, status = $8, remarks = $9, updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(po_no)
    .bind(supplier_id)
    .bind(expected_date)
    .bind(actual_date)
    .bind(total_amount)
    .bind(currency)
    .bind(status)
    .bind(remarks)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(order) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(order, "采购订单更新成功")
        }
        Err(e) => {
            tracing::error!("更新采购订单失败: {}", e);
            ApiResponse::<PurchaseOrder>::server_error("采购订单更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["srm:purchase_order:write"])),
    path = "/purchase-orders/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/purchase_order"
)]
pub async fn delete_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<bool> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.purchase_orders SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(true, "采购订单删除成功")
        }
        Ok(_) => ApiResponse::<bool>::not_found("采购订单不存在"),
        Err(e) => {
            tracing::error!("删除采购订单失败: {}", e);
            ApiResponse::<bool>::server_error("采购订单删除失败")
        }
    }
}
