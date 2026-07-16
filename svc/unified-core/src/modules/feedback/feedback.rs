use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::AppState;
use topems_shared::auth::Claims;

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
    pub user_id: Option<String>,
}

pub async fn create_feedback(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateFeedbackRequest>,
) -> impl IntoResponse {
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
    .fetch_one(&state.pool)
    .await;

    match feedback {
        Ok(feedback) => (StatusCode::CREATED, Json(feedback)).into_response(),
        Err(e) => {
            tracing::error!("Failed to create feedback: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_feedback(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let feedback = sqlx::query_as::<_, Feedback>(
        r#"SELECT id, user_id, type as type_, title, description, screenshots, satisfaction, status, response, responded_by, responded_at, created_at, updated_at
           FROM core_feedbacks WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match feedback {
        Ok(feedback) => (StatusCode::OK, Json(feedback)).into_response(),
        Err(sqlx::Error::RowNotFound) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            tracing::error!("Failed to get feedback: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn list_feedbacks(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListFeedbackParams>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let mut query = String::from(
        r#"SELECT id, user_id, type as type_, title, description, screenshots, satisfaction, status, response, responded_by, responded_at, created_at, updated_at
           FROM core_feedbacks"#,
    );
    let mut conditions = Vec::new();
    let mut args: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send>> = Vec::new();

    if let Some(type_) = params.type_ {
        conditions.push(format!("type = ${}", args.len() + 1));
        args.push(Box::new(type_));
    }

    if let Some(status) = params.status {
        conditions.push(format!("status = ${}", args.len() + 1));
        args.push(Box::new(status));
    }

    if !claims.is_superuser {
        conditions.push(format!("user_id = ${}", args.len() + 1));
        args.push(Box::new(claims.sub));
    }

    if !conditions.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&conditions.join(" AND "));
    }

    query.push_str(" ORDER BY created_at DESC LIMIT $1 OFFSET $2");

    let feedbacks = sqlx::query_as::<_, Feedback>(&query)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await;

    match feedbacks {
        Ok(feedbacks) => (StatusCode::OK, Json(feedbacks)).into_response(),
        Err(e) => {
            tracing::error!("Failed to list feedbacks: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn response_feedback(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ResponseFeedbackRequest>,
) -> impl IntoResponse {
    if !claims.is_superuser {
        return StatusCode::FORBIDDEN.into_response();
    }

    let result = sqlx::query(
        r#"UPDATE core_feedbacks SET status = 'resolved', response = $1, responded_by = $2, responded_at = NOW(), updated_at = NOW()
           WHERE id = $3"#,
    )
    .bind(payload.response)
    .bind(claims.sub)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => {
            tracing::error!("Failed to response feedback: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn delete_feedback(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let feedback = sqlx::query_as::<_, FeedbackOwnerId>(r#"SELECT user_id FROM core_feedbacks WHERE id = $1"#)
        .bind(id)
        .fetch_one(&state.pool)
        .await;

    match feedback {
        Ok(feedback) => {
            if feedback.user_id != claims.sub && !claims.is_superuser {
                return StatusCode::FORBIDDEN.into_response();
            }

            let result = sqlx::query(r#"DELETE FROM core_feedbacks WHERE id = $1"#)
                .bind(id)
                .execute(&state.pool)
                .await;

            match result {
                Ok(_) => StatusCode::NO_CONTENT.into_response(),
                Err(e) => {
                    tracing::error!("Failed to delete feedback: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR.into_response()
                }
            }
        }
        Err(sqlx::Error::RowNotFound) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            tracing::error!("Failed to delete feedback: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
