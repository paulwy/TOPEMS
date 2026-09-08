use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::purchase_order::{
    CreatePurchaseOrderRequest, PurchaseOrder, UpdatePurchaseOrderRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
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
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
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

async fn list_purchase_orders(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PurchaseOrderQueryParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
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
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR po_no ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR supplier_id = $4)
        ORDER BY order_date DESC
        LIMIT $5 OFFSET $6
        "#, "srm"),
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "srm",
                r#"
                SELECT COUNT(*) FROM srm.purchase_orders
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR po_no ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR supplier_id = $4)
                "#,
                "srm"
            ))
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "purchase_orders": orders,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取采购订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取采购订单列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取采购订单列表失败",
            ))
        }
    }
}

async fn create_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    if req.po_no.is_empty() {
        return Json(ApiResponse::<PurchaseOrder>::error(
            400,
            "采购订单编号不能为空",
        ));
    }

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<PurchaseOrder>::error(400, "供应商ID格式错误"));
        }
    };

    let supplier_exists = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'", "srm"),
    )
    .bind(supplier_id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<PurchaseOrder>::error(
            400,
            "供应商不存在或已删除",
        ));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.purchase_orders WHERE deleted_at IS NULL AND po_no = $1 AND tenant_id = $2", "srm"),
    )
    .bind(&req.po_no)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<PurchaseOrder>::error(
            400,
            "采购订单编号已存在",
        ));
    }

    if let Some(amount) = req.total_amount {
        if amount < 0.0 {
            return Json(ApiResponse::<PurchaseOrder>::error(
                400,
                "订单金额不能为负数",
            ));
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(order) => Json(ApiResponse::success(order, "采购订单创建成功")),
        Err(e) => {
            tracing::error!("创建采购订单失败: {}", e);
            Json(ApiResponse::<PurchaseOrder>::error(500, "采购订单创建失败"))
        }
    }
}

async fn get_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        FROM srm.purchase_orders WHERE id = $1 AND tenant_id = $2
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取采购订单成功")),
        Ok(None) => Json(ApiResponse::<PurchaseOrder>::error(404, "采购订单不存在")),
        Err(e) => {
            tracing::error!("获取采购订单失败: {}", e);
            Json(ApiResponse::<PurchaseOrder>::error(500, "获取采购订单失败"))
        }
    }
}

async fn update_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("srm", "SELECT id, tenant_id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at FROM srm.purchase_orders WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2", "srm"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(ApiResponse::<PurchaseOrder>::error(404, "采购订单不存在")),
        Err(e) => {
            return Json(ApiResponse::<PurchaseOrder>::error(
                500,
                &format!("查询采购订单失败: {}", e),
            ))
        }
    };

    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid_val = match Uuid::parse_str(supplier_id_str) {
            Ok(uuid) => uuid,
            Err(_) => return Json(ApiResponse::<PurchaseOrder>::error(400, "供应商ID格式错误")),
        };

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'", "srm"),
        )
        .bind(supplier_uuid_val)
        .bind(tenant_id)
        .fetch_one(&state.db)
        .await;

        if supplier_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<PurchaseOrder>::error(
                400,
                "供应商不存在或已删除",
            ));
        }

        supplier_uuid_val
    } else {
        existing.supplier_id
    };

    if let Some(amount) = req.total_amount {
        if amount < 0.0 {
            return Json(ApiResponse::<PurchaseOrder>::error(
                400,
                "订单金额不能为负数",
            ));
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(order) => Json(ApiResponse::success(order, "采购订单更新成功")),
        Err(e) => {
            tracing::error!("更新采购订单失败: {}", e);
            Json(ApiResponse::<PurchaseOrder>::error(500, "采购订单更新失败"))
        }
    }
}

async fn delete_purchase_order(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.purchase_orders SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "采购订单删除成功")),
        Ok(_) => Json(ApiResponse::<bool>::error(404, "采购订单不存在")),
        Err(e) => {
            tracing::error!("删除采购订单失败: {}", e);
            Json(ApiResponse::<bool>::error(500, "采购订单删除失败"))
        }
    }
}
