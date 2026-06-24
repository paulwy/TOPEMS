//! Notification submodule - Notification handlers with database support

use axum::{extract::{Path, Query, State}, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;
use crate::AppState;
use topems_shared::auth::Claims;
use axum::Extension;

#[derive(Debug, Deserialize)]
pub struct SendNotificationRequest {
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
    pub send_email: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct BroadcastNotificationRequest {
    pub user_ids: Vec<Uuid>,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
    pub send_email: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct NotificationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub is_read: Option<bool>,
    pub notification_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: String,
    pub is_read: bool,
    pub priority: i32,
    pub data: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// 发送通知（管理员或系统使用）
pub async fn send_notification(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SendNotificationRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Sending notification to user: {} by user: {}", req.user_id, claims.username);

    // 检查权限：管理员或超级管理员可以发送通知给任意用户
    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限发送通知",
            "data": null,
            "code": 403
        }));
    }

    let id = Uuid::new_v4();
    let notification_type = req.notification_type.unwrap_or_else(|| "info".to_string());
    let priority = req.priority.unwrap_or(0);

    let result = sqlx::query(
        r#"
        INSERT INTO core_notifications (id, user_id, title, content, notification_type, priority, data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        "#,
    )
    .bind(id)
    .bind(req.user_id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&notification_type)
    .bind(priority)
    .bind(&req.data)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => {
            let notification = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "user_id": row.get::<Uuid, _>("user_id"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content"),
                "notification_type": row.get::<String, _>("notification_type"),
                "is_read": row.get::<bool, _>("is_read"),
                "priority": row.get::<i32, _>("priority"),
                "data": row.get::<Option<serde_json::Value>, _>("data"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "read_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("read_at"),
            });

            // 如果需要同时发送邮件
            if req.send_email.unwrap_or(false) {
                let _ = send_notification_email(&state, &req).await;
            }

            Json(serde_json::json!({
                "success": true,
                "message": "Notification sent successfully",
                "data": notification
            }))
        }
        Err(e) => {
            tracing::error!("Failed to send notification: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to send notification: {}", e),
                "data": null
            }))
        }
    }
}

/// 广播通知（管理员使用）
pub async fn broadcast_notification(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BroadcastNotificationRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Broadcasting notification to {} users by user: {}", req.user_ids.len(), claims.username);

    // 检查权限
    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限发送广播通知",
            "data": null,
            "code": 403
        }));
    }

    let notification_type = req.notification_type.unwrap_or_else(|| "info".to_string());
    let priority = req.priority.unwrap_or(0);
    let mut sent_count = 0;

    for user_id in &req.user_ids {
        let id = Uuid::new_v4();
        let result = sqlx::query(
            r#"
            INSERT INTO core_notifications (id, user_id, title, content, notification_type, priority, data, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(&req.title)
        .bind(&req.content)
        .bind(&notification_type)
        .bind(priority)
        .bind(&req.data)
        .execute(&state.pool)
        .await;

        if result.is_ok() {
            sent_count += 1;
        }
    }

    Json(serde_json::json!({
        "success": true,
        "message": format!("Broadcast completed, sent {} notifications", sent_count),
        "data": {
            "total_users": req.user_ids.len(),
            "sent_count": sent_count
        }
    }))
}

/// 获取当前用户的通知列表
pub async fn list_notifications(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        SELECT id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        FROM core_notifications
        WHERE user_id = $1
          AND ($2::boolean IS NULL OR is_read = $2)
          AND ($3::text IS NULL OR notification_type = $3)
        ORDER BY priority DESC, created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(user_id)
    .bind(params.is_read)
    .bind(&params.notification_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let notifications: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "user_id": row.get::<Uuid, _>("user_id"),
                        "title": row.get::<String, _>("title"),
                        "content": row.get::<Option<String>, _>("content"),
                        "notification_type": row.get::<String, _>("notification_type"),
                        "is_read": row.get::<bool, _>("is_read"),
                        "priority": row.get::<i32, _>("priority"),
                        "data": row.get::<Option<serde_json::Value>, _>("data"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "read_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("read_at"),
                    })
                })
                .collect();

            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM core_notifications
                WHERE user_id = $1
                  AND ($2::boolean IS NULL OR is_read = $2)
                  AND ($3::text IS NULL OR notification_type = $3)
                "#,
            )
            .bind(user_id)
            .bind(params.is_read)
            .bind(&params.notification_type)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            let unread_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM core_notifications WHERE user_id = $1 AND is_read = FALSE",
            )
            .bind(user_id)
            .fetch_one(&state.pool)
            .await;
            let unread_count = unread_result.unwrap_or(0);

            Json(serde_json::json!({
                "success": true,
                "message": "List notifications success",
                "data": {
                    "notifications": notifications,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "unread_count": unread_count
                }
            }))
        }
        Err(e) => {
            tracing::error!("Failed to list notifications: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list notifications: {}", e),
                "data": null
            }))
        }
    }
}

