use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

/// 校验反馈评分（1-5 星）
pub fn validate_rating(rating: i32) -> Result<(), String> {
    if (1..=5).contains(&rating) {
        Ok(())
    } else {
        Err(format!("rating must be between 1 and 5, got {}", rating))
    }
}

/// 根据主题和正文分类反馈类别
pub fn classify_feedback_category(subject: &str, body: &str) -> &'static str {
    let combined = format!("{} {}", subject.to_lowercase(), body.to_lowercase());
    if combined.contains("bug")
        || combined.contains("error")
        || combined.contains("crash")
        || combined.contains("broken")
        || combined.contains("fail")
    {
        return "bug";
    }
    if combined.contains("feature")
        || combined.contains("request")
        || combined.contains("suggest")
        || combined.contains("enhancement")
        || combined.contains("wish")
    {
        return "feature";
    }
    if combined.contains("great")
        || combined.contains("awesome")
        || combined.contains("love")
        || combined.contains("good")
        || combined.contains("excellent")
        || combined.contains("nice")
    {
        return "praise";
    }
    if combined.contains("slow")
        || combined.contains("bad")
        || combined.contains("terrible")
        || combined.contains("hate")
        || combined.contains("worst")
        || combined.contains("angry")
    {
        return "complaint";
    }
    "other"
}

/// 根据评分推断情感倾向
pub fn sentiment_from_rating(rating: i32) -> &'static str {
    if rating >= 4 {
        "positive"
    } else if rating == 3 {
        "neutral"
    } else {
        "negative"
    }
}

/// 校验反馈状态转换是否合法
pub fn is_valid_feedback_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "pending" => matches!(to, "open" | "in_progress" | "resolved" | "closed"),
        "open" | "in_progress" => matches!(to, "resolved" | "closed" | "pending"),
        "resolved" => matches!(to, "closed" | "open" | "in_progress"),
        "closed" => false,
        _ => false,
    }
}

/// 计算反馈评分统计（平均分、最低分、最高分、数量）
pub fn feedback_rating_stats(ratings: &[i32]) -> (f64, i32, i32, usize) {
    if ratings.is_empty() {
        return (0.0, 0, 0, 0);
    }
    let count = ratings.len();
    let sum: i64 = ratings.iter().map(|&r| r as i64).sum();
    let avg = sum as f64 / count as f64;
    let (min, max) = match (ratings.iter().min(), ratings.iter().max()) {
        (Some(&mn), Some(&mx)) => (mn, mx),
        _ => (0, 0),
    };
    (avg, min, max, count)
}

#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateFeedbackRequest {
    pub type_: String,
    pub title: String,
    pub description: String,
    pub screenshots: Option<Vec<String>>,
    pub satisfaction: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["feedback:write"])),
    path = "/api/core/feedbacks",
    request_body = CreateFeedbackRequest,
    tag = "feedback_ticket",
    responses(
        (status = 200, description = "OK"),
    ),
)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["feedback:read"])),
    path = "/api/core/feedbacks/{id}",
    tag = "feedback_ticket",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["feedback:read"])),
    path = "/api/core/feedbacks",
    tag = "feedback_ticket",
    responses(
        (status = 200, description = "OK"),
    ),
)]
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["feedback:update"])),
    path = "/api/core/feedbacks/{id}",
    request_body = ResponseFeedbackRequest,
    tag = "feedback_ticket",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["feedback:delete"])),
    path = "/api/core/feedbacks/{id}",
    tag = "feedback_ticket",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
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

    // Schema 防御：增量迁移 + 一致性自检（V69.3）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[feedback] Schema 防御检查失败: {:?}", e);
    }

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

#[cfg(test)]
mod tests {
    use super::*;

    // ---- validate_rating ----

    #[test]
    fn test_validate_rating_valid() {
        for r in 1..=5 {
            assert!(validate_rating(r).is_ok());
        }
    }

    #[test]
    fn test_validate_rating_invalid_low() {
        assert!(validate_rating(0).is_err());
        assert!(validate_rating(-1).is_err());
        assert!(validate_rating(-100).is_err());
    }

    #[test]
    fn test_validate_rating_invalid_high() {
        assert!(validate_rating(6).is_err());
        assert!(validate_rating(10).is_err());
        assert!(validate_rating(100).is_err());
    }

    #[test]
    fn test_validate_rating_boundary() {
        assert!(validate_rating(1).is_ok());
        assert!(validate_rating(5).is_ok());
        assert!(validate_rating(0).is_err());
        assert!(validate_rating(6).is_err());
    }

    #[test]
    fn test_validate_rating_error_message() {
        let err = validate_rating(0).unwrap_err();
        assert!(err.contains("0"));
        assert!(err.contains("1"));
        assert!(err.contains("5"));
    }

    // ---- classify_feedback_category ----

    #[test]
    fn test_classify_category_bug() {
        assert_eq!(classify_feedback_category("Bug report", ""), "bug");
        assert_eq!(classify_feedback_category("", "app crashes"), "bug");
        assert_eq!(classify_feedback_category("ERROR", ""), "bug");
        assert_eq!(classify_feedback_category("broken link", ""), "bug");
        assert_eq!(classify_feedback_category("login fails", ""), "bug");
    }

    #[test]
    fn test_classify_category_feature() {
        assert_eq!(classify_feedback_category("Feature request", ""), "feature");
        assert_eq!(
            classify_feedback_category("", "suggest improvement"),
            "feature"
        );
        assert_eq!(classify_feedback_category("enhancement", ""), "feature");
        assert_eq!(classify_feedback_category("wish list", ""), "feature");
    }

