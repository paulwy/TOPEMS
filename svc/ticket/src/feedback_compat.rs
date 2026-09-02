//! Feedback 兼容层（从 feedback 服务迁移至 ticket 服务）
//!
//! 将客户反馈作为 ticket 的一种类型（ticket_type = "customer_feedback"），
//! feedback 特有字段（screenshots, satisfaction, response）存储在 ticket.metadata JSON 中。
//!
//! API 兼容：保留 /feedbacks 端点，内部映射到 tickets 表。

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::models::{generate_ticket_number, Ticket};

/// Feedback 兼容响应结构（保持与原 feedback 服务 API 兼容）
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FeedbackCompat {
    pub id: Uuid,
    pub user_id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub title: String,
    pub description: String,
    pub screenshots: Vec<String>,
    pub satisfaction: i32,
    pub status: String,
    pub response: String,
    pub responded_by: Option<String>,
    pub responded_at: Option<chrono::DateTime<Utc>>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

impl From<Ticket> for FeedbackCompat {
    fn from(t: Ticket) -> Self {
        let meta = t.metadata.unwrap_or(serde_json::json!({}));
        FeedbackCompat {
            id: t.id,
            user_id: t.reporter_id.map(|u| u.to_string()).unwrap_or_default(),
            type_: t.ticket_type,
            title: t.title,
            description: t.description.unwrap_or_default(),
            screenshots: meta
                .get("screenshots")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            satisfaction: meta
                .get("satisfaction")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32)
                .unwrap_or(3),
            status: t.status,
            response: meta
                .get("response")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_default(),
            responded_by: meta
                .get("responded_by")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            responded_at: t.resolved_at,
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateFeedbackRequest {
    #[serde(rename = "type")]
    pub type_: String,
    pub title: String,
    pub description: String,
    pub screenshots: Option<Vec<String>>,
    pub satisfaction: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ResponseFeedbackRequest {
    pub response: String,
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

/// 创建反馈（兼容端点，内部创建 customer_feedback 类型的 ticket）
pub async fn create_feedback(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateFeedbackRequest>,
) -> Json<ApiResponse<FeedbackCompat>> {
    let ticket_no = generate_ticket_number("FB", Utc::now().timestamp_millis() as u64);
    let metadata = serde_json::json!({
        "screenshots": payload.screenshots.unwrap_or_default(),
        "satisfaction": payload.satisfaction.unwrap_or(3),
        "response": "",
    });

    let result = sqlx::query_as::<_, Ticket>(
        r#"INSERT INTO tickets (ticket_no, tenant_id, title, description, ticket_type, severity, status, source_service, reporter_id, tags, metadata)
           VALUES ($1, $2, $3, $4, 'customer_feedback', 'medium', 'open', 'feedback', $5, $6, $7)
           RETURNING id, ticket_no, tenant_id, title, description, ticket_type, severity, status, source_service, source_business_id, assignee_id, reporter_id, sla_due_at, resolved_at, closed_at, created_at, updated_at, tags, metadata"#,
    )
    .bind(ticket_no)
    .bind(Uuid::nil())
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(Uuid::parse_str(&claims.sub).ok())
    .bind(None::<Vec<String>>)
    .bind(metadata)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(ticket) => Json(ApiResponse::success(ticket.into(), "创建反馈成功")),
        Err(e) => {
            tracing::error!("Failed to create feedback via ticket: {}", e);
            Json(ApiResponse::error(500, "创建反馈失败"))
        }
    }
}

/// 获取反馈（兼容端点）
pub async fn get_feedback(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FeedbackCompat>> {
    let result = sqlx::query_as::<_, Ticket>(
        r#"SELECT id, ticket_no, tenant_id, title, description, ticket_type, severity, status, source_service, source_business_id, assignee_id, reporter_id, sla_due_at, resolved_at, closed_at, created_at, updated_at, tags, metadata
           FROM tickets WHERE id = $1 AND ticket_type = 'customer_feedback'"#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(ticket)) => Json(ApiResponse::success(ticket.into(), "获取反馈成功")),
        Ok(None) => Json(ApiResponse::error(404, "反馈不存在")),
        Err(e) => {
            tracing::error!("Failed to get feedback: {}", e);
            Json(ApiResponse::error(500, "获取反馈失败"))
        }
    }
}

/// 反馈列表（兼容端点）
pub async fn list_feedbacks(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListFeedbackParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let mut conditions = vec!["ticket_type = 'customer_feedback'".to_string()];
    let mut args: Vec<String> = Vec::new();

    if let Some(type_) = params.type_ {
        conditions.push(format!("metadata->>'type' = ${}", args.len() + 1));
        args.push(type_);
    }
    if let Some(status) = params.status {
        conditions.push(format!("status = ${}", args.len() + 1));
        args.push(status);
    }
    if !claims.is_superuser {
        conditions.push(format!("reporter_id = ${}", args.len() + 1));
        args.push(claims.sub.clone());
    }

    let where_clause = conditions.join(" AND ");

    let query = format!(
        r#"SELECT id, ticket_no, tenant_id, title, description, ticket_type, severity, status, source_service, source_business_id, assignee_id, reporter_id, sla_due_at, resolved_at, closed_at, created_at, updated_at, tags, metadata
           FROM tickets WHERE {} ORDER BY created_at DESC LIMIT ${} OFFSET ${}"#,
        where_clause,
        args.len() + 1,
        args.len() + 2
    );

    let count_query = format!("SELECT COUNT(*) FROM tickets WHERE {}", where_clause);

    let mut sqlx_query = sqlx::query_as::<_, Ticket>(&query);
    for arg in &args {
        sqlx_query = sqlx_query.bind(arg);
    }
    let tickets = sqlx_query
        .bind(page_size)
        .bind(offset)
        .fetch_all(&pool)
        .await;

    match tickets {
        Ok(tickets) => {
            let mut count_sqlx = sqlx::query_scalar::<_, i64>(&count_query);
            for arg in &args {
                count_sqlx = count_sqlx.bind(arg);
            }
            let total = count_sqlx.fetch_one(&pool).await.unwrap_or(0);
            let feedbacks: Vec<FeedbackCompat> = tickets.into_iter().map(Into::into).collect();

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

/// 响应反馈（兼容端点，更新 ticket.metadata.response 并标记 resolved）
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
        r#"UPDATE tickets
           SET status = 'resolved',
               resolved_at = NOW(),
               metadata = jsonb_set(
                   jsonb_set(COALESCE(metadata, '{}'::jsonb), '{response}', to_jsonb($1::text)),
                   '{responded_by}', to_jsonb($2::text)
               ),
               updated_at = NOW()
           WHERE id = $3 AND ticket_type = 'customer_feedback'"#,
    )
    .bind(&payload.response)
    .bind(&claims.sub)
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

/// 删除反馈（兼容端点，软删除 ticket）
pub async fn delete_feedback(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let ticket = sqlx::query_as::<_, Ticket>(
        r#"SELECT id, ticket_no, tenant_id, title, description, ticket_type, severity, status, source_service, source_business_id, assignee_id, reporter_id, sla_due_at, resolved_at, closed_at, created_at, updated_at, tags, metadata
           FROM tickets WHERE id = $1 AND ticket_type = 'customer_feedback'"#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match ticket {
        Ok(Some(t)) => {
            let reporter_str = t.reporter_id.map(|u| u.to_string()).unwrap_or_default();
            if reporter_str != claims.sub && !claims.is_superuser {
                return Json(ApiResponse::error(403, "无权限删除反馈"));
            }

            let result = sqlx::query(
                r#"UPDATE tickets SET status = 'cancelled', closed_at = NOW(), updated_at = NOW()
                   WHERE id = $1"#,
            )
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

pub fn feedback_compat_routes() -> Router<PgPool> {
    Router::new()
        .route("/feedbacks", post(create_feedback).get(list_feedbacks))
        .route(
            "/feedbacks/{id}",
            get(get_feedback)
                .put(response_feedback)
                .delete(delete_feedback),
        )
}
