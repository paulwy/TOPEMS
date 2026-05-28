use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    Supplier, SupplierEvaluation, PurchaseOrder,
    CreateSupplierRequest, UpdateSupplierRequest,
    CreateSupplierEvaluationRequest, UpdateSupplierEvaluationRequest,
    CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest,
};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_supplier_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/suppliers", get(list_suppliers).post(create_supplier))
        .route(
            "/api/v1/suppliers/{id}",
            get(get_supplier).put(update_supplier).delete(delete_supplier),
        )
        .with_state(state);

    Ok(app)
}

pub async fn create_evaluation_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/supplier-evaluations", get(list_evaluations).post(create_evaluation))
        .route(
            "/api/v1/supplier-evaluations/{id}",
            get(get_evaluation).put(update_evaluation).delete(delete_evaluation),
        )
        .with_state(state);

    Ok(app)
}

pub async fn create_purchase_order_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/purchase-orders", get(list_purchase_orders).post(create_purchase_order))
        .route(
            "/api/v1/purchase-orders/{id}",
            get(get_purchase_order).put(update_purchase_order).delete(delete_purchase_order),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Supplier Handlers ====================

async fn list_suppliers(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        FROM srm.suppliers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR supplier_no ILIKE $1)
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
        Ok(suppliers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM srm.suppliers
                WHERE ($1::text IS NULL OR name ILIKE $1 OR supplier_no ILIKE $1)
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
                    "suppliers": suppliers,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取供应商列表失败"))
        }
    }
}

async fn create_supplier(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        INSERT INTO srm.suppliers (id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.supplier_no)
    .bind(&req.name)
    .bind(&req.legal_name)
    .bind(&req.category)
    .bind(&req.status)
    .bind(&req.tax_id)
    .bind(&req.address)
    .bind(&req.contact_person)
    .bind(&req.phone)
    .bind(&req.email)
    .bind(&req.website)
    .bind(&req.credit_rating)
    .bind(&req.risk_level)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(supplier) => Json(ApiResponse::success(supplier, "供应商创建成功")),
        Err(e) => {
            tracing::error!("创建供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "供应商创建失败"))
        }
    }
}

async fn get_supplier(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Supplier>> {
    let result = sqlx::query_as::<_, Supplier>(
        r#"
        SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        FROM srm.suppliers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(supplier)) => Json(ApiResponse::success(supplier, "获取供应商成功")),
        Ok(None) => Json(ApiResponse::<Supplier>::error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("获取供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "获取供应商失败"))
        }
    }
}

async fn update_supplier(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let existing = sqlx::query_as::<_, Supplier>(
        "SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM srm.suppliers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<Supplier>::error(404, "供应商不存在")),
        Err(e) => return Json(ApiResponse::<Supplier>::error(500, &format!("查询供应商失败: {}", e))),
    };

    let supplier_no = req.supplier_no.unwrap_or(existing.supplier_no);
    let name = req.name.unwrap_or(existing.name);
    let legal_name = req.legal_name.or(existing.legal_name);
    let category = req.category.unwrap_or(existing.category);
    let status = req.status.unwrap_or(existing.status);
    let tax_id = req.tax_id.or(existing.tax_id);
    let address = req.address.or(existing.address);
    let contact_person = req.contact_person.or(existing.contact_person);
    let phone = req.phone.or(existing.phone);
    let email = req.email.or(existing.email);
    let website = req.website.or(existing.website);
    let credit_rating = req.credit_rating.or(existing.credit_rating);
    let risk_level = req.risk_level.unwrap_or(existing.risk_level);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        UPDATE srm.suppliers SET
            supplier_no = $2, name = $3, legal_name = $4, category = $5, status = $6, tax_id = $7, address = $8, contact_person = $9, phone = $10, email = $11, website = $12, credit_rating = $13, risk_level = $14, updated_at = $15
        WHERE id = $1
        RETURNING id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_no)
    .bind(name)
    .bind(legal_name)
    .bind(category)
    .bind(status)
    .bind(tax_id)
    .bind(address)
    .bind(contact_person)
    .bind(phone)
    .bind(email)
    .bind(website)
    .bind(credit_rating)
    .bind(risk_level)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(supplier) => Json(ApiResponse::success(supplier, "供应商更新成功")),
        Err(e) => {
            tracing::error!("更新供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "供应商更新失败"))
        }
    }
}

async fn delete_supplier(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM srm.suppliers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "供应商删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商删除失败"))
        }
    }
}

// ==================== Supplier Evaluation Handlers ====================

async fn list_evaluations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations
        WHERE ($1::text IS NULL OR evaluation_no ILIKE $1)
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
        Ok(evaluations) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM srm.supplier_evaluations
                WHERE ($1::text IS NULL OR evaluation_no ILIKE $1)
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
                    "evaluations": evaluations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商评估列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商评估列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取供应商评估列表失败"))
        }
    }
}

