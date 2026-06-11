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
use uuid::Uuid;

use crate::models::{
    SupplierProduct,
    CreateSupplierProductRequest, UpdateSupplierProductRequest,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ProductQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
    pub category: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/supplier-products", get(list_products).post(create_product))
        .route(
            "/api/v1/supplier-products/{id}",
            get(get_product).put(update_product).delete(delete_product),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Product Handlers ====================

async fn list_products(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ProductQueryParams>,
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
    let supplier_id_filter = params.supplier_id.clone().and_then(|s| Uuid::parse_str(&s).ok());
    let category_filter = params.category.clone();

    let result = sqlx::query_as::<_, SupplierProduct>(
        r#"
        SELECT id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        FROM srm.supplier_products
        WHERE ($1::text IS NULL OR name ILIKE $1 OR product_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR supplier_id = $3)
          AND ($4::text IS NULL OR category = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(&category_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(products) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM srm.supplier_products
                WHERE ($1::text IS NULL OR name ILIKE $1 OR product_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR supplier_id = $3)
                  AND ($4::text IS NULL OR category = $4)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .bind(&category_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "products": products,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商产品列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商产品列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取供应商产品列表失败"))
        }
    }
}

async fn create_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSupplierProductRequest>,
) -> Json<ApiResponse<SupplierProduct>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 数据验证
    if req.product_no.is_empty() || req.name.is_empty() {
        return Json(ApiResponse::<SupplierProduct>::error(400, "产品编号和名称不能为空"));
    }

    // 验证供应商ID
    let supplier_uuid = Uuid::parse_str(&req.supplier_id);
    if supplier_uuid.is_err() {
        return Json(ApiResponse::<SupplierProduct>::error(400, "供应商ID格式错误"));
    }

    let supplier_id = supplier_uuid.unwrap();

    // 检查供应商是否存在
    let supplier_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'"
    )
    .bind(supplier_id)
    .fetch_one(&state.db)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<SupplierProduct>::error(400, "供应商不存在或已删除"));
    }

    // 检查产品编号是否已存在
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.supplier_products WHERE product_no = $1"
    )
    .bind(&req.product_no)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierProduct>::error(400, "产品编号已存在"));
    }

    // 验证价格
    if let Some(price) = req.unit_price {
        if price < 0.0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "单价不能为负数"));
        }
    }

    // 验证最小订购量
    if let Some(min_qty) = req.min_order_qty {
        if min_qty < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "最小订购量不能为负数"));
        }
    }

    // 验证交货周期
    if let Some(lead_time) = req.lead_time_days {
        if lead_time < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "交货周期不能为负数"));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, SupplierProduct>(
        r#"
        INSERT INTO srm.supplier_products (id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.product_no)
    .bind(supplier_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.unit)
    .bind(req.unit_price)
    .bind(&req.currency)
    .bind(req.min_order_qty)
    .bind(req.lead_time_days)
    .bind(&req.status)
    .bind(&req.specifications)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(product) => Json(ApiResponse::success(product, "供应商产品创建成功")),
        Err(e) => {
            tracing::error!("创建供应商产品失败: {}", e);
            Json(ApiResponse::<SupplierProduct>::error(500, "供应商产品创建失败"))
        }
    }
}

async fn get_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierProduct>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SupplierProduct>(
        r#"
        SELECT id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        FROM srm.supplier_products WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(product)) => Json(ApiResponse::success(product, "获取供应商产品成功")),
        Ok(None) => Json(ApiResponse::<SupplierProduct>::error(404, "供应商产品不存在")),
        Err(e) => {
            tracing::error!("获取供应商产品失败: {}", e);
            Json(ApiResponse::<SupplierProduct>::error(500, "获取供应商产品失败"))
        }
    }
}

async fn update_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierProductRequest>,
) -> Json<ApiResponse<SupplierProduct>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, SupplierProduct>(
        "SELECT id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at FROM srm.supplier_products WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::<SupplierProduct>::error(404, "供应商产品不存在")),
        Err(e) => return Json(ApiResponse::<SupplierProduct>::error(500, &format!("查询供应商产品失败: {}", e))),
    };

    // 验证供应商ID（如果更新）
    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid = Uuid::parse_str(supplier_id_str);
        if supplier_uuid.is_err() {
            return Json(ApiResponse::<SupplierProduct>::error(400, "供应商ID格式错误"));
        }

        let supplier_uuid_val = supplier_uuid.unwrap();

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'"
        )
        .bind(supplier_uuid_val)
        .fetch_one(&state.db)
        .await;

        if supplier_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "供应商不存在或已删除"));
        }

        supplier_uuid_val
    } else {
        existing.supplier_id
    };

    // 验证价格
    if let Some(price) = req.unit_price {
        if price < 0.0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "单价不能为负数"));
        }
    }

    // 验证最小订购量
    if let Some(min_qty) = req.min_order_qty {
        if min_qty < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "最小订购量不能为负数"));
        }
    }

    // 验证交货周期
    if let Some(lead_time) = req.lead_time_days {
        if lead_time < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "交货周期不能为负数"));
        }
    }

    let product_no = req.product_no.unwrap_or(existing.product_no);
    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let category = req.category.or(existing.category);
    let unit = req.unit.or(existing.unit);
    let unit_price = req.unit_price.or(existing.unit_price);
    let currency = req.currency.unwrap_or(existing.currency);
    let min_order_qty = req.min_order_qty.or(existing.min_order_qty);
    let lead_time_days = req.lead_time_days.or(existing.lead_time_days);
    let status = req.status.unwrap_or(existing.status);
    let specifications = req.specifications.or(existing.specifications);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierProduct>(
        r#"
        UPDATE srm.supplier_products SET
            product_no = $2, supplier_id = $3, name = $4, description = $5, category = $6, unit = $7, unit_price = $8, currency = $9, min_order_qty = $10, lead_time_days = $11, status = $12, specifications = $13, updated_at = $14
        WHERE id = $1
        RETURNING id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(product_no)
    .bind(supplier_id)
    .bind(name)
    .bind(description)
    .bind(category)
    .bind(unit)
    .bind(unit_price)
    .bind(currency)
    .bind(min_order_qty)
    .bind(lead_time_days)
    .bind(status)
    .bind(specifications)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(product) => Json(ApiResponse::success(product, "供应商产品更新成功")),
        Err(e) => {
            tracing::error!("更新供应商产品失败: {}", e);
            Json(ApiResponse::<SupplierProduct>::error(500, "供应商产品更新失败"))
        }
    }
}

async fn delete_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM srm.supplier_products WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "供应商产品删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商产品不存在")),
        Err(e) => {
            tracing::error!("删除供应商产品失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商产品删除失败"))
        }
    }
}