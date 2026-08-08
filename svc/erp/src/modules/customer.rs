use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_type: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/customers", get(list_customers).post(create_customer))
        .route(
            "/customers/{id}",
            get(get_customer)
                .put(update_customer)
                .delete(delete_customer),
        )
}

pub async fn list_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Customer>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_type_filter = params.customer_type.clone();

    let customers_result = if search_pattern.is_some()
        || status_filter.is_some()
        || customer_type_filter.is_some()
    {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();
        let customer_type = customer_type_filter.clone();

        sqlx::query_as::<_, Customer>(
            r#"SELECT id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status, created_at, updated_at 
               FROM customers 
               WHERE (code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1)
                 AND ($2 = '' OR status = $2)
                 AND ($3 = '' OR customer_type = $3)
               ORDER BY created_at DESC LIMIT $4 OFFSET $5"#
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(customer_type.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as::<_, Customer>(
            "SELECT id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status, created_at, updated_at FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    let customers = match customers_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("查询客户失败: {}", e);
            return Json(api_error(500, "查询客户失败"));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL AND (code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1) AND ($2 = '' OR status = $2) AND ($3 = '' OR customer_type = $3)"#
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_default())
    .bind(status_filter.as_deref().unwrap_or(""))
    .bind(customer_type_filter.as_deref().unwrap_or(""))
    .fetch_one(&state.db)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询客户总数失败: {}", e);
            return Json(api_error(500, "查询客户总数失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(customers, total, page, page_size),
        "获取客户列表成功",
    ))
}

pub async fn get_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Customer>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, Customer>(
        "SELECT id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status, created_at, updated_at FROM customers WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "获取客户成功")),
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("查询客户失败: {}", e);
            Json(api_error(500, "查询客户失败"))
        }
    }
}

pub async fn create_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Customer>(
        "INSERT INTO customers (code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status, created_at, updated_at",
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
    .bind(body.customer_type)
    .bind(body.industry)
    .bind(body.scale)
    .bind(body.credit_limit.unwrap_or(0.0))
    .bind(body.status.unwrap_or_else(|| "active".to_string()))
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "创建客户成功")),
        Ok(None) => Json(api_error(500, "创建客户失败")),
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            Json(api_error(500, "创建客户失败"))
        }
    }
}

pub async fn update_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Customer>(
        "UPDATE customers SET name = COALESCE($1, name), short_name = COALESCE($2, short_name), contact_person = COALESCE($3, contact_person), contact_phone = COALESCE($4, contact_phone), email = COALESCE($5, email), address = COALESCE($6, address), province = COALESCE($7, province), city = COALESCE($8, city), district = COALESCE($9, district), customer_type = COALESCE($10, customer_type), industry = COALESCE($11, industry), scale = COALESCE($12, scale), credit_limit = COALESCE($13, credit_limit), status = COALESCE($14, status), updated_at = NOW() WHERE id = $15 RETURNING id, code, name, short_name, contact_person, contact_phone, email, address, province, city, district, customer_type, industry, scale, credit_limit, status, created_at, updated_at",
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
    .bind(body.customer_type)
    .bind(body.industry)
    .bind(body.scale)
    .bind(body.credit_limit)
    .bind(body.status)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "更新客户成功")),
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            Json(api_error(500, "更新客户失败"))
        }
    }
}

pub async fn delete_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("UPDATE customers SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("删除成功".to_string(), "删除客户成功"))
        }
        Ok(_) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            Json(api_error(500, "删除客户失败"))
        }
    }
}