    #[test]
    fn test_classify_category_praise() {
        assert_eq!(classify_feedback_category("Great app", ""), "praise");
        assert_eq!(classify_feedback_category("", "love it"), "praise");
        assert_eq!(classify_feedback_category("excellent work", ""), "praise");
        assert_eq!(classify_feedback_category("nice design", ""), "praise");
    }

    #[test]
    fn test_classify_category_complaint() {
        assert_eq!(classify_feedback_category("slow loading", ""), "complaint");
        assert_eq!(classify_feedback_category("bad service", ""), "complaint");
        assert_eq!(
            classify_feedback_category("terrible experience", ""),
            "complaint"
        );
        assert_eq!(classify_feedback_category("worst app", ""), "complaint");
    }

    #[test]
    fn test_classify_category_other() {
        assert_eq!(classify_feedback_category("hello", ""), "other");
        assert_eq!(classify_feedback_category("", "general inquiry"), "other");
        assert_eq!(classify_feedback_category("question", ""), "other");
    }

    #[test]
    fn test_classify_category_case_insensitive() {
        assert_eq!(classify_feedback_category("BUG", ""), "bug");
        assert_eq!(classify_feedback_category("FEATURE", ""), "feature");
        assert_eq!(classify_feedback_category("GREAT", ""), "praise");
    }

    // ---- sentiment_from_rating ----

    #[test]
    fn test_sentiment_positive() {
        assert_eq!(sentiment_from_rating(4), "positive");
        assert_eq!(sentiment_from_rating(5), "positive");
        assert_eq!(sentiment_from_rating(6), "positive");
        assert_eq!(sentiment_from_rating(100), "positive");
    }

    #[test]
    fn test_sentiment_neutral() {
        assert_eq!(sentiment_from_rating(3), "neutral");
    }

    #[test]
    fn test_sentiment_negative() {
        assert_eq!(sentiment_from_rating(1), "negative");
        assert_eq!(sentiment_from_rating(2), "negative");
        assert_eq!(sentiment_from_rating(0), "negative");
        assert_eq!(sentiment_from_rating(-1), "negative");
    }

    #[test]
    fn test_sentiment_boundary() {
        assert_eq!(sentiment_from_rating(3), "neutral");
        assert_eq!(sentiment_from_rating(4), "positive");
        assert_eq!(sentiment_from_rating(2), "negative");
    }

    // ---- is_valid_feedback_transition ----

    #[test]
    fn test_valid_transition_same_state() {
        assert!(is_valid_feedback_transition("pending", "pending"));
        assert!(is_valid_feedback_transition("resolved", "resolved"));
        assert!(is_valid_feedback_transition("closed", "closed"));
    }

    #[test]
    fn test_valid_transition_pending() {
        assert!(is_valid_feedback_transition("pending", "open"));
        assert!(is_valid_feedback_transition("pending", "in_progress"));
        assert!(is_valid_feedback_transition("pending", "resolved"));
        assert!(is_valid_feedback_transition("pending", "closed"));
    }

    #[test]
    fn test_valid_transition_open_in_progress() {
        assert!(is_valid_feedback_transition("open", "resolved"));
        assert!(is_valid_feedback_transition("open", "closed"));
        assert!(is_valid_feedback_transition("in_progress", "resolved"));
        assert!(is_valid_feedback_transition("in_progress", "closed"));
    }

    #[test]
    fn test_invalid_transition_closed() {
        assert!(!is_valid_feedback_transition("closed", "pending"));
        assert!(!is_valid_feedback_transition("closed", "open"));
        assert!(!is_valid_feedback_transition("closed", "resolved"));
    }

    #[test]
    fn test_invalid_transition_unknown() {
        assert!(!is_valid_feedback_transition("unknown", "pending"));
        assert!(!is_valid_feedback_transition("pending", "unknown"));
    }

    // ---- feedback_rating_stats ----

    #[test]
    fn test_rating_stats_empty() {
        let (avg, min, max, count) = feedback_rating_stats(&[]);
        assert_eq!(avg, 0.0);
        assert_eq!(min, 0);
        assert_eq!(max, 0);
        assert_eq!(count, 0);
    }

    #[test]
    fn test_rating_stats_single() {
        let (avg, min, max, count) = feedback_rating_stats(&[3]);
        assert_eq!(avg, 3.0);
        assert_eq!(min, 3);
        assert_eq!(max, 3);
        assert_eq!(count, 1);
    }

    #[test]
    fn test_rating_stats_multiple() {
        let (avg, min, max, count) = feedback_rating_stats(&[1, 2, 3, 4, 5]);
        assert_eq!(avg, 3.0);
        assert_eq!(min, 1);
        assert_eq!(max, 5);
        assert_eq!(count, 5);
    }

    #[test]
    fn test_rating_stats_all_same() {
        let (avg, min, max, count) = feedback_rating_stats(&[5, 5, 5]);
        assert_eq!(avg, 5.0);
        assert_eq!(min, 5);
        assert_eq!(max, 5);
        assert_eq!(count, 3);
    }

    #[test]
    fn test_rating_stats_avg_precision() {
        let (avg, min, max, count) = feedback_rating_stats(&[1, 2]);
        assert!((avg - 1.5).abs() < 0.0001);
        assert_eq!(min, 1);
        assert_eq!(max, 2);
        assert_eq!(count, 2);
    }
}
