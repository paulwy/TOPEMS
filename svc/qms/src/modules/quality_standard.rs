//! Quality Standard handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow};
use topems_shared::{ApiResponse, Claims};
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
pub struct StandardQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListStandardsResponse {
    pub standards: Vec<QualityStandard>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct QualityStandard {
    pub id: String,
    pub tenant_id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateStandardRequest {
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateStandardRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct StandardRevision {
    pub id: String,
    pub tenant_id: String,
    pub standard_id: Uuid,
    pub version: Option<String>,
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
}

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

#[utoipa::path(
    get,
    path = "/api/qms/standards",
    tag = "quality_standard",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("category" = Option<String>, Query, description = "分类过滤"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
    ),
    responses(
        (status = 200, description = "质量标准列表", body = ApiResponse<ListStandardsResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_standards(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<StandardQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ListStandardsResponse>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id(&claims, &headers);

    let _params: Vec<serde_json::Value> = Vec::new();
    let where_clause = String::from(" WHERE tenant_id = $1");

    let count_sql = format!("SELECT COUNT(*) as total FROM qa_standards{}", where_clause);

    let count_query = sqlx::query_scalar(&count_sql).bind(tenant_id);

    let total: Option<i64> = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count standards: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id, tenant_id::TEXT, code, name, category, level, specification,
            description, version, status, created_by,
            created_at::TEXT, updated_at::TEXT
        FROM qa_standards
        {}
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        where_clause,
    );

    let fetch_query = sqlx::query_as::<_, QualityStandard>(&fetch_sql)
        .bind(tenant_id)
        .bind(page_size)
        .bind(offset);

    match fetch_query.fetch_all(&state.pool).await {
        Ok(data) => Json(ApiResponse::success(
            ListStandardsResponse {
                standards: data,
                total: total.unwrap_or(0),
                page,
                page_size,
            },
            "获取质量标准列表成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch standards: {}", e);
            Json(ApiResponse::error(500, "获取质量标准列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/qms/standards",
    tag = "quality_standard",
    request_body = CreateStandardRequest,
    responses(
        (status = 200, description = "质量标准创建成功", body = ApiResponse<QualityStandard>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let code = format!(
        "QS-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let version = req.version.unwrap_or_else(|| "1.0".to_string());
    let tenant_id = get_tenant_id(&claims, &headers);

    let standard = sqlx::query_as::<_, QualityStandard>(r#"INSERT INTO qa_standards (tenant_id, code, name, category, level, specification, description, version, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9) RETURNING id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT"#).bind(tenant_id).bind(code).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(version).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => {
            let created_by = data.created_by.clone();
            if let Ok(standard_id) = Uuid::parse_str(&data.id) {
                let _ = sqlx::query(r#"INSERT INTO qa_standard_revisions (tenant_id, standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#).bind(tenant_id).bind(standard_id).bind(data.version.clone()).bind(data.name.clone()).bind(data.category.clone()).bind(data.level.clone()).bind(data.specification.clone()).bind(data.description.clone()).bind(data.status.clone()).bind(created_by)
                .execute(&state.pool)
                .await;
            }
            Json(ApiResponse::success(data, "质量标准创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create standard: {}", e);
            Json(ApiResponse::error(500, "质量标准创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/qms/standards/{id}",
    tag = "quality_standard",
    params(
        ("id" = String, Path, description = "标准ID"),
    ),
    responses(
        (status = 200, description = "质量标准详情", body = ApiResponse<QualityStandard>),
        (status = 400, description = "无效的标准ID"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<QualityStandard>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let standard = sqlx::query_as::<_, QualityStandard>(r#"SELECT id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT FROM qa_standards WHERE id = $1 AND tenant_id = $2"#).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => Json(ApiResponse::success(data, "获取质量标准成功")),
        Err(e) => {
            tracing::error!("Failed to fetch standard: {}", e);
            Json(ApiResponse::error(500, "获取质量标准失败"))
        }
    }
}

pub async fn update_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let current = sqlx::query_as::<_, QualityStandard>(r#"SELECT id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT FROM qa_standards WHERE id = $1 AND tenant_id = $2"#).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    if let Ok(current_data) = current {
        if let Ok(standard_id) = Uuid::parse_str(&current_data.id) {
            let _ = sqlx::query(r#"INSERT INTO qa_standard_revisions (tenant_id, standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#).bind(tenant_id).bind(standard_id).bind(current_data.version).bind(current_data.name).bind(current_data.category).bind(current_data.level).bind(current_data.specification).bind(current_data.description).bind(current_data.status).bind(current_data.created_by)
            .execute(&state.pool)
            .await;
        }
    }

    let standard = sqlx::query_as::<_, QualityStandard>(r#"UPDATE qa_standards SET name = COALESCE($2, name), category = COALESCE($3, category), level = COALESCE($4, level), specification = COALESCE($5, specification), description = COALESCE($6, description), version = COALESCE($7, version), status = COALESCE($8, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $9 RETURNING id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(req.version).bind(req.status).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => Json(ApiResponse::success(data, "质量标准更新成功")),
        Err(e) => {
            tracing::error!("Failed to update standard: {}", e);
            Json(ApiResponse::error(500, "质量标准更新失败"))
        }
    }
}

pub async fn delete_standard(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(r#"DELETE FROM qa_standards WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "质量标准删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete standard: {}", e);
            Json(ApiResponse::error(500, "质量标准删除失败"))
        }
    }
}

pub async fn list_revisions(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<StandardRevision>>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let revisions = sqlx::query_as::<_, StandardRevision>(r#"SELECT id, tenant_id::TEXT, standard_id, version, name, category, level, specification, description, status, created_by, created_at::TEXT FROM qa_standard_revisions WHERE standard_id = $1 AND tenant_id = $2 ORDER BY created_at DESC"#).bind(id).bind(tenant_id)
    .fetch_all(&state.pool)
    .await;

    match revisions {
        Ok(data) => Json(ApiResponse::success(data, "获取质量标准修订记录成功")),
        Err(e) => {
            tracing::error!("Failed to fetch revisions: {}", e);
            Json(ApiResponse::error(500, "获取质量标准修订记录失败"))
        }
    }
}

pub async fn create_revision(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let current = sqlx::query_as::<_, QualityStandard>(r#"SELECT id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT FROM qa_standards WHERE id = $1 AND tenant_id = $2"#).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(current_data) => {
            let version = current_data.version.clone();
            let name = current_data.name.clone();
            let category = current_data.category.clone();
            let level = current_data.level.clone();
            let specification = current_data.specification.clone();
            let description = current_data.description.clone();
            let status = current_data.status.clone();
            let created_by = current_data.created_by.clone();

            if let Ok(standard_id) = Uuid::parse_str(&current_data.id) {
                let _ = sqlx::query(r#"INSERT INTO qa_standard_revisions (tenant_id, standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#).bind(tenant_id).bind(standard_id).bind(version.clone()).bind(name.clone()).bind(category.clone()).bind(level.clone()).bind(specification.clone()).bind(description.clone()).bind(status.clone()).bind(created_by.clone())
                    .execute(&state.pool)
                    .await;
            }

            let new_version = req.version.unwrap_or_else(|| {
                let current_version = version.as_deref().unwrap_or("1.0");
                let parts: Vec<&str> = current_version.split('.').collect();
                if parts.len() >= 2 {
                    let mut v: Vec<String> = parts.iter().map(|s| s.to_string()).collect();
                    if let Ok(patch) = v[1].parse::<i32>() {
                        v[1] = (patch + 1).to_string();
                    }
                    v.join(".")
                } else {
                    format!("{}.1", current_version)
                }
            });

            let standard = sqlx::query_as::<_, QualityStandard>(r#"UPDATE qa_standards SET name = COALESCE($2, name), category = COALESCE($3, category), level = COALESCE($4, level), specification = COALESCE($5, specification), description = COALESCE($6, description), version = $7, status = COALESCE($8, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $9 RETURNING id, tenant_id::TEXT, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(new_version).bind(req.status).bind(tenant_id)
            .fetch_one(&state.pool)
            .await;

            match standard {
                Ok(data) => Json(ApiResponse::success(data, "质量标准版本创建成功")),
                Err(e) => {
                    tracing::error!("Failed to create revision: {}", e);
                    Json(ApiResponse::error(500, "质量标准版本创建失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find standard: {}", e);
            Json(ApiResponse::error(404, "质量标准不存在"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/standards", get(list_standards))
        .route("/standards", post(create_standard))
        .route("/standards/{id}", get(get_standard))
        .route("/standards/{id}", put(update_standard))
        .route("/standards/{id}", delete(delete_standard))
        .route("/standards/{id}/revisions", get(list_revisions))
        .route("/standards/{id}/revisions", post(create_revision))
}