/// 标记单个通知为已读
pub async fn mark_as_read(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!("Marking notification as read: {} for user: {}", id, claims.username);

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    // 检查通知是否属于当前用户
    let belongs_to_user = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM core_notifications WHERE id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(false);

    if !belongs_to_user {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限操作此通知",
            "data": null,
            "code": 403
        }));
    }

    let result = sqlx::query(
        r#"
        UPDATE core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(id)
    .bind(user_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "Notification marked as read",
            "data": null
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "Notification not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to mark notification as read: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to mark notification as read: {}", e),
                "data": null
            }))
        }
    }
}

/// 标记所有通知为已读
pub async fn mark_all_as_read(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("Marking all notifications as read for user: {}", claims.username);

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND is_read = FALSE
        "#,
    )
    .bind(user_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Marked {} notifications as read", r.rows_affected()),
            "data": {
                "updated_count": r.rows_affected()
            }
        })),
        Err(e) => {
            tracing::error!("Failed to mark all notifications as read: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to mark all notifications as read: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取当前用户的通知列表（兼容旧API）
pub async fn get_notifications(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    list_notifications(State(state), Extension(claims), Query(params)).await
}

/// 获取当前用户的未读通知数量
pub async fn get_unread_count(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("Getting unread notification count for user: {}", claims.username);

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": 0,
                "code": 400
            }));
        }
    };

    let result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM core_notifications WHERE user_id = $1 AND is_read = FALSE",
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(count) => Json(serde_json::json!({
            "success": true,
            "message": "Get unread count success",
            "data": count
        })),
        Err(e) => {
            tracing::error!("Failed to get unread count: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get unread count: {}", e),
                "data": 0
            }))
        }
    }
}

/// 获取当前用户的未读通知列表
pub async fn get_unread_notifications(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": [],
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        SELECT id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        FROM core_notifications
        WHERE user_id = $1
          AND is_read = FALSE
          AND ($2::text IS NULL OR notification_type = $2)
        ORDER BY priority DESC, created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(user_id)
    .bind(&params.notification_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let notifications: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "user_id": row.get::<Uuid, _>("user_id"),
                        "title": row.get::<String, _>("title"),
                        "content": row.get::<Option<String>, _>("content"),
                        "notification_type": row.get::<String, _>("notification_type"),
                        "is_read": row.get::<bool, _>("is_read"),
                        "priority": row.get::<i32, _>("priority"),
                        "data": row.get::<Option<serde_json::Value>, _>("data"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "read_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("read_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "Get unread notifications success",
                "data": notifications
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get unread notifications: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get unread notifications: {}", e),
                "data": []
            }))
        }
    }
}

/// 发送通知邮件（内部辅助函数）
async fn send_notification_email(state: &AppState, req: &SendNotificationRequest) -> Result<(), ()> {
    // 查询用户邮箱
    let email: Option<String> = sqlx::query_scalar(
        "SELECT email FROM core_users WHERE id = $1",
    )
    .bind(req.user_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get user email: {}", e);
    })?;

    if let Some(email) = email {
        // 使用邮件服务发送邮件
        let _ = modules::communication::mail::send_notification_email(
            state,
            &email,
            &req.title,
            req.content.as_deref().unwrap_or_default(),
        ).await;
    }

    Ok(())
}
