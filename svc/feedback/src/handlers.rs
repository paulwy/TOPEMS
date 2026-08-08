use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use topems_shared::{ApiResponse, Claims};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Feedback {
    pub id: Uuid,
    pub user_id: String,
    pub type_: String,
    pub title: String,
    pub description: String,
    pub screenshots: Vec<String>,
    pub satisfaction: i32,
    pub status: String,
    pub response: String,
    pub responded_by: Option<String>,
    pub responded_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFeedbackRequest {
    pub type_: String,
    pub title: String,
    pub description: String,
    pub screenshots: Option<Vec<String>>,
    pub satisfaction: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ResponseFeedbackRequest {
    pub response: String,
}

#[derive(Debug, FromRow)]
struct FeedbackOwnerId {
    user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ListFeedbackParams {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub status: Option<String>,
    #[allow(dead_code)]
    pub user_id: Option<String>,
}

pub async fn create_feedback(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateFeedbackRequest>,
) -> Json<ApiResponse<Feedback>> {
    let feedback = sqlx::query_as::<_, Feedback>(
        r#"INSERT INTO core_feedbacks (user_id, type, title, description, screenshots, satisfaction)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, user_id, type as type_, title, description, screenshots, satisfaction, status, response, responded_by, responded_at, created_at, updated_at"#,
    )
    .bind(claims.sub)
    .bind(payload.type_)
    .bind(payload.title)
    .bind(payload.description)
    .bind(&payload.screenshots.unwrap_or_default())
    .bind(payload.satisfaction.unwrap_or(3))
    .fetch_one(&pool)
    .await;

    match feedback {
        Ok(feedback) => Json(ApiResponse::success(feedback, "创建反馈成功")),
        Err(e) => {
            tracing::error!("Failed to create feedback: {}", e);
            Json(ApiResponse::error(500, "创建反馈失败"))
        }
    }
}

pub async fn get_feedback(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Feedback>> {
    let feedback = sqlx::query_as::<_, Feedback>(
        r#"SELECT id, user_id, type as type_, title, description, screenshots, satisfaction, status, response, responded_by, responded_at, created_at, updated_at
           FROM core_feedbacks WHERE id = $1"#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match feedback {
        Ok(Some(feedback)) => Json(ApiResponse::success(feedback, "获取反馈成功")),
        Ok(None) => Json(ApiResponse::error(404, "反馈不存在")),
        Err(e) => {
            tracing::error!("Failed to get feedback: {}", e);
            Json(ApiResponse::error(500, "获取反馈失败"))
        }
    }
}

pub async fn list_feedbacks(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListFeedbackParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let mut query = String::from(
        r#"SELECT id, user_id, type as type_, title, description, screenshots, satisfaction, status, response, responded_by, responded_at, created_at, updated_at
           FROM core_feedbacks"#,
    );
    let mut count_query =
        String::from("SELECT COUNT(*) FROM core_feedbacks WHERE deleted_at IS NULL");
    let mut conditions = Vec::new();

    let mut args = Vec::new();

    if let Some(type_) = params.type_ {
        conditions.push(format!("type = ${}", args.len() + 1));
        args.push(type_);
    }

    if let Some(status) = params.status {
        conditions.push(format!("status = ${}", args.len() + 1));
        args.push(status);
    }

    if !claims.is_superuser {
        conditions.push(format!("user_id = ${}", args.len() + 1));
        args.push(claims.sub);
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
        count_query.push_str(" WHERE ");
        count_query.push_str(&conditions.join(" AND "));
    }

    query.push_str(" ORDER BY created_at DESC LIMIT $1 OFFSET $2");

    let mut sqlx_query = sqlx::query_as::<_, Feedback>(&query);
    for arg in &args {
        sqlx_query = sqlx_query.bind(arg);
    }
    let feedbacks = sqlx_query
        .bind(page_size)
        .bind(offset)
        .fetch_all(&pool)
        .await;

    match feedbacks {
        Ok(feedbacks) => {
            let mut count_sqlx = sqlx::query_scalar::<_, i64>(&count_query);
            for arg in &args {
                count_sqlx = count_sqlx.bind(arg);
            }
            let total = count_sqlx.fetch_one(&pool).await.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": feedbacks,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取反馈列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to list feedbacks: {}", e);
            Json(ApiResponse::error(500, "获取反馈列表失败"))
        }
    }
}

pub async fn response_feedback(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ResponseFeedbackRequest>,
) -> Json<ApiResponse<bool>> {
    if !claims.is_superuser {
        return Json(ApiResponse::error(403, "无权限回复反馈"));
    }

    let result = sqlx::query(
        r#"UPDATE core_feedbacks SET status = 'resolved', response = $1, responded_by = $2, responded_at = NOW(), updated_at = NOW()
           WHERE id = $3"#,
    )
    .bind(payload.response)
    .bind(claims.sub)
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "回复反馈成功")),
        Err(e) => {
            tracing::error!("Failed to response feedback: {}", e);
            Json(ApiResponse::error(500, "回复反馈失败"))
        }
    }
}

pub async fn delete_feedback(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let feedback = sqlx::query_as::<_, FeedbackOwnerId>(
        r#"SELECT user_id FROM core_feedbacks WHERE deleted_at IS NULL AND id = $1"#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match feedback {
        Ok(Some(feedback)) => {
            if feedback.user_id != claims.sub && !claims.is_superuser {
                return Json(ApiResponse::error(403, "无权限删除反馈"));
            }

            let result =
                sqlx::query(r#"UPDATE core_feedbacks SET deleted_at = NOW() WHERE id = $1"#)
                    .bind(id)
                    .execute(&pool)
                    .await;

            match result {
                Ok(_) => Json(ApiResponse::success(true, "删除反馈成功")),
                Err(e) => {
                    tracing::error!("Failed to delete feedback: {}", e);
                    Json(ApiResponse::error(500, "删除反馈失败"))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "反馈不存在")),
        Err(e) => {
            tracing::error!("Failed to delete feedback: {}", e);
            Json(ApiResponse::error(500, "删除反馈失败"))
        }
    }
}

pub async fn init_feedback_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_feedbacks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            screenshots TEXT[],
            satisfaction INTEGER DEFAULT 3,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            response TEXT,
            responded_by VARCHAR(255),
            responded_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_feedbacks_user_id
          ON core_feedbacks (user_id)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_feedbacks_status
          ON core_feedbacks (status)
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub fn feedback_routes() -> Router<PgPool> {
    Router::new()
        .route("/feedbacks", post(create_feedback).get(list_feedbacks))
        .route(
            "/feedbacks/{id}",
            get(get_feedback)
                .put(response_feedback)
                .delete(delete_feedback),
        )
}
