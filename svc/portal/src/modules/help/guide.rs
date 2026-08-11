use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, api_success};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Guide {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub category: String,
    pub duration: String,
    pub lessons_count: i32,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GuideLesson {
    pub id: Uuid,
    pub guide_id: Uuid,
    pub title: String,
    pub content: String,
    pub duration: String,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideProgress {
    pub guide_id: Uuid,
    pub user_id: String,
    pub completed_lessons: Vec<Uuid>,
    pub progress: i32,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideQuery {
    pub category: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideListResponse {
    pub items: Vec<Guide>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuideDetailResponse {
    pub guide: Guide,
    pub lessons: Vec<GuideLesson>,
    pub progress: Option<GuideProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGuideRequest {
    pub title: String,
    pub description: String,
    pub category: String,
    pub duration: String,
    pub lessons_count: i32,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLessonRequest {
    pub title: String,
    pub content: String,
    pub duration: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct CompleteLessonRequest {
    pub lesson_id: Uuid,
}

pub async fn list_guides(
    State(state): State<AppState>,
    Query(query): Query<GuideQuery>,
) -> Json<ApiResponse<GuideListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let category = query.category.clone();
    let keyword = query.keyword.clone();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_guides
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')"#,
    )
    .bind(category.clone())
    .bind(keyword.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南总数失败: {}", e);
            return Json(api_error(500, "查询指南总数失败"));
        }
    };

    let items: Vec<Guide> = match sqlx::query_as(
        r#"SELECT id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at
           FROM core_guides
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR title ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(category)
    .bind(keyword)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南列表失败: {}", e);
            return Json(api_error(500, "查询指南列表失败"));
        }
    };

    Json(api_success(GuideListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_guide(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<GuideDetailResponse>> {
    let guide: Option<Guide> = match sqlx::query_as(
        r#"SELECT id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at
           FROM core_guides WHERE id = $1 AND is_active = true"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南详情失败: {}", e);
            return Json(api_error(500, "查询指南详情失败"));
        }
    };

    let guide = match guide {
        Some(g) => g,
        None => return Json(api_error(404, "指南不存在")),
    };

    let lessons: Vec<GuideLesson> = match sqlx::query_as(
        r#"SELECT id, guide_id, title, content, duration, sort_order, is_active, created_at
           FROM core_guide_lessons WHERE guide_id = $1 AND is_active = true ORDER BY sort_order ASC"#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南课程失败: {}", e);
            return Json(api_error(500, "查询指南课程失败"));
        }
    };

    Json(api_success(GuideDetailResponse {
        guide,
        lessons,
        progress: None,
    }))
}

pub async fn create_guide(
    State(state): State<AppState>,
    Json(req): Json<CreateGuideRequest>,
) -> Json<ApiResponse<Guide>> {
    if req.title.trim().is_empty() {
        return Json(api_error(400, "标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let guide: Guide = match sqlx::query_as(
        r#"INSERT INTO core_guides (id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9)
           RETURNING id, title, description, category, duration, lessons_count, is_active, sort_order, created_at, updated_at"#,
    )
    .bind(id)
    .bind(req.title)
    .bind(req.description)
    .bind(req.category)
    .bind(req.duration)
    .bind(req.lessons_count)
    .bind(req.sort_order.unwrap_or(0))
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建指南失败: {}", e);
            return Json(api_error(500, "创建指南失败"));
        }
    };

    Json(api_success(guide))
}

pub async fn add_lesson(
    State(state): State<AppState>,
    Path(guide_id): Path<Uuid>,
    Json(req): Json<CreateLessonRequest>,
) -> Json<ApiResponse<GuideLesson>> {
    if req.title.trim().is_empty() {
        return Json(api_error(400, "课程标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let lesson: GuideLesson = match sqlx::query_as(
        r#"INSERT INTO core_guide_lessons (id, guide_id, title, content, duration, sort_order, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7)
           RETURNING id, guide_id, title, content, duration, sort_order, is_active, created_at"#,
    )
    .bind(id)
    .bind(guide_id)
    .bind(req.title)
    .bind(req.content)
    .bind(req.duration)
    .bind(req.sort_order.unwrap_or(0))
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("添加课程失败: {}", e);
            return Json(api_error(500, "添加课程失败"));
        }
    };

    let _ = sqlx::query!(
        r#"UPDATE core_guides SET lessons_count = lessons_count + 1 WHERE id = $1"#,
        guide_id
    )
    .execute(&state.pool)
    .await;

    Json(api_success(lesson))
}

pub async fn get_guide_categories(State(state): State<AppState>) -> Json<ApiResponse<Vec<String>>> {
    let categories: Vec<String> = match sqlx::query_scalar(
        r#"SELECT DISTINCT category FROM core_guides WHERE is_active = true ORDER BY category"#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询指南分类失败: {}", e);
            return Json(api_error(500, "查询指南分类失败"));
        }
    };

    Json(api_success(categories))
}
