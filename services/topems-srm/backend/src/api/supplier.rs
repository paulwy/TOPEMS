use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    Supplier, SupplierPerformance, SupplierProduct, SupplierContract,
    CreateSupplierRequest, UpdateSupplierRequest,
    AuditLog,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/suppliers", get(list_suppliers).post(create_supplier))
        .route(
            "/api/v1/suppliers/{id}",
            get(get_supplier).put(update_supplier).delete(delete_supplier),
        )
        .route("/api/v1/suppliers/{id}/products", get(get_supplier_products))
        .route("/api/v1/suppliers/{id}/contracts", get(get_supplier_contracts))
        .route("/api/v1/suppliers/{id}/performance", get(get_supplier_performance))
        .with_state(state);

    Ok(app)
}

// ==================== Supplier Handlers ====================

async fn list_suppliers(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let category_filter = params.category.clone();

    let sort_by = params.sort_by.clone().unwrap_or_else(|| "created_at".to_string());
    let sort_order = params.sort_order.clone().unwrap_or_else(|| "DESC".to_string());
    let order_clause = if sort_order == "ASC" { "ASC" } else { "DESC" };

    let sort_field = match sort_by.as_str() {
        "name" => "name",
        "supplier_no" => "supplier_no",
        "status" => "status",
        "category" => "category",
        "created_at" => "created_at",
        "updated_at" => "updated_at",
        _ => "created_at",
    };

    let query = format!(
        r#"
        SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        FROM srm.suppliers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR supplier_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR category = $3)
        ORDER BY {} {}
        LIMIT $4 OFFSET $5
        "#,
        sort_field, order_clause
    );

    let result = sqlx::query_as::<_, Supplier>(&query)
        .bind(&search_pattern)
        .bind(&status_filter)
        .bind(&category_filter)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

    match result {
        Ok(suppliers) => {
            let count_query = format!(
                r#"
                SELECT COUNT(*) FROM srm.suppliers
                WHERE ($1::text IS NULL OR name ILIKE $1 OR supplier_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR category = $3)
                "#,
            );

            let count_result = sqlx::query_scalar::<_, i64>(&count_query)
                .bind(&search_pattern)
                .bind(&status_filter)
                .bind(&category_filter)
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
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 数据验证
    if req.supplier_no.is_empty() || req.name.is_empty() {
        return Json(ApiResponse::<Supplier>::error(400, "供应商编号和名称不能为空"));
    }

    // 检查供应商编号是否已存在
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.suppliers WHERE supplier_no = $1"
    )
    .bind(&req.supplier_no)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<Supplier>::error(400, "供应商编号已存在"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        INSERT INTO srm.suppliers (id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(supplier) => {
            // 记录审计日志
            record_audit_log(
                &state.db,
                "suppliers",
                id,
                "create",
                None,
                Some(serde_json::to_value(&supplier).ok()),
                user_id,
            ).await;

            Json(ApiResponse::success(supplier, "供应商创建成功"))
        }
        Err(e) => {
            tracing::error!("创建供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "供应商创建失败"))
        }
    }
}

async fn get_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

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
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

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

    let old_values = serde_json::to_value(&existing).ok();

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
    let user_id = Uuid::parse_str(&claims.sub).ok();

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
        Ok(supplier) => {
            // 记录审计日志
            record_audit_log(
                &state.db,
                "suppliers",
                id,
                "update",
                Some(old_values),
                Some(serde_json::to_value(&supplier).ok()),
                user_id,
            ).await;

            Json(ApiResponse::success(supplier, "供应商更新成功"))
        }
        Err(e) => {
            tracing::error!("更新供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "供应商更新失败"))
        }
    }
}

async fn delete_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 获取供应商信息用于审计日志
    let existing = sqlx::query_as::<_, Supplier>(
        "SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM srm.suppliers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let old_values = existing.ok().flatten().and_then(|s| serde_json::to_value(&s).ok());
    let user_id = Uuid::parse_str(&claims.sub).ok();

    // 软删除：更新状态为deleted
    let result = sqlx::query("UPDATE srm.suppliers SET status = 'deleted', updated_at = $2 WHERE id = $1")
        .bind(id)
        .bind(Utc::now())
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // 记录审计日志
            record_audit_log(
                &state.db,
                "suppliers",
                id,
                "delete",
                Some(old_values),
                None,
                user_id,
            ).await;

            Json(ApiResponse::success("".to_string(), "供应商删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商删除失败"))
        }
    }
}