async fn create_evaluation(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let supplier_uuid = Uuid::parse_str(&req.supplier_id).unwrap_or_else(|_| Uuid::new_v4());

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        INSERT INTO srm.supplier_evaluations (id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_uuid)
    .bind(&req.evaluation_no)
    .bind(now)
    .bind(&req.evaluator)
    .bind(req.overall_score)
    .bind(req.quality_score)
    .bind(req.delivery_score)
    .bind(req.service_score)
    .bind(req.price_score)
    .bind(&req.comments)
    .bind(&req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(evaluation) => Json(ApiResponse::success(evaluation, "供应商评估创建成功")),
        Err(e) => {
            tracing::error!("创建供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(500, "供应商评估创建失败"))
        }
    }
}

async fn get_evaluation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(evaluation)) => Json(ApiResponse::success(evaluation, "获取供应商评估成功")),
        Ok(None) => Json(ApiResponse::<SupplierEvaluation>::error(404, "供应商评估不存在")),
        Err(e) => {
            tracing::error!("获取供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(500, "获取供应商评估失败"))
        }
    }
}

async fn update_evaluation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let existing = sqlx::query_as::<_, SupplierEvaluation>(
        "SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at FROM srm.supplier_evaluations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::<SupplierEvaluation>::error(404, "供应商评估不存在")),
        Err(e) => return Json(ApiResponse::<SupplierEvaluation>::error(500, &format!("查询供应商评估失败: {}", e))),
    };

    let supplier_id = req.supplier_id
        .map(|v| Uuid::parse_str(&v).unwrap_or(existing.supplier_id))
        .unwrap_or(existing.supplier_id);
    let evaluation_no = req.evaluation_no.unwrap_or(existing.evaluation_no);
    let evaluator = req.evaluator.or(existing.evaluator);
    let overall_score = req.overall_score.or(existing.overall_score);
    let quality_score = req.quality_score.or(existing.quality_score);
    let delivery_score = req.delivery_score.or(existing.delivery_score);
    let service_score = req.service_score.or(existing.service_score);
    let price_score = req.price_score.or(existing.price_score);
    let comments = req.comments.or(existing.comments);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        UPDATE srm.supplier_evaluations SET
            supplier_id = $2, evaluation_no = $3, evaluator = $4, overall_score = $5, quality_score = $6, delivery_score = $7, service_score = $8, price_score = $9, comments = $10, status = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_id)
    .bind(evaluation_no)
    .bind(evaluator)
    .bind(overall_score)
    .bind(quality_score)
    .bind(delivery_score)
    .bind(service_score)
    .bind(price_score)
    .bind(comments)
    .bind(status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(evaluation) => Json(ApiResponse::success(evaluation, "供应商评估更新成功")),
        Err(e) => {
            tracing::error!("更新供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(500, "供应商评估更新失败"))
        }
    }
}

async fn delete_evaluation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM srm.supplier_evaluations WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "供应商评估删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商评估不存在")),
        Err(e) => {
            tracing::error!("删除供应商评估失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商评估删除失败"))
        }
    }
}

// ==================== Purchase Order Handlers ====================

async fn list_purchase_orders(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        FROM srm.purchase_orders
        WHERE ($1::text IS NULL OR po_no ILIKE $1)
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
                SELECT COUNT(*) FROM srm.purchase_orders
                WHERE ($1::text IS NULL OR po_no ILIKE $1)
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
            Json(ApiResponse::<serde_json::Value>::error(500, "获取采购订单列表失败"))
        }
    }
}

async fn create_purchase_order(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let supplier_uuid = Uuid::parse_str(&req.supplier_id).unwrap_or_else(|_| Uuid::new_v4());

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        INSERT INTO srm.purchase_orders (id, po_no, supplier_id, order_date, total_amount, currency, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.po_no)
    .bind(supplier_uuid)
    .bind(now)
    .bind(req.total_amount)
    .bind(&req.currency)
    .bind(&req.status)
    .bind(&req.remarks)
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
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        FROM srm.purchase_orders WHERE id = $1
        "#,
    )
    .bind(id)
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
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let existing = sqlx::query_as::<_, PurchaseOrder>(
        "SELECT id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at FROM srm.purchase_orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(ApiResponse::<PurchaseOrder>::error(404, "采购订单不存在")),
        Err(e) => return Json(ApiResponse::<PurchaseOrder>::error(500, &format!("查询采购订单失败: {}", e))),
    };

    let po_no = req.po_no.unwrap_or(existing.po_no);
    let supplier_id = req.supplier_id
        .map(|v| Uuid::parse_str(&v).unwrap_or(existing.supplier_id))
        .unwrap_or(existing.supplier_id);
    let expected_date = req.expected_date.or(existing.expected_date);
    let actual_date = req.actual_date.or(existing.actual_date);
    let total_amount = req.total_amount.or(existing.total_amount);
    let currency = req.currency.unwrap_or(existing.currency);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        UPDATE srm.purchase_orders SET
            po_no = $2, supplier_id = $3, expected_date = $4, actual_date = $5, total_amount = $6, currency = $7, status = $8, remarks = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, po_no, supplier_id, order_date, expected_date, actual_date, total_amount, currency, status, remarks, created_by, created_at, updated_at
        "#,
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
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM srm.purchase_orders WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "采购订单删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "采购订单不存在")),
        Err(e) => {
            tracing::error!("删除采购订单失败: {}", e);
            Json(ApiResponse::<String>::error(500, "采购订单删除失败"))
        }
    }
}
