use axum::{
    extract::{State, Json, Query},
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row, postgres::PgRow};
use uuid::Uuid;

use topems_shared::{ApiResponse, AuthState};
use super::auth_utils::extract_user_id_from_token;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub is_read: bool,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

impl Notification {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            title: row.try_get("title")?,
            content: row.try_get("content")?,
            notification_type: row.try_get("notification_type")?,
            is_read: row.try_get("is_read")?,
            data: row.try_get("data")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub items: Vec<Notification>,
    pub total: i64,
    pub unread_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetNotificationsQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
    pub is_read: Option<bool>,
}

pub async fn get_notifications(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<GetNotificationsQuery>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);
    let offset = (page - 1) * size;

    let query_str = if params.is_read.is_some() {
        "SELECT id, user_id, title, content, notification_type, is_read, data, created_at FROM notifications WHERE user_id = $1 AND is_read = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
    } else {
        "SELECT id, user_id, title, content, notification_type, is_read, data, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    };

    let query = if let Some(is_read) = params.is_read {
        sqlx::query(query_str)
            .bind(user_id)
            .bind(is_read)
            .bind(size)
            .bind(offset)
    } else {
        sqlx::query(query_str)
            .bind(user_id)
            .bind(size)
            .bind(offset)
    };

    let items = match query.fetch_all(&pool).await {
        Ok(rows) => rows.into_iter()
            .filter_map(|row| Notification::from_row(&row).ok())
            .collect(),
        Err(e) => {
            tracing::error!("查询通知失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")));
        }
    };

    let total = match sqlx::query("SELECT COUNT(*) FROM notifications WHERE user_id = $1")
        .bind(user_id)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => row.try_get::<i64, _>(0).unwrap_or(0),
        Err(e) => {
            tracing::error!("统计通知数量失败: {}", e);
            0
        }
    };

    let unread_count = match sqlx::query("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false")
        .bind(user_id)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => row.try_get::<i64, _>(0).unwrap_or(0),
        Err(e) => {
            tracing::error!("统计未读通知数量失败: {}", e);
            0
        }
    };

    let response = NotificationListResponse {
        items,
        total,
        unread_count,
    };

    (StatusCode::OK, Json(ApiResponse::success(response, "获取通知列表成功")))
}

pub async fn get_unread_count(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    let count = match sqlx::query("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false")
        .bind(user_id)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => row.try_get::<i64, _>(0).unwrap_or(0),
        Err(e) => {
            tracing::error!("统计未读通知数量失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")));
        }
    };

    (StatusCode::OK, Json(ApiResponse::success(count, "获取未读数量成功")))
}

pub async fn mark_all_read(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    match sqlx::query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false")
        .bind(user_id)
        .execute(&pool)
        .await
    {
        Ok(_) => (StatusCode::OK, Json(ApiResponse::success((), "全部标记已读成功"))),
        Err(e) => {
            tracing::error!("标记已读失败: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")))
        }
    }
}