//! Quality Issue handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow};
use topems_shared::{ApiResponse, Claims};

#[derive(Debug, Serialize, Deserialize)]
pub struct IssueQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub severity: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct QualityIssue {
    pub id: String,
    pub tenant_id: String,
    pub issue_no: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub source: Option<String>,
    pub related_inspection_id: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub resolved_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateIssueRequest {
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub source: Option<String>,
    pub related_inspection_id: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateIssueRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
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

pub async fn list_issues(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<IssueQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<QualityIssue>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id(&claims, &headers);

    let issues = match (query.status.as_ref(), query.severity.as_ref()) {
        (Some(st), Some(sv)) => sqlx::query_as::<_, QualityIssue>(r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qa_quality_issues WHERE tenant_id = $1 AND status = $2 AND severity = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#).bind(tenant_id).bind(st).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), None) => sqlx::query_as::<_, QualityIssue>(r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qa_quality_issues WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(tenant_id).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(sv)) => sqlx::query_as::<_, QualityIssue>(r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qa_quality_issues WHERE tenant_id = $1 AND severity = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(tenant_id).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, QualityIssue>(r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qa_quality_issues WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(tenant_id).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match issues {
        Ok(data) => Json(ApiResponse::success(data, "获取质量问题列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch issues: {}", e);
            Json(ApiResponse::error(500, "获取质量问题列表失败"))
        }
    }
}

pub async fn create_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateIssueRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let issue_no = format!(
        "QI-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let tenant_id = get_tenant_id(&claims, &headers);

    let related_inspection_id = req
        .related_inspection_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let issue = sqlx::query_as::<_, QualityIssue>(r#"INSERT INTO qa_quality_issues (tenant_id, issue_no, title, description, severity, source, related_inspection_id, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8) RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#).bind(tenant_id).bind(issue_no).bind(req.title).bind(req.description).bind(req.severity).bind(req.source).bind(related_inspection_id).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(data, "质量问题创建成功")),
        Err(e) => {
            tracing::error!("Failed to create issue: {}", e);
            Json(ApiResponse::error(500, "质量问题创建失败"))
        }
    }
}

pub async fn get_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<QualityIssue>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let issue = sqlx::query_as::<_, QualityIssue>(r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qa_quality_issues WHERE id = $1 AND tenant_id = $2"#).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(data, "获取质量问题成功")),
        Err(e) => {
            tracing::error!("Failed to fetch issue: {}", e);
            Json(ApiResponse::error(500, "获取质量问题失败"))
        }
    }
}

pub async fn update_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateIssueRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let issue = sqlx::query_as::<_, QualityIssue>(r#"UPDATE qa_quality_issues SET title = COALESCE($2, title), description = COALESCE($3, description), severity = COALESCE($4, severity), status = COALESCE($5, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $6 RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.title).bind(req.description).bind(req.severity).bind(req.status).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(data, "质量问题更新成功")),
        Err(e) => {
            tracing::error!("Failed to update issue: {}", e);
            Json(ApiResponse::error(500, "质量问题更新失败"))
        }
    }
}

pub async fn resolve_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<QualityIssue>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let issue = sqlx::query_as::<_, QualityIssue>(r#"UPDATE qa_quality_issues SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(data, "质量问题已解决")),
        Err(e) => {
            tracing::error!("Failed to resolve issue: {}", e);
            Json(ApiResponse::error(500, "质量问题解决失败"))
        }
    }
}

pub async fn delete_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(r#"DELETE FROM qa_quality_issues WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "质量问题删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete issue: {}", e);
            Json(ApiResponse::error(500, "质量问题删除失败"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/issues", get(list_issues))
        .route("/issues", post(create_issue))
        .route("/issues/{id}", get(get_issue))
        .route("/issues/{id}", put(update_issue))
        .route("/issues/{id}", delete(delete_issue))
        .route("/issues/{id}/resolve", post(resolve_issue))
}
