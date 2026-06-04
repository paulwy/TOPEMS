use axum::{
    extract::{Path, Query, State, Extension},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use topems_shared::{ApiResponse, api_error};
use topems_shared::auth::Claims;
use crate::models::{CreateCustomerRequest, Customer, UpdateCustomerRequest};
use crate::api::audit::log_audit_event;
use crate::services::permission::{check_permission, ModulePermission};
use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct CustomerPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/customers", get(list_customers).post(create_customer))
        .route("/api/v1/customers/batch-delete", post(batch_delete_customers))
        .route(
            "/api/v1/customers/{id}",
            get(get_customer).put(update_customer).delete(delete_customer),
        )
}

async fn list_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CustomerPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

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
    .fetch_all(&state.db)
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
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": customers,
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    if req.name.is_empty() {
        return Json(api_error(400, "客户名称不能为空"));
    }

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
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(customer) => (
            Json(ApiResponse::success(customer.clone(), "客户创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建客户失败: {}", e);
            (
                Json(api_error(500, "客户创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(customer) = &result {
        serde_json::to_value(customer).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "customer".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at
        FROM customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCustomerRequest>,
) -> Json<ApiResponse<Customer>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, code, industry, website, email, phone, address, status, notes, created_at, updated_at FROM customers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

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
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(customer) => (
            Json(ApiResponse::success(customer.clone(), "客户更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新客户失败: {}", e);
            (
                Json(api_error(500, "客户更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(customer) = &result {
        serde_json::to_value(customer).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "customer".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_customer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM customers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "客户删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "客户不存在")),
            "error".to_string(),
            Some("客户不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除客户失败: {}", e);
            (
                Json(api_error(500, "客户删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "customer".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn batch_delete_customers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    if req.ids.is_empty() {
        return Json(api_error(400, "请选择要删除的客户"));
    }

    let result = sqlx::query("DELETE FROM customers WHERE id = ANY($1)")
        .bind(&req.ids)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success("".to_string(), &format!("成功删除 {} 个客户", r.rows_affected()))),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除客户失败: {}", e);
            (
                Json(api_error(500, "批量删除客户失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    let entity_ids = serde_json::to_value(&req.ids).ok();
    log_audit_event(
        &state.db,
        "batch_delete".to_string(),
        "customer".to_string(),
        None,
        entity_ids,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}
