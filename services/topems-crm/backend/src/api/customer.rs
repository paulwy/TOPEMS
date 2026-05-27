use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, api_error};
use crate::models::{CreateCustomerRequest, Customer, UpdateCustomerRequest};

#[derive(Debug, Deserialize)]
pub struct CustomerPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn create_routes() -> Result<Router> {
    let app = Router::new()
        .route("/api/v1/customers", get(list_customers).post(create_customer))
        .route(
            "/api/v1/customers/{id}",
            get(get_customer).put(update_customer).delete(delete_customer),
        );

    Ok(app)
}

async fn list_customers(
    State(pool): State<PgPool>,
    Query(params): Query<CustomerPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        FROM customers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(customers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM customers
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "customers": customers,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取客户列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取客户列表失败: {}", e);
            Json(api_error(500, "获取客户列表失败"))
        }
    }
}

async fn create_customer(
    State(pool): State<PgPool>,
    Json(req): Json<CreateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO customers (
            id, name, code, industry, website, email, phone, address, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        RETURNING id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.industry)
    .bind(&req.website)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(&req.address)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(customer) => Json(ApiResponse::success(customer, "客户创建成功")),
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            Json(api_error(500, "客户创建失败"))
        }
    }
}

async fn get_customer(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Customer>> {
    let result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        FROM customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(customer)) => Json(ApiResponse::success(customer, "获取客户成功")),
        Ok(None) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("获取客户失败: {}", e);
            Json(api_error(500, "获取客户失败"))
        }
    }
}

async fn update_customer(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    let existing = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at FROM customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let industry = req.industry.or(existing.industry);
    let website = req.website.or(existing.website);
    let email = req.email.or(existing.email);
    let phone = req.phone.or(existing.phone);
    let address = req.address.or(existing.address);
    let status = req.status.unwrap_or(existing.status);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Customer>(
        r#"
        UPDATE customers SET
            name = $2, code = $3, industry = $4, website = $5, email = $6, phone = $7, address = $8, 
            status = $9, notes = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&industry)
    .bind(&website)
    .bind(&email)
    .bind(&phone)
    .bind(&address)
    .bind(&status)
    .bind(&notes)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(customer) => Json(ApiResponse::success(customer, "客户更新成功")),
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            Json(api_error(500, "客户更新失败"))
        }
    }
}

async fn delete_customer(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM customers WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "客户删除成功")),
        Ok(_) => Json(api_error(404, "客户不存在")),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            Json(api_error(500, "客户删除失败"))
        }
    }
}
