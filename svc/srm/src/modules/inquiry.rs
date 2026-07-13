use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateInquiryRequest, Inquiry, UpdateInquiryRequest};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListInquiryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/api/srm/inquiries",
            get(list_inquiries).post(create_inquiry),
        )
        .route(
            "/api/srm/inquiries/{id}",
            get(get_inquiry).put(update_inquiry).delete(delete_inquiry),
        )
        .route("/api/srm/inquiries/{id}/publish", post(publish_inquiry))
        .route("/api/srm/inquiries/{id}/close", post(close_inquiry))
        .with_state(state);

    Ok(app)
}

async fn list_inquiries(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListInquiryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let category_filter = params.category.clone();

    let query = format!(
        r#"
        SELECT id, inquiry_no, title, description, category, urgency, status, published_at, deadline,
               creator, department, quotation_count, items, remarks, created_at, updated_at
        FROM plugin_srm.inquiries
        WHERE ($1::text IS NULL OR title ILIKE $1 OR inquiry_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR category = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    );

    let result = sqlx::query_as::<_, Inquiry>(&query)
        .bind(&search_pattern)
        .bind(&status_filter)
        .bind(&category_filter)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

    match result {
        Ok(inquiries) => {
            let count_query = format!(
                r#"
                SELECT COUNT(*) FROM plugin_srm.inquiries
                WHERE ($1::text IS NULL OR title ILIKE $1 OR inquiry_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR category = $3)
                "#,
            );

            let total = sqlx::query_scalar::<_, i64>(&count_query)
                .bind(&search_pattern)
                .bind(&status_filter)
                .bind(&category_filter)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": inquiries,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取询价列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取询价列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取询价列表失败",
            ))
        }
    }
}

async fn create_inquiry(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateInquiryRequest>,
) -> Json<ApiResponse<Inquiry>> {
    if req.inquiry_no.is_empty() || req.title.is_empty() {
        return Json(ApiResponse::<Inquiry>::error(400, "询价编号和标题不能为空"));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.inquiries WHERE inquiry_no = $1",
    )
    .bind(&req.inquiry_no)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    if existing > 0 {
        return Json(ApiResponse::<Inquiry>::error(400, "询价编号已存在"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let deadline = req.deadline.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        INSERT INTO plugin_srm.inquiries (id, inquiry_no, title, description, category, urgency, status, deadline, items, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, inquiry_no, title, description, category, urgency, status, published_at, deadline, creator, department, quotation_count, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.inquiry_no)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.urgency)
    .bind("draft")
    .bind(deadline)
    .bind(&req.items)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(inquiry) => Json(ApiResponse::success(inquiry, "询价创建成功")),
        Err(e) => {
            tracing::error!("创建询价失败: {}", e);
            Json(ApiResponse::<Inquiry>::error(500, "询价创建失败"))
        }
    }
}

async fn get_inquiry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Inquiry>> {
    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        SELECT id, inquiry_no, title, description, category, urgency, status, published_at, deadline,
               creator, department, quotation_count, items, remarks, created_at, updated_at
        FROM plugin_srm.inquiries WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inquiry)) => Json(ApiResponse::success(inquiry, "获取询价成功")),
        Ok(None) => Json(ApiResponse::<Inquiry>::error(404, "询价不存在")),
        Err(e) => {
            tracing::error!("获取询价失败: {}", e);
            Json(ApiResponse::<Inquiry>::error(500, "获取询价失败"))
        }
    }
}

async fn update_inquiry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInquiryRequest>,
) -> Json<ApiResponse<Inquiry>> {
    let now = Utc::now();

    let deadline = req.deadline.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        UPDATE plugin_srm.inquiries SET
            title = COALESCE($2, title),
            description = COALESCE($3, description),
            category = COALESCE($4, category),
            urgency = COALESCE($5, urgency),
            deadline = COALESCE($6, deadline),
            items = COALESCE($7, items),
            remarks = COALESCE($8, remarks),
            updated_at = $9
        WHERE id = $1
        RETURNING id, inquiry_no, title, description, category, urgency, status, published_at, deadline, creator, department, quotation_count, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.title)
    .bind(req.description)
    .bind(req.category)
    .bind(req.urgency)
    .bind(deadline)
    .bind(req.items)
    .bind(req.remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(inquiry) => Json(ApiResponse::success(inquiry, "询价更新成功")),
        Err(e) => {
            tracing::error!("更新询价失败: {}", e);
            Json(ApiResponse::<Inquiry>::error(500, "询价更新失败"))
        }
    }
}

async fn delete_inquiry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM plugin_srm.inquiries WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "询价删除成功")),
        Ok(_) => Json(ApiResponse::<bool>::error(404, "询价不存在")),
        Err(e) => {
            tracing::error!("删除询价失败: {}", e);
            Json(ApiResponse::<bool>::error(500, "询价删除失败"))
        }
    }
}

async fn publish_inquiry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Inquiry>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        UPDATE plugin_srm.inquiries SET
            status = 'published',
            published_at = $2,
            updated_at = $2
        WHERE id = $1 AND status = 'draft'
        RETURNING id, inquiry_no, title, description, category, urgency, status, published_at, deadline, creator, department, quotation_count, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inquiry)) => Json(ApiResponse::success(inquiry, "询价发布成功")),
        Ok(None) => Json(ApiResponse::<Inquiry>::error(400, "询价状态不允许发布")),
        Err(e) => {
            tracing::error!("发布询价失败: {}", e);
            Json(ApiResponse::<Inquiry>::error(500, "发布询价失败"))
        }
    }
}

async fn close_inquiry(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Inquiry>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Inquiry>(
        r#"
        UPDATE plugin_srm.inquiries SET
            status = 'closed',
            updated_at = $2
        WHERE id = $1 AND status IN ('published', 'draft')
        RETURNING id, inquiry_no, title, description, category, urgency, status, published_at, deadline, creator, department, quotation_count, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inquiry)) => Json(ApiResponse::success(inquiry, "询价已关闭")),
        Ok(None) => Json(ApiResponse::<Inquiry>::error(400, "询价状态不允许关闭")),
        Err(e) => {
            tracing::error!("关闭询价失败: {}", e);
            Json(ApiResponse::<Inquiry>::error(500, "关闭询价失败"))
        }
    }
}
