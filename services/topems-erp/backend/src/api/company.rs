use anyhow::Result;
use axum::{
    extract::{Path, Query, State, HeaderMap},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{Company, CreateCompanyRequest, UpdateCompanyRequest};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;

#[derive(Debug, Deserialize)]
pub struct CompanyQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/companies", get(list_companies).post(create_company))
        .route(
            "/api/v1/companies/{id}",
            get(get_company).put(update_company).delete(delete_company),
        )
        .with_state(state);

    Ok(app)
}

async fn list_companies(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CompanyQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<Company>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Company>(
        r#"
        SELECT id, name, short_name, registration_number, tax_number, address, contact_phone, email, website, status, created_at, updated_at
        FROM companies
        WHERE ($1::text IS NULL OR name ILIKE $1 OR short_name ILIKE $1)
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
        Ok(companies) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM companies
                WHERE ($1::text IS NULL OR name ILIKE $1 OR short_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(companies, total, page, page_size),
                "获取公司列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取公司列表失败: {}", e);
            Json(api_error(500, "获取公司列表失败"))
        }
    }
}

async fn create_company(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateCompanyRequest>,
) -> Json<ApiResponse<Company>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Company>(
        r#"
        INSERT INTO companies (id, name, short_name, registration_number, tax_number, address, contact_phone, email, website, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        RETURNING id, name, short_name, registration_number, tax_number, address, contact_phone, email, website, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.short_name)
    .bind(&req.registration_number)
    .bind(&req.tax_number)
    .bind(&req.address)
    .bind(&req.contact_phone)
    .bind(&req.email)
    .bind(&req.website)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(company) => (
            Json(ApiResponse::success(company.clone(), "公司创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建公司失败: {}", e);
            (
                Json(api_error(500, "公司创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(company) = &result {
        serde_json::to_value(company).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "company".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_company(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Company>> {
    let result = sqlx::query_as::<_, Company>(
        r#"
        SELECT id, name, short_name, registration_number, tax_number, address, contact_phone, email, website, status, created_at, updated_at
        FROM companies WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(company)) => Json(ApiResponse::success(company, "获取公司成功")),
        Ok(None) => Json(api_error(404, "公司不存在")),
        Err(e) => {
            tracing::error!("获取公司失败: {}", e);
            Json(api_error(500, "获取公司失败"))
        }
    }
}

async fn update_company(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCompanyRequest>,
) -> Json<ApiResponse<Company>> {
    let existing = sqlx::query_as::<_, Company>(
        "SELECT id, name, short_name, registration_number, tax_number, address, contact_phone, email, website, status, created_at, updated_at FROM companies WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "公司不存在")),
        Err(e) => return Json(api_error(500, &format!("查询公司失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let short_name = req.short_name.or(existing.short_name);
    let registration_number = req.registration_number.or(existing.registration_number);
    let tax_number = req.tax_number.or(existing.tax_number);
    let address = req.address.or(existing.address);
    let contact_phone = req.contact_phone.or(existing.contact_phone);
    let email = req.email.or(existing.email);
    let website = req.website.or(existing.website);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Company>(
        r#"
        UPDATE companies SET
            name = $2, short_name = $3, registration_number = $4, tax_number = $5, address = $6, contact_phone = $7, email = $8, website = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, name, short_name, registration_number, tax_number, address, contact_phone, email, website, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&short_name)
    .bind(&registration_number)
    .bind(&tax_number)
    .bind(&address)
    .bind(&contact_phone)
    .bind(&email)
    .bind(&website)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(company) => (
            Json(ApiResponse::success(company.clone(), "公司更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新公司失败: {}", e);
            (
                Json(api_error(500, "公司更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(company) = &result {
        serde_json::to_value(company).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "company".to_string(),
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

async fn delete_company(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM companies WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "公司删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "公司不存在")),
            "error".to_string(),
            Some("公司不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除公司失败: {}", e);
            (
                Json(api_error(500, "公司删除失败")),
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
        "company".to_string(),
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