// ==================== Supplier Products Handler ====================

async fn get_supplier_products(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<SupplierProduct>>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SupplierProduct>(
        r#"
        SELECT id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        FROM srm.supplier_products
        WHERE supplier_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(products) => Json(ApiResponse::success(products, "获取供应商产品列表成功")),
        Err(e) => {
            tracing::error!("获取供应商产品列表失败: {}", e);
            Json(ApiResponse::<Vec<SupplierProduct>>::error(500, "获取供应商产品列表失败"))
        }
    }
}

// ==================== Supplier Contracts Handler ====================

async fn get_supplier_contracts(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<SupplierContract>>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SupplierContract>(
        r#"
        SELECT id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        FROM srm.supplier_contracts
        WHERE supplier_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contracts) => Json(ApiResponse::success(contracts, "获取供应商合同列表成功")),
        Err(e) => {
            tracing::error!("获取供应商合同列表失败: {}", e);
            Json(ApiResponse::<Vec<SupplierContract>>::error(500, "获取供应商合同列表失败"))
        }
    }
}

// ==================== Supplier Performance Handler ====================

async fn get_supplier_performance(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierPerformance>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 获取供应商基本信息
    let supplier = sqlx::query_as::<_, Supplier>(
        "SELECT id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM srm.suppliers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let supplier = match supplier {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<SupplierPerformance>::error(404, "供应商不存在")),
        Err(_) => return Json(ApiResponse::<SupplierPerformance>::error(500, "查询供应商失败")),
    };

    // 获取订单统计
    let order_stats = sqlx::query_as::<_, (i64, Option<f64>)>(
        r#"
        SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount
        FROM srm.purchase_orders
        WHERE supplier_id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    let (total_orders, total_amount) = order_stats.unwrap_or((0, Some(0.0)));
    let total_amount = total_amount.unwrap_or(0.0);

    // 获取评估统计
    let eval_stats = sqlx::query_as::<_, (Option<f64>, Option<f64>, Option<f64>, Option<f64>, Option<f64>, i64, Option<chrono::DateTime<Utc>>)>(
        r#"
        SELECT 
            AVG(quality_score) as avg_quality,
            AVG(delivery_score) as avg_delivery,
            AVG(service_score) as avg_service,
            AVG(price_score) as avg_price,
            AVG(overall_score) as avg_overall,
            COUNT(*) as eval_count,
            MAX(evaluation_date) as last_eval_date
        FROM srm.supplier_evaluations
        WHERE supplier_id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    let (avg_quality, avg_delivery, avg_service, avg_price, avg_overall, eval_count, last_eval_date) =
        eval_stats.unwrap_or((None, None, None, None, None, 0, None));

    let performance = SupplierPerformance {
        supplier_id: id,
        supplier_name: supplier.name,
        total_orders,
        total_amount,
        avg_quality_score: avg_quality,
        avg_delivery_score: avg_delivery,
        avg_service_score: avg_service,
        avg_price_score: avg_price,
        avg_overall_score: avg_overall,
        on_time_delivery_rate: None,
        defect_rate: None,
        last_evaluation_date: last_eval_date,
        evaluation_count: eval_count,
    };

    Json(ApiResponse::success(performance, "获取供应商绩效评估成功"))
}

// ==================== Audit Log Helper ====================

async fn record_audit_log(
    db: &PgPool,
    table_name: &str,
    record_id: Uuid,
    action: &str,
    old_values: Option<Option<serde_json::Value>>,
    new_values: Option<Option<serde_json::Value>>,
    changed_by: Option<Uuid>,
) {
    let log_id = Uuid::new_v4();

    let result = sqlx::query(
        r#"
        INSERT INTO srm.audit_logs (id, table_name, record_id, action, old_values, new_values, changed_by, changed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(log_id)
    .bind(table_name)
    .bind(record_id)
    .bind(action)
    .bind(old_values.flatten())
    .bind(new_values.flatten())
    .bind(changed_by)
    .bind(Utc::now())
    .execute(db)
    .await;

    if let Err(e) = result {
        tracing::error!("记录审计日志失败: {}", e);
    }
}