use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::{Company, CreateCompanyRequest, UpdateCompanyRequest};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/companies", get(list_companies).post(create_company))
        .route(
            "/companies/{id}",
            get(get_company).put(update_company).delete(delete_company),
        )
}

#[utoipa::path(
    get,
    path = "/companies",
    tag = "companies",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "公司列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_companies(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CompanyRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    // 验证连接状态
    let conn_test = sqlx::query("SHOW search_path").fetch_one(&state.db).await;
    tracing::debug!("Connection search_path: {:?}", conn_test);

    let result = sqlx::query_as::<_, Company>(
        r#"
        SELECT id, organization_id, name, short_name, registration_number, tax_number, address,
               contact_phone, contact_email as email, website, description, status, created_at, updated_at
        FROM "public"."companies"
        WHERE ($1::text IS NULL OR name ILIKE $1 OR registration_number ILIKE $1 OR contact_email ILIKE $1)
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
                SELECT COUNT(*) FROM "public"."companies"
                WHERE ($1::text IS NULL OR name ILIKE $1 OR registration_number ILIKE $1 OR contact_email ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            let items: Vec<serde_json::Value> = companies
                .into_iter()
                .map(|c| {
                    serde_json::json!({
                        "id": c.id,
                        "name": c.name,
                        "short_name": c.short_name,
                        "registration_number": c.registration_number,
                        "tax_number": c.tax_number,
                        "address": c.address,
                        "contact_phone": c.contact_phone,
                        "email": c.email,
                        "website": c.website,
                        "description": c.description,
                        "status": c.status,
                        "created_at": c.created_at,
                        "updated_at": c.updated_at
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "公司列表获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取公司列表失败: {}", e);
            Json(api_error(500, "获取公司列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/companies",
    tag = "companies",
    request_body = CreateCompanyRequest,
    responses(
        (status = 200, description = "公司创建成功", body = ApiResponse<Company>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_company(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateCompanyRequest>,
) -> Json<ApiResponse<Company>> {
    match check_permission(&state.db, &claims, &ModulePermission::CompanyWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Company>(
        r#"
        INSERT INTO hrm.companies (
            id, organization_id, name, short_name, registration_number, tax_number, address,
            contact_phone, contact_email, website, description, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13)
        RETURNING id, organization_id, name, short_name, registration_number, tax_number, address,
                  contact_phone, contact_email as email, website, description, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.organization_id)
    .bind(&req.name)
    .bind(&req.short_name)
    .bind(&req.registration_number)
    .bind(&req.tax_number)
    .bind(&req.address)
    .bind(&req.contact_phone)
    .bind(&req.email)
    .bind(&req.website)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(company) => {
            // 记录审计日志
            let user_id = headers
                .get("x-user-id")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            let user_name = headers
                .get("x-user-name")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            let response_data = serde_json::to_value(&company).ok();

            log_audit_event(
                &state.db,
                "create".to_string(),
                "company".to_string(),
                Some(company.id),
                None,
                user_id,
                user_name,
                None,
                response_data,
                "success".to_string(),
                None,
                &headers,
            )
            .await;

            tracing::info!("创建公司成功: {}", company.name);
            Json(ApiResponse::success(company, "公司创建成功"))
        }
        Err(e) => {
            tracing::error!("创建公司失败: {}", e);
            Json(api_error(500, &format!("创建公司失败: {}", e)))
        }
    }
}

#[utoipa::path(
    get,
    path = "/companies/{id}",
    tag = "companies",
    params(
        ("id" = Uuid, Path, description = "公司ID"),
    ),
    responses(
        (status = 200, description = "公司详情", body = ApiResponse<Company>),
        (status = 404, description = "公司不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_company(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Company>> {
    match check_permission(&state.db, &claims, &ModulePermission::CompanyRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, Company>(
        r#"
        SELECT id, organization_id, name, short_name, registration_number, tax_number, address,
               contact_phone, contact_email as email, website, description, status, created_at, updated_at
        FROM hrm.companies WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(company)) => Json(ApiResponse::success(company, "公司信息获取成功")),
        Ok(None) => Json(api_error(404, "公司不存在")),
        Err(e) => {
            tracing::error!("获取公司失败: {}", e);
            Json(api_error(500, &format!("获取公司失败: {}", e)))
        }
    }
}

async fn update_company(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateCompanyRequest>,
) -> Json<ApiResponse<Company>> {
    match check_permission(&state.db, &claims, &ModulePermission::CompanyWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 先检查公司是否存在
    let existing = sqlx::query_as::<_, Company>(
        r#"
        SELECT id, organization_id, name, short_name, registration_number, tax_number, address,
               contact_phone, contact_email as email, website, description, status, created_at, updated_at FROM hrm.companies WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "公司不存在")),
        Err(e) => return Json(api_error(500, &format!("查询公司失败: {}", e))),
    };

    let now = Utc::now();

    // 构建更新查询
    let name = req.name.unwrap_or(existing.name);
    let short_name = req.short_name.or(existing.short_name);
    let registration_number = req.registration_number.or(existing.registration_number);
    let tax_number = req.tax_number.or(existing.tax_number);
    let address = req.address.or(existing.address);
    let contact_phone = req.contact_phone.or(existing.contact_phone);
    let email = req.email.or(existing.email);
    let website = req.website.or(existing.website);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);

    let result = sqlx::query_as::<_, Company>(
        r#"
        UPDATE hrm.companies SET
            name = $2, short_name = $3, registration_number = $4, tax_number = $5,
            address = $6, contact_phone = $7, contact_email = $8, website = $9,
            description = $10, status = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, name, short_name, registration_number, tax_number, address,
                  contact_phone, contact_email as email, website, description, status, created_at, updated_at
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
    .bind(&description)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(company) => {
            // 记录审计日志
            let user_id = headers
                .get("x-user-id")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            let user_name = headers
                .get("x-user-name")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            let response_data = serde_json::to_value(&company).ok();

            log_audit_event(
                &state.db,
                "update".to_string(),
                "company".to_string(),
                Some(company.id),
                None,
                user_id,
                user_name,
                None,
                response_data,
                "success".to_string(),
                None,
                &headers,
            )
            .await;

            tracing::info!("更新公司成功: {}", company.name);
            Json(ApiResponse::success(company, "公司更新成功"))
        }
        Err(e) => {
            tracing::error!("更新公司失败: {}", e);
            Json(api_error(500, &format!("更新公司失败: {}", e)))
        }
    }
}

async fn delete_company(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CompanyWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 先检查公司是否存在
    let existing = sqlx::query_as::<_, Company>(
        r#"
        SELECT id, organization_id, name, short_name, registration_number, tax_number, address,
               contact_phone, contact_email as email, website, description, status, created_at, updated_at FROM hrm.companies WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match existing {
        Ok(Some(company)) => {
            let result = sqlx::query("DELETE FROM hrm.companies WHERE id = $1")
                .bind(id)
                .execute(&state.db)
                .await;

            match result {
                Ok(_) => {
                    // 记录审计日志
                    let user_id = headers
                        .get("x-user-id")
                        .and_then(|v| v.to_str().ok())
                        .map(|s| s.to_string());
                    let user_name = headers
                        .get("x-user-name")
                        .and_then(|v| v.to_str().ok())
                        .map(|s| s.to_string());

                    let response_data = serde_json::to_value(&company).ok();

                    log_audit_event(
                        &state.db,
                        "delete".to_string(),
                        "company".to_string(),
                        Some(company.id),
                        None,
                        user_id,
                        user_name,
                        None,
                        response_data,
                        "success".to_string(),
                        None,
                        &headers,
                    )
                    .await;

                    tracing::info!("删除公司成功: {}", company.name);
                    Json(ApiResponse::success(company.id.to_string(), "公司删除成功"))
                }
                Err(e) => {
                    tracing::error!("删除公司失败: {}", e);
                    Json(api_error(500, &format!("删除公司失败: {}", e)))
                }
            }
        }
        Ok(None) => Json(api_error(404, "公司不存在")),
        Err(e) => {
            tracing::error!("查询公司失败: {}", e);
            Json(api_error(500, &format!("查询公司失败: {}", e)))
        }
    }
}
