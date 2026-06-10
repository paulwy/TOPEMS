use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;
use crate::utils::validate_required_field;
use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct AnnouncementQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/announcements", get(list_announcements).post(create_announcement))
        .route(
            "/api/v1/announcements/{id}",
            get(get_announcement).put(update_announcement).delete(delete_announcement),
        )
        .route("/api/v1/announcements/{id}/publish", post(publish_announcement))
        .route("/api/v1/announcements/{id}/unpublish", post(unpublish_announcement))
}

async fn list_announcements(
    State(state): State<ApiState>,
    Query(params): Query<AnnouncementQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<Announcement>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let priority_filter = params.priority.clone();

    let result = sqlx::query_as::<_, Announcement>(
        r#"
        SELECT id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at
        FROM announcements
        WHERE ($1::text IS NULL OR title ILIKE $1 OR content ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR priority = $3)
        ORDER BY publish_at DESC NULLS LAST, created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&priority_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(announcements) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM announcements
                WHERE ($1::text IS NULL OR title ILIKE $1 OR content ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR priority = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&priority_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(announcements, total, page, page_size),
                "获取公告列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取公告列表失败: {}", e);
            Json(api_error(500, "获取公告列表失败"))
        }
    }
}

async fn create_announcement(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateAnnouncementRequest>,
) -> Json<ApiResponse<Announcement>> {
    if let Err(e) = validate_required_field("公告标题", &req.title) {
        return Json(api_error(400, &e));
    }

    if let Err(e) = validate_required_field("作者", &req.author) {
        return Json(api_error(400, &e));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Announcement>(
        r#"
        INSERT INTO announcements (id, title, content, author, priority, expire_at, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
        RETURNING id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.author)
    .bind(&req.priority)
    .bind(&req.expire_at)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(announcement) => (
            Json(ApiResponse::success(announcement.clone(), "公告创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建公告失败: {}", e);
            (
                Json(api_error(500, "公告创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(announcement) = &result {
        serde_json::to_value(announcement).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "announcement".to_string(),
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

async fn get_announcement(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Announcement>> {
    let result = sqlx::query_as::<_, Announcement>(
        r#"
        SELECT id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at
        FROM announcements WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(announcement)) => Json(ApiResponse::success(announcement, "获取公告成功")),
        Ok(None) => Json(api_error(404, "公告不存在")),
        Err(e) => {
            tracing::error!("获取公告失败: {}", e);
            Json(api_error(500, "获取公告失败"))
        }
    }
}

async fn update_announcement(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateAnnouncementRequest>,
) -> Json<ApiResponse<Announcement>> {
    let existing = sqlx::query_as::<_, Announcement>(
        "SELECT id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at FROM announcements WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "公告不存在")),
        Err(e) => return Json(api_error(500, &format!("查询公告失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let title = req.title.unwrap_or(existing.title);
    let content = req.content.or(existing.content);
    let author = req.author.or(Some(existing.author));
    let status = req.status.unwrap_or(existing.status);
    let priority = req.priority.or(existing.priority);
    let expire_at = req.expire_at.or(existing.expire_at);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Announcement>(
        r#"
        UPDATE announcements SET
            title = $2, content = $3, author = $4, status = $5, priority = $6, expire_at = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&title)
    .bind(&content)
    .bind(&author)
    .bind(&status)
    .bind(&priority)
    .bind(expire_at)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(announcement) => (
            Json(ApiResponse::success(announcement.clone(), "公告更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新公告失败: {}", e);
            (
                Json(api_error(500, "公告更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(announcement) = &result {
        serde_json::to_value(announcement).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "announcement".to_string(),
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

async fn delete_announcement(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM announcements WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "公告删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "公告不存在")),
            "error".to_string(),
            Some("公告不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除公告失败: {}", e);
            (
                Json(api_error(500, "公告删除失败")),
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
        "announcement".to_string(),
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

async fn publish_announcement(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Announcement>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Announcement>(
        r#"
        UPDATE announcements SET
            status = 'published', publish_at = $2, updated_at = $3
        WHERE id = $1 AND status = 'draft'
        RETURNING id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(Some(announcement)) => (
            Json(ApiResponse::success(announcement.clone(), "公告发布成功")),
            "success".to_string(),
            None,
        ),
        Ok(None) => (
            Json(api_error(400, "公告不是草稿状态，无法发布")),
            "error".to_string(),
            Some("公告不是草稿状态".to_string()),
        ),
        Err(e) => {
            tracing::error!("发布公告失败: {}", e);
            (
                Json(api_error(500, "公告发布失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(Some(announcement)) = &result {
        serde_json::to_value(announcement).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "announcement".to_string(),
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

async fn unpublish_announcement(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Announcement>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Announcement>(
        r#"
        UPDATE announcements SET
            status = 'draft', publish_at = NULL, updated_at = $2
        WHERE id = $1 AND status = 'published'
        RETURNING id, title, content, author, status, priority, publish_at, expire_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(Some(announcement)) => (
            Json(ApiResponse::success(announcement.clone(), "公告已取消发布")),
            "success".to_string(),
            None,
        ),
        Ok(None) => (
            Json(api_error(400, "公告不是已发布状态，无法取消发布")),
            "error".to_string(),
            Some("公告不是已发布状态".to_string()),
        ),
        Err(e) => {
            tracing::error!("取消发布公告失败: {}", e);
            (
                Json(api_error(500, "取消发布公告失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(Some(announcement)) = &result {
        serde_json::to_value(announcement).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "announcement".to_string(),
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