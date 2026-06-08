use axum::{extract::{Extension, Path, Query, State}, Json};
use chrono::Utc;
use uuid::Uuid;

use super::ApiState;
use crate::PaginationParams;
use crate::models::notification::{CreateNotificationRequest, Notification, NotificationListResponse};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, api_error};

pub async fn list_notifications(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<NotificationListResponse>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = ((page - 1) * page_size) as i64;
    
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    
    let notifications = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notification.notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3"
    )
    .bind(user_id)
    .bind(page_size as i64)
    .bind(offset)
    .fetch_all(&state.db)
    .await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("查询通知失败: {}", e);
            return Json(api_error(500, "查询通知失败"));
        }
    };
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notification.notifications WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    
    let unread_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notification.notifications WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    
    Json(ApiResponse::success(NotificationListResponse {
        notifications,
        total,
        page,
        page_size,
        unread_count,
    }, "Success"))
}

pub async fn list_unread_notifications(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Notification>>> {
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    
    let notifications = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notification.notifications 
         WHERE user_id = $1 AND is_read = false 
         ORDER BY created_at DESC"
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("查询未读通知失败: {}", e);
            return Json(api_error(500, "查询未读通知失败"));
        }
    };
    
    Json(ApiResponse::success(notifications, "Success"))
}

pub async fn get_unread_count(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<i64>> {
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notification.notifications WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    
    Json(ApiResponse::success(count, "Success"))
}

pub async fn get_notification(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Notification>> {
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    
    let notification = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notification.notifications WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("查询通知详情失败: {}", e);
            return Json(api_error(500, "查询通知详情失败"));
        }
    };
    
    match notification {
        Some(n) => Json(ApiResponse::success(n, "Success")),
        None => Json(api_error(404, "通知不存在")),
    }
}

pub async fn create_notification(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateNotificationRequest>,
) -> Json<ApiResponse<Notification>> {
    let id = Uuid::new_v4();
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    let now = Utc::now();
    
    let notification = match sqlx::query_as::<_, Notification>(
        "INSERT INTO notification.notifications 
         (id, user_id, title, content, notification_type, priority, data, link_url, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *"
    )
    .bind(id)
    .bind(user_id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(format!("{:?}", req.notification_type).to_lowercase())
    .bind(req.priority)
    .bind(&req.data)
    .bind(&req.link_url)
    .bind(now)
    .bind(false)
    .fetch_one(&state.db)
    .await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("创建通知失败: {}", e);
            return Json(api_error(500, "创建通知失败"));
        }
    };
    
    Json(ApiResponse::success(notification, "Success"))
}

pub async fn mark_as_read(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Notification>> {
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    let now = Utc::now();
    
    let notification = match sqlx::query_as::<_, Notification>(
        "UPDATE notification.notifications 
         SET is_read = true, read_at = $1 
         WHERE id = $2 AND user_id = $3 AND is_read = false
         RETURNING *"
    )
    .bind(now)
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("标记通知为已读失败: {}", e);
            return Json(api_error(500, "标记通知为已读失败"));
        }
    };
    
    match notification {
        Some(n) => Json(ApiResponse::success(n, "Success")),
        None => Json(api_error(404, "通知不存在或已读")),
    }
}

pub async fn mark_all_as_read(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<i64>> {
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    let now = Utc::now();
    
    let result = match sqlx::query(
        "UPDATE notification.notifications 
         SET is_read = true, read_at = $1 
         WHERE user_id = $2 AND is_read = false"
    )
    .bind(now)
    .bind(user_id)
    .execute(&state.db)
    .await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("标记所有通知为已读失败: {}", e);
            return Json(api_error(500, "标记所有通知为已读失败"));
        }
    };
    
    Json(ApiResponse::success(result.rows_affected() as i64, "Success"))
}

pub async fn delete_notification(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    
    let result = match sqlx::query(
        "DELETE FROM notification.notifications WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .execute(&state.db)
    .await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除通知失败: {}", e);
            return Json(api_error(500, "删除通知失败"));
        }
    };
    
    if result.rows_affected() > 0 {
        Json(ApiResponse::success(true, "Success"))
    } else {
        Json(api_error(404, "通知不存在"))
    }
}
