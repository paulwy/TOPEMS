// ═══════════════════════════════════════════════════════════
// ⚠️ DEPRECATED: 此模块已废弃
// 供应商主数据应通过 SRM 服务管理
// ERP 仅保留财务视角的供应商引用（应付账款关联）
// 后续将迁移为通过 SRM 服务客户端获取供应商数据
// ═══════════════════════════════════════════════════════════

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use serde::Deserialize;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateSupplierRequest, Supplier, UpdateSupplierRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_core::{response::ApiResponse, TopemsError};

#[derive(Debug, Deserialize)]
pub struct SupplierListParams {
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    #[serde(
        default,
        alias = "page_size",
        alias = "pageSize",
        alias = "size",
        alias = "limit"
    )]
    pub page_size: Option<i64>,
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    #[serde(default, alias = "sort", alias = "sortBy", alias = "sortby")]
    pub sort_by: Option<String>,
    #[serde(
        default,
        alias = "sortorder",
        alias = "sortOrder",
        alias = "sort_dir",
        alias = "dir"
    )]
    pub sort_dir: Option<String>,
    pub status: Option<String>,
    pub supplier_type: Option<String>,
}

impl SupplierListParams {
    fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }
    fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }
    fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
    fn limit(&self) -> i64 {
        self.page_size_or_default()
    }
    fn normalized_sort_dir(&self) -> String {
        match self.sort_dir.as_deref() {
            Some("asc") => "asc".into(),
            _ => "desc".into(),
        }
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/suppliers", get(list_suppliers).post(create_supplier))
        .route(
            "/suppliers/{id}",
            get(get_supplier)
                .put(update_supplier)
                .delete(delete_supplier),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/suppliers",
    responses(
        (status = 200, description = "list_suppliers OK")
    ),
    tag = "ERP/supplier"
)]
pub async fn list_suppliers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SupplierListParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PaginatedResponse<Supplier>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e.0;
    }

    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let supplier_type_filter = params.supplier_type.clone();

    let suppliers_result = if search_pattern.is_some()
        || status_filter.is_some()
        || supplier_type_filter.is_some()
    {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();
        let supplier_type = supplier_type_filter.clone();

        sqlx::query_as::<_, Supplier>(
            only_own_schema_query!("erp", r#"SELECT id, code, CASE WHEN $6 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at
               FROM erp.suppliers
               WHERE deleted_at IS NULL
                 AND (code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1)
                 AND ($2 = '' OR status = $2)
                 AND ($3 = '' OR supplier_type = $3)
               ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(supplier_type.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query_as::<_, Supplier>(
            only_own_schema_query!("erp", "SELECT id, code, CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at FROM erp.suppliers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2")
        )
        .bind(page_size)
        .bind(offset)
        .bind(Locale::from_headers(&headers).as_sql())
        .fetch_all(&mut **txn)
        .await
    };

    let suppliers = match suppliers_result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询供应商失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商失败".to_string()));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("erp", r#"SELECT COUNT(*) FROM erp.suppliers WHERE deleted_at IS NULL AND (code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1) AND ($2 = '' OR status = $2) AND ($3 = '' OR supplier_type = $3)"#)
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_else(|| "%%".to_string()))
    .bind(status_filter.as_deref().unwrap_or(""))
    .bind(supplier_type_filter.as_deref().unwrap_or(""))
    .fetch_one(&mut **txn)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询供应商总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商总数失败".to_string()));
        }
    };

    ApiResponse::success(
        PaginatedResponse::new(suppliers, total, page, page_size),
        "获取供应商列表成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/suppliers/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "get_supplier OK")
    ),
    tag = "ERP/supplier"
)]
pub async fn get_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Supplier> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e.0;
    }

    let result = sqlx::query_as::<_, Supplier>(
        only_own_schema_query!("erp", "SELECT id, code, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at FROM erp.suppliers WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(supplier)) => ApiResponse::success(supplier, "获取供应商成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("供应商不存在".to_string())),
        Err(e) => {
            tracing::error!("查询供应商失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询供应商失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/suppliers",
    request_body = CreateSupplierRequest,
    responses(
        (status = 200, description = "create_supplier OK")
    ),
    tag = "ERP/supplier"
)]
pub async fn create_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<CreateSupplierRequest>,
) -> ApiResponse<Supplier> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }

    let result = sqlx::query_as::<_, Supplier>(
        only_own_schema_query!("erp", "INSERT INTO erp.suppliers (code, name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, name_en, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NULLIF(current_setting('app.tenant_id', true), '')::UUID) RETURNING id, code, CASE WHEN $16 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at"),
    )
    .bind(body.code)
    .bind(body.name)
    .bind(body.short_name)
    .bind(body.contact_person)
    .bind(body.contact_phone)
    .bind(body.email)
    .bind(body.address)
    .bind(body.province)
    .bind(body.city)
    .bind(body.district)
    .bind(body.supplier_type)
    .bind(body.industry)
    .bind(body.qualification_level)
    .bind(body.status.unwrap_or_else(|| "active".to_string()))
    .bind(body.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(supplier)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(supplier, "创建供应商成功")
        }

        Ok(None) => ApiResponse::from(TopemsError::Internal("创建供应商失败".to_string())),
        Err(e) => {
            tracing::error!("创建供应商失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建供应商失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/suppliers/{id}",
    request_body = UpdateSupplierRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "update_supplier OK")
    ),
    tag = "ERP/supplier"
)]
pub async fn update_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(body): Json<UpdateSupplierRequest>,
) -> ApiResponse<Supplier> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e.0;
    }

    let result = sqlx::query_as::<_, Supplier>(
        only_own_schema_query!("erp", "UPDATE erp.suppliers SET name = COALESCE($1, name), short_name = COALESCE($2, short_name), contact_person = COALESCE($3, contact_person), contact_phone = COALESCE($4, contact_phone), email = COALESCE($5, email), address = COALESCE($6, address), province = COALESCE($7, province), city = COALESCE($8, city), district = COALESCE($9, district), supplier_type = COALESCE($10, supplier_type), industry = COALESCE($11, industry), qualification_level = COALESCE($12, qualification_level), status = COALESCE($13, status), updated_at = NOW(), name_en = COALESCE($15, name_en) WHERE id = $14 RETURNING id, code, CASE WHEN $16 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at"),
    )
    .bind(body.name)
    .bind(body.short_name)
    .bind(body.contact_person)
    .bind(body.contact_phone)
    .bind(body.email)
    .bind(body.address)
    .bind(body.province)
    .bind(body.city)
    .bind(body.district)
    .bind(body.supplier_type)
    .bind(body.industry)
    .bind(body.qualification_level)
    .bind(body.status)
    .bind(id)
    .bind(body.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(supplier)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(supplier, "更新供应商成功")
        }

        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("供应商不存在".to_string())),
        Err(e) => {
            tracing::error!("更新供应商失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新供应商失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/suppliers/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "delete_supplier OK")
    ),
    tag = "ERP/supplier"
)]
pub async fn delete_supplier(
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
        "UPDATE erp.suppliers SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
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
            ApiResponse::success("删除成功".to_string(), "删除供应商成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("供应商不存在".to_string())),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除供应商失败".to_string()))
        }
    }
}
