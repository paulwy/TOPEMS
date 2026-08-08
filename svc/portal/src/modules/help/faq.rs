use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_core::response::api_error;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Faq {
    pub id: Uuid,
    pub question: String,
    pub answer: String,
    pub category: String,
    pub views: i64,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaqQuery {
    pub category: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaqListResponse {
    pub items: Vec<Faq>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFaqRequest {
    pub question: String,
    pub answer: String,
    pub category: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFaqRequest {
    pub question: Option<String>,
    pub answer: Option<String>,
    pub category: Option<String>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

pub async fn list_faqs(
    State(state): State<AppState>,
    Query(query): Query<FaqQuery>,
) -> Json<ApiResponse<FaqListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let category = query.category.clone();
    let keyword = query.keyword.clone();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_faqs
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR question ILIKE '%' || $2 || '%' OR answer ILIKE '%' || $2 || '%')"#,
    )
    .bind(category.clone())
    .bind(keyword.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询FAQ总数失败: {}", e);
            return Json(api_error(500, "查询FAQ总数失败"));
        }
    };

    let items: Vec<Faq> = match sqlx::query_as(
        r#"SELECT id, question, answer, category, views, is_active, sort_order, created_at, updated_at
           FROM core_faqs
           WHERE is_active = true
             AND ($1::text IS NULL OR category = $1)
             AND ($2::text IS NULL OR question ILIKE '%' || $2 || '%' OR answer ILIKE '%' || $2 || '%')
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
            tracing::error!("查询FAQ列表失败: {}", e);
            return Json(api_error(500, "查询FAQ列表失败"));
        }
    };

    Json(api_success(FaqListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_faq(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Faq>> {
    let faq: Option<Faq> = match sqlx::query_as(
        r#"SELECT id, question, answer, category, views, is_active, sort_order, created_at, updated_at
           FROM core_faqs WHERE id = $1 AND is_active = true"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询FAQ详情失败: {}", e);
            return Json(api_error(500, "查询FAQ详情失败"));
        }
    };

    match faq {
        Some(faq) => {
            let _ = sqlx::query!(
                r#"UPDATE core_faqs SET views = views + 1 WHERE id = $1"#,
                id
            )
            .execute(&state.pool)
            .await;
            Json(api_success(faq))
        }
        None => Json(api_error(404, "FAQ不存在")),
    }
}

pub async fn create_faq(
    State(state): State<AppState>,
    Json(req): Json<CreateFaqRequest>,
) -> Json<ApiResponse<Faq>> {
    if req.question.trim().is_empty() {
        return Json(api_error(400, "问题不能为空"));
    }
    if req.answer.trim().is_empty() {
        return Json(api_error(400, "答案不能为空"));
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let faq: Faq = match sqlx::query_as(
        r#"INSERT INTO core_faqs (id, question, answer, category, views, is_active, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, true, $5, $6, $7)
           RETURNING id, question, answer, category, views, is_active, sort_order, created_at, updated_at"#,
    )
    .bind(id)
    .bind(req.question)
    .bind(req.answer)
    .bind(req.category)
    .bind(req.sort_order.unwrap_or(0))
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建FAQ失败: {}", e);
            return Json(api_error(500, "创建FAQ失败"));
        }
    };

    Json(api_success(faq))
}

pub async fn update_faq(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateFaqRequest>,
) -> Json<ApiResponse<Faq>> {
    let faq: Option<Faq> = match sqlx::query_as(
        r#"UPDATE core_faqs
           SET question = COALESCE($1, question),
               answer = COALESCE($2, answer),
               category = COALESCE($3, category),
               is_active = COALESCE($4, is_active),
               sort_order = COALESCE($5, sort_order),
               updated_at = $6
           WHERE id = $7
           RETURNING id, question, answer, category, views, is_active, sort_order, created_at, updated_at"#,
    )
    .bind(req.question)
    .bind(req.answer)
    .bind(req.category)
    .bind(req.is_active)
    .bind(req.sort_order)
    .bind(chrono::Utc::now())
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新FAQ失败: {}", e);
            return Json(api_error(500, "更新FAQ失败"));
        }
    };

    match faq {
        Some(faq) => Json(api_success(faq)),
        None => Json(api_error(404, "FAQ不存在")),
    }
}

pub async fn delete_faq(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query!(
        r#"UPDATE core_faqs SET is_active = false, updated_at = $1 WHERE id = $2"#,
        chrono::Utc::now(),
        id
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "FAQ不存在")),
        Err(e) => {
            tracing::error!("删除FAQ失败: {}", e);
            Json(api_error(500, "删除FAQ失败"))
        }
    }
}

pub async fn get_faq_categories(State(state): State<AppState>) -> Json<ApiResponse<Vec<String>>> {
    let categories: Vec<String> = match sqlx::query_scalar(
        r#"SELECT DISTINCT category FROM core_faqs WHERE is_active = true ORDER BY category"#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询FAQ分类失败: {}", e);
            return Json(api_error(500, "查询FAQ分类失败"));
        }
    };

    Json(api_success(categories))
}
