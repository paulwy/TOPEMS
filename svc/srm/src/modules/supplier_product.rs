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

use crate::models::{CreateSupplierProductRequest, SupplierProduct, UpdateSupplierProductRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

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
        .route(
            "/supplier-products",
            get(list_products).post(create_product),
        )
        .route(
            "/supplier-products/{id}",
            get(get_product).put(update_product).delete(delete_product),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Product Handlers ====================

pub async fn list_products(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ProductQueryParams>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let supplier_id_filter = params
        .supplier_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let category_filter = params.category.clone();

    let result = sqlx::query_as::<_, SupplierProduct>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        FROM srm.supplier_products
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR name ILIKE $2 OR product_no ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR supplier_id = $4)
          AND ($5::text IS NULL OR category = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#, "srm"),
    )
    .bind(tenant_opt)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(&category_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(products) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "srm",
                r#"
                SELECT COUNT(*) FROM srm.supplier_products
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR name ILIKE $2 OR product_no ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR supplier_id = $4)
                  AND ($5::text IS NULL OR category = $5)
                "#,
                "srm"
            ))
            .bind(tenant_opt)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .bind(&category_filter)
            .fetch_one(&mut **txn)
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
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商产品列表失败",
            ))
        }
    }
}

pub async fn create_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateSupplierProductRequest>,
) -> Json<ApiResponse<SupplierProduct>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    if req.product_no.is_empty() || req.name.is_empty() {
        return Json(ApiResponse::<SupplierProduct>::error(
            400,
            "产品编号和名称不能为空",
        ));
    }

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<SupplierProduct>::error(
                400,
                "供应商ID格式错误",
            ));
        }
    };

    let supplier_exists = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND id = $2 AND status != 'deleted'", "srm"),
    )
    .bind(tenant_opt)
    .bind(supplier_id)
    .fetch_one(&mut **txn)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<SupplierProduct>::error(
            400,
            "供应商不存在或已删除",
        ));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_products WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND product_no = $2", "srm"),
    )
    .bind(tenant_opt)
    .bind(&req.product_no)
    .fetch_one(&mut **txn)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierProduct>::error(400, "产品编号已存在"));
    }

    if let Some(price) = req.unit_price {
        if price < 0.0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "单价不能为负数"));
        }
    }

    if let Some(min_qty) = req.min_order_qty {
        if min_qty < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(
                400,
                "最小订购量不能为负数",
            ));
        }
    }

    if let Some(lead_time) = req.lead_time_days {
        if lead_time < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(
                400,
                "交货周期不能为负数",
            ));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, SupplierProduct>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.supplier_products (id, tenant_id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, tenant_id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_id)
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
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(product) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(product, "供应商产品创建成功"))
        }
        Err(e) => {
            tracing::error!("创建供应商产品失败: {}", e);
            Json(ApiResponse::<SupplierProduct>::error(
                500,
                "供应商产品创建失败",
            ))
        }
    }
}

pub async fn get_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SupplierProduct>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, SupplierProduct>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        FROM srm.supplier_products WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(product)) => Json(ApiResponse::success(product, "获取供应商产品成功")),
        Ok(None) => Json(ApiResponse::<SupplierProduct>::error(
            404,
            "供应商产品不存在",
        )),
        Err(e) => {
            tracing::error!("获取供应商产品失败: {}", e);
            Json(ApiResponse::<SupplierProduct>::error(
                500,
                "获取供应商产品失败",
            ))
        }
    }
}

pub async fn update_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateSupplierProductRequest>,
) -> Json<ApiResponse<SupplierProduct>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let existing = sqlx::query_as::<_, SupplierProduct>(
        only_own_schema_query!("srm", "SELECT id, tenant_id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at FROM srm.supplier_products WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)", "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Json(ApiResponse::<SupplierProduct>::error(
                404,
                "供应商产品不存在",
            ))
        }
        Err(e) => {
            return Json(ApiResponse::<SupplierProduct>::error(
                500,
                &format!("查询供应商产品失败: {}", e),
            ))
        }
    };

    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid_val = match Uuid::parse_str(supplier_id_str) {
            Ok(uuid) => uuid,
            Err(_) => {
                return Json(ApiResponse::<SupplierProduct>::error(
                    400,
                    "供应商ID格式错误",
                ));
            }
        };

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND id = $2 AND status != 'deleted'", "srm"),
        )
        .bind(tenant_opt)
        .bind(supplier_uuid_val)
        .fetch_one(&mut **txn)
        .await;

        if supplier_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<SupplierProduct>::error(
                400,
                "供应商不存在或已删除",
            ));
        }

        supplier_uuid_val
    } else {
        existing.supplier_id
    };

    if let Some(price) = req.unit_price {
        if price < 0.0 {
            return Json(ApiResponse::<SupplierProduct>::error(400, "单价不能为负数"));
        }
    }

    if let Some(min_qty) = req.min_order_qty {
        if min_qty < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(
                400,
                "最小订购量不能为负数",
            ));
        }
    }

    if let Some(lead_time) = req.lead_time_days {
        if lead_time < 0 {
            return Json(ApiResponse::<SupplierProduct>::error(
                400,
                "交货周期不能为负数",
            ));
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
        only_own_schema_query!("srm", r#"
        UPDATE srm.supplier_products SET
            product_no = $2, supplier_id = $3, name = $4, description = $5, category = $6, unit = $7, unit_price = $8, currency = $9, min_order_qty = $10, lead_time_days = $11, status = $12, specifications = $13, updated_at = $14
        WHERE id = $1 AND tenant_id = $15
        RETURNING id, tenant_id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        "#, "srm"),
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
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(product) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(product, "供应商产品更新成功"))
        }
        Err(e) => {
            tracing::error!("更新供应商产品失败: {}", e);
            Json(ApiResponse::<SupplierProduct>::error(
                500,
                "供应商产品更新失败",
            ))
        }
    }
}

pub async fn delete_product(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.supplier_products SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "供应商产品删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商产品不存在")),
        Err(e) => {
            tracing::error!("删除供应商产品失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商产品删除失败"))
        }
    }
}
