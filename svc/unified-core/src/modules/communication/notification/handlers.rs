use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{
    BroadcastNotificationRequest, BulkIdsRequest, NotificationQuery, SendNotificationRequest,
};

/// 发送通知（管理员或系统使用）
pub async fn send_notification(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SendNotificationRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Sending notification to user: {} by user: {}",
        req.user_id,
        claims.username
    );

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
    let send_email = req.send_email.unwrap_or(false);

    let notification_type = req
        .notification_type
        .as_deref()
        .unwrap_or("info")
        .to_string();
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
            if send_email {
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
    tracing::info!(
        "Broadcasting notification to {} users by user: {}",
        req.user_ids.len(),
        claims.username
    );

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
    tracing::info!(
        "Marking notification as read: {} for user: {}",
        id,
        claims.username
    );

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
    tracing::info!(
        "Marking all notifications as read for user: {}",
        claims.username
    );

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
    tracing::info!(
        "Getting unread notification count for user: {}",
        claims.username
    );

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

/// 删除指定通知
pub async fn delete_notification(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Deleting notification: {} for user: {}",
        id,
        claims.username
    );

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

    let result = sqlx::query("DELETE FROM core_notifications WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "Notification deleted successfully",
            "data": null
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "Notification not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to delete notification: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to delete notification: {}", e),
                "data": null
            }))
        }
    }
}

/// 删除所有通知（当前用户的）
pub async fn delete_all_notifications(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("Deleting all notifications for user: {}", claims.username);

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

    let result = sqlx::query("DELETE FROM core_notifications WHERE user_id = $1")
        .bind(user_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Deleted {} notifications", r.rows_affected()),
            "data": {
                "deleted_count": r.rows_affected()
            }
        })),
        Err(e) => {
            tracing::error!("Failed to delete all notifications: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to delete all notifications: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取单个通知详情
pub async fn get_notification(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!("Getting notification: {} for user: {}", id, claims.username);

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
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
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

            Json(serde_json::json!({
                "success": true,
                "message": "Get notification success",
                "data": notification
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Notification not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to get notification: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get notification: {}", e),
                "data": null
            }))
        }
    }
}

/// 标记为未读
pub async fn mark_as_unread(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Marking notification as unread: {} for user: {}",
        id,
        claims.username
    );

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
        SET is_read = FALSE, read_at = NULL
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
            "message": "Notification marked as unread",
            "data": null
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "Notification not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to mark notification as unread: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to mark notification as unread: {}", e),
                "data": null
            }))
        }
    }
}

/// 批量标记已读
pub async fn bulk_mark_read(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BulkIdsRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Bulk marking {} notifications as read for user: {}",
        payload.notification_ids.len(),
        claims.username
    );

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

    if payload.notification_ids.is_empty() {
        return Json(serde_json::json!({
            "success": true,
            "message": "No notifications to mark as read",
            "data": {
                "updated_count": 0
            }
        }));
    }

    let result = sqlx::query(
        r#"
        UPDATE core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND id = ANY($2)
        "#,
    )
    .bind(user_id)
    .bind(&payload.notification_ids)
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
            tracing::error!("Failed to bulk mark notifications as read: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to bulk mark notifications as read: {}", e),
                "data": null
            }))
        }
    }
}

/// 批量删除
pub async fn bulk_delete(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BulkIdsRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Bulk deleting {} notifications for user: {}",
        payload.notification_ids.len(),
        claims.username
    );

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

    if payload.notification_ids.is_empty() {
        return Json(serde_json::json!({
            "success": true,
            "message": "No notifications to delete",
            "data": {
                "deleted_count": 0
            }
        }));
    }

    let result = sqlx::query("DELETE FROM core_notifications WHERE user_id = $1 AND id = ANY($2)")
        .bind(user_id)
        .bind(&payload.notification_ids)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Deleted {} notifications", r.rows_affected()),
            "data": {
                "deleted_count": r.rows_affected()
            }
        })),
        Err(e) => {
            tracing::error!("Failed to bulk delete notifications: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to bulk delete notifications: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取当前用户的通知统计（按类型统计数量）
pub async fn get_notification_stats(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("Getting notification stats for user: {}", claims.username);

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
        SELECT notification_type, COUNT(*) as count,
               SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
        FROM core_notifications
        WHERE user_id = $1
        GROUP BY notification_type
        ORDER BY count DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let stats: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "notification_type": row.get::<String, _>("notification_type"),
                        "count": row.get::<i64, _>("count"),
                        "unread_count": row.get::<Option<i64>, _>("unread_count").unwrap_or(0),
                    })
                })
                .collect();

            let total_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM core_notifications WHERE user_id = $1",
            )
            .bind(user_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            let total_unread_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM core_notifications WHERE user_id = $1 AND is_read = FALSE",
            )
            .bind(user_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            Json(serde_json::json!({
                "success": true,
                "message": "Get notification stats success",
                "data": {
                    "by_type": stats,
                    "total": total_result,
                    "total_unread": total_unread_result
                }
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get notification stats: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get notification stats: {}", e),
                "data": null
            }))
        }
    }
}

async fn send_notification_email(
    state: &AppState,
    req: &SendNotificationRequest,
) -> Result<(), ()> {
    let email: Option<String> = sqlx::query_scalar("SELECT email FROM core_users WHERE id = $1")
        .bind(req.user_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get user email: {}", e);
        })?;

    if let Some(email) = email {
        let queue_id = crate::modules::communication::mail::queue_email(
            "system@topems.io".to_string(),
            email,
            req.title.clone(),
            req.content.clone().unwrap_or_default(),
            None,
            None,
            None,
        );
        tracing::info!("Notification email queued: {}", queue_id);
    }

    Ok(())
}
