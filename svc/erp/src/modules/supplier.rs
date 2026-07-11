use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateSupplierRequest, Supplier, UpdateSupplierRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub supplier_type: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/erp/suppliers",
            get(list_suppliers).post(create_supplier),
        )
        .route(
            "/api/erp/suppliers/:id",
            get(get_supplier)
                .put(update_supplier)
                .delete(delete_supplier),
        )
}

pub async fn list_suppliers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Supplier>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

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
            r#"SELECT id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at 
               FROM suppliers 
               WHERE (code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1)
                 AND ($2 = '' OR status = $2)
                 AND ($3 = '' OR supplier_type = $3)
               ORDER BY created_at DESC LIMIT $4 OFFSET $5"#
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(supplier_type.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as::<_, Supplier>(
            "SELECT id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at FROM suppliers ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    let suppliers = match suppliers_result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询供应商失败: {}", e);
            return Json(api_error(500, "查询供应商失败"));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM suppliers")
        .fetch_one(&state.db)
        .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询供应商总数失败: {}", e);
            return Json(api_error(500, "查询供应商总数失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(suppliers, total, page, page_size),
        "获取供应商列表成功",
    ))
}

pub async fn get_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Supplier>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, Supplier>(
        "SELECT id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at FROM suppliers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(supplier)) => Json(ApiResponse::success(supplier, "获取供应商成功")),
        Ok(None) => Json(api_error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("查询供应商失败: {}", e);
            Json(api_error(500, "查询供应商失败"))
        }
    }
}

pub async fn create_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Supplier>(
        "INSERT INTO suppliers (code, name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at",
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
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(supplier)) => Json(ApiResponse::success(supplier, "创建供应商成功")),
        Ok(None) => Json(api_error(500, "创建供应商失败")),
        Err(e) => {
            tracing::error!("创建供应商失败: {}", e);
            Json(api_error(500, "创建供应商失败"))
        }
    }
}

pub async fn update_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Supplier>(
        "UPDATE suppliers SET name = COALESCE($1, name), short_name = COALESCE($2, short_name), contact_person = COALESCE($3, contact_person), contact_phone = COALESCE($4, contact_phone), email = COALESCE($5, email), address = COALESCE($6, address), province = COALESCE($7, province), city = COALESCE($8, city), district = COALESCE($9, district), supplier_type = COALESCE($10, supplier_type), industry = COALESCE($11, industry), qualification_level = COALESCE($12, qualification_level), status = COALESCE($13, status), updated_at = NOW() WHERE id = $14 RETURNING id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, supplier_type, industry, qualification_level, status, created_at, updated_at",
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
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(supplier)) => Json(ApiResponse::success(supplier, "更新供应商成功")),
        Ok(None) => Json(api_error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("更新供应商失败: {}", e);
            Json(api_error(500, "更新供应商失败"))
        }
    }
}

pub async fn delete_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM suppliers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            "删除成功".to_string(),
            "删除供应商成功",
        )),
        Ok(_) => Json(api_error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            Json(api_error(500, "删除供应商失败"))
        }
    }
}
