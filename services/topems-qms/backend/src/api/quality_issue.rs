use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::models::{CreateQualityIssueRequest, QualityIssue, UpdateQualityIssueRequest};
use topems_shared::{ApiResponse, api_error};

use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct QualityIssueQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/issues", get(list_issues).post(create_issue))
        .route(
            "/api/v1/issues/{id}",
            get(get_issue).put(update_issue),
        );

    Ok(app)
}

async fn list_issues(
    State(state): State<ApiState>,
    Query(params): Query<QualityIssueQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, QualityIssue>(
        r#"
        SELECT id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
        FROM qms.quality_issues
        WHERE ($1::text IS NULL OR title ILIKE $1 OR description ILIKE $1)
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
        Ok(issues) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM qms.quality_issues
                WHERE ($1::text IS NULL OR title ILIKE $1 OR description ILIKE $1)
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
                    "issues": issues,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取质量问题列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取质量问题列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取质量问题列表失败"))
        }
    }
}

async fn create_issue(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateQualityIssueRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    if req.title.is_empty() {
        return Json(api_error(400, "质量问题标题不能为空"));
    }

    if req.severity.is_empty() {
        return Json(api_error(400, "严重程度不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, QualityIssue>(
        r#"
        INSERT INTO qms.quality_issues (id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.severity)
    .bind(&req.source)
    .bind(req.related_inspection_id)
    .bind(&req.assigned_to)
    .bind(&req.priority)
    .bind(req.due_date)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(issue) => (
            Json(ApiResponse::success(issue.clone(), "质量问题创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建质量问题失败: {}", e);
            (
                Json(api_error(500, "质量问题创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(issue) = &result {
        serde_json::to_value(issue).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "quality_issue".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_issue(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<QualityIssue>> {
    let result = sqlx::query_as::<_, QualityIssue>(
        r#"
        SELECT id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
        FROM qms.quality_issues WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(issue)) => Json(ApiResponse::success(issue, "获取质量问题成功")),
        Ok(None) => Json(ApiResponse::<QualityIssue>::error(404, "质量问题不存在")),
        Err(e) => {
            tracing::error!("获取质量问题失败: {}", e);
            Json(ApiResponse::<QualityIssue>::error(500, "获取质量问题失败"))
        }
    }
}

async fn update_issue(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQualityIssueRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let existing = sqlx::query_as::<_, QualityIssue>(
        "SELECT id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at FROM qms.quality_issues WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::<QualityIssue>::error(404, "质量问题不存在")),
        Err(e) => return Json(ApiResponse::<QualityIssue>::error(500, &format!("查询质量问题失败: {}", e))),
    };

    let title = req.title.unwrap_or(existing.title);
    let description = req.description.unwrap_or(existing.description);
    let severity = req.severity.unwrap_or(existing.severity);
    let status = req.status.unwrap_or(existing.status);
    let assigned_to = req.assigned_to.or(existing.assigned_to);
    let priority = req.priority.or(existing.priority);
    let due_date = req.due_date.or(existing.due_date);
    let now = Utc::now();

    let result = sqlx::query_as::<_, QualityIssue>(
        r#"
        UPDATE qms.quality_issues SET
            title = $2, description = $3, severity = $4, status = $5, assigned_to = $6, priority = $7, due_date = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&title)
    .bind(&description)
    .bind(&severity)
    .bind(&status)
    .bind(&assigned_to)
    .bind(&priority)
    .bind(due_date)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(issue) => Json(ApiResponse::success(issue, "质量问题更新成功")),
        Err(e) => {
            tracing::error!("更新质量问题失败: {}", e);
            Json(ApiResponse::<QualityIssue>::error(500, "质量问题更新失败"))
        }
    }
}
