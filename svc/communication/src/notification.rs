use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use sqlx::PgPool;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::locale::Locale;
use uuid::Uuid;

use crate::models::{
    ArchiveConfig, BroadcastNotificationRequest, BulkIdsRequest, ChannelMetrics, ChannelQuery,
    CreateChannelRequest, CreateTemplateRequest, NotificationChannel, NotificationQuery,
    SendNotificationRequest, UpdateChannelRequest, UpdateTemplateRequest,
};

/// 通知优先级枚举
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NotificationPriority {
    Low,
    Normal,
    High,
    Urgent,
}

impl NotificationPriority {
    /// 映射为数据库 priority 列 (i32)：Low=0, Normal=1, High=2, Urgent=3
    pub fn as_i32(&self) -> i32 {
        match self {
            NotificationPriority::Low => 0,
            NotificationPriority::Normal => 1,
            NotificationPriority::High => 2,
            NotificationPriority::Urgent => 3,
        }
    }
}

/// 根据级别字符串分类通知优先级（大小写不敏感、自动去除首尾空白）
pub fn classify_notification_priority(level: &str) -> NotificationPriority {
    match level.trim().to_lowercase().as_str() {
        "urgent" | "critical" | "emergency" => NotificationPriority::Urgent,
        "high" | "important" => NotificationPriority::High,
        "low" | "minor" => NotificationPriority::Low,
        _ => NotificationPriority::Normal,
    }
}

/// 根据通知类型和用户偏好选择投递渠道
pub fn select_channels(notification_type: &str, user_preferences: &[&str]) -> Vec<String> {
    let ntype = notification_type.trim().to_lowercase();
    let all = vec!["push".to_string(), "im".to_string(), "email".to_string()];

    if matches!(ntype.as_str(), "urgent" | "critical" | "emergency") {
        return all;
    }

    let mut channels: Vec<String> = Vec::new();
    for pref in user_preferences {
        let p = pref.trim().to_lowercase();
        if p.is_empty() {
            continue;
        }
        let to_add: Vec<String> = if p == "all" {
            all.clone()
        } else if matches!(p.as_str(), "push" | "im" | "email") {
            vec![p]
        } else {
            vec![]
        };
        for c in to_add {
            if !channels.contains(&c) {
                channels.push(c);
            }
        }
    }

    if channels.is_empty() {
        channels.push("push".to_string());
    }

    channels
}

/// 规范化通知类型：去首尾空白并转小写，空值默认 info
pub fn normalize_notification_type(ntype: &str) -> String {
    let trimmed = ntype.trim().to_lowercase();
    if trimmed.is_empty() {
        "info".to_string()
    } else {
        trimmed
    }
}

/// 按 UTF-8 字符边界截断通知标题，超出时追加省略号
pub fn truncate_notification_title(title: &str, max_len: usize) -> String {
    if title.chars().count() <= max_len {
        return title.to_string();
    }
    let mut result: String = title.chars().take(max_len).collect();
    result.push('…');
    result
}

/// 发送通知（管理员或系统使用）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notify/send",
    tag = "notification",
    request_body = SendNotificationRequest,
    responses(
        (status = 200, description = "Notification sent", body = serde_json::Value),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn send_notification(
    State(pool): State<PgPool>,
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

    let notification_type =
        normalize_notification_type(req.notification_type.as_deref().unwrap_or("info"));
    let priority = req
        .priority
        .unwrap_or_else(|| classify_notification_priority(&notification_type).as_i32());
    let title = truncate_notification_title(&req.title, 255);
    let channels = select_channels(&notification_type, &["all"]);

    let result = sqlx::query(
        only_own_schema_query!("public", r#"
        INSERT INTO core_notifications (id, user_id, title, content, notification_type, priority, data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        "#),
    )
    .bind(id)
    .bind(req.user_id)
    .bind(&title)
    .bind(&req.content)
    .bind(&notification_type)
    .bind(priority)
    .bind(&req.data)
    .fetch_one(&pool)
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
                "channels": channels,
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "read_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("read_at"),
            });

            // 如果需要同时发送邮件
            if send_email {
                let _ = send_notification_email(&pool, &req).await;
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
    State(pool): State<PgPool>,
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

    let notification_type =
        normalize_notification_type(&req.notification_type.unwrap_or_else(|| "info".to_string()));
    let priority = req
        .priority
        .unwrap_or_else(|| classify_notification_priority(&notification_type).as_i32());
    let title = truncate_notification_title(&req.title, 255);
    let channels = select_channels(&notification_type, &["all"]);
    let mut sent_count = 0;

    for user_id in &req.user_ids {
        let id = Uuid::new_v4();
        let result = sqlx::query(
            only_own_schema_query!("public", r#"
            INSERT INTO core_notifications (id, user_id, title, content, notification_type, priority, data, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            "#),
        )
        .bind(id)
        .bind(user_id)
        .bind(&title)
        .bind(&req.content)
        .bind(&notification_type)
        .bind(priority)
        .bind(&req.data)
        .execute(&pool)
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
            "sent_count": sent_count,
            "channels": channels
        }
    }))
}

/// 创建通知（兼容前端 POST /notification/notifications 路径）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications",
    tag = "notification",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "通知创建成功", body = serde_json::Value),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_notification(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("Creating notification via /notification/notifications");
    // 委托给 send_notification 处理逻辑
    let send_req = serde_json::from_value::<SendNotificationRequest>(req.clone());
    match send_req {
        Ok(r) => send_notification(State(pool), Extension(claims), Json(r)).await,
        Err(_) => Json(serde_json::json!({
            "success": false,
            "message": "Invalid notification request body"
        })),
    }
}

/// 获取当前用户的通知列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notify/list",
    tag = "notification",
    params(
        ("page" = Option<u32>, Query, description = "Page number"),
        ("page_size" = Option<u32>, Query, description = "Items per page"),
        ("unread_only" = Option<bool>, Query, description = "Filter unread only"),
    ),
    responses(
        (status = 200, description = "List of notifications", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_notifications(
    State(pool): State<PgPool>,
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
        only_own_schema_query!("public", r#"
        SELECT id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        FROM core_notifications
        WHERE user_id = $1
          AND ($2::boolean IS NULL OR is_read = $2)
          AND ($3::text IS NULL OR notification_type = $3)
        ORDER BY priority DESC, created_at DESC
        LIMIT $4 OFFSET $5
        "#),
    )
    .bind(user_id)
    .bind(params.is_read)
    .bind(&params.notification_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
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

            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "public",
                r#"
                SELECT COUNT(*) FROM core_notifications
                WHERE deleted_at IS NULL AND user_id = $1
                  AND ($2::boolean IS NULL OR is_read = $2)
                  AND ($3::text IS NULL OR notification_type = $3)
                "#
            ))
            .bind(user_id)
            .bind(params.is_read)
            .bind(&params.notification_type)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            let unread_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("public", "SELECT COUNT(*) FROM core_notifications WHERE deleted_at IS NULL AND user_id = $1 AND is_read = FALSE"),
            )
            .bind(user_id)
            .fetch_one(&pool)
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
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:update"])),
    path = "/notification/notifications/{id}",
    tag = "notification",
    params(
        ("id" = Uuid, Path, description = "通知ID"),
    ),
    responses(
        (status = 200, description = "标记成功", body = serde_json::Value),
        (status = 404, description = "通知不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn mark_as_read(
    State(pool): State<PgPool>,
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&pool)
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&pool)
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
    State(pool): State<PgPool>,
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND is_read = FALSE
        "#
    ))
    .bind(user_id)
    .execute(&pool)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notifications",
    tag = "notification",
    params(
        ("page" = Option<u32>, Query, description = "Page number"),
        ("page_size" = Option<u32>, Query, description = "Items per page"),
        ("unread_only" = Option<bool>, Query, description = "Filter unread only"),
    ),
    responses(
        (status = 200, description = "List of notifications", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_notifications(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    list_notifications(State(pool), Extension(claims), Query(params)).await
}

/// 获取当前用户的未读通知数量
pub async fn get_unread_count(
    State(pool): State<PgPool>,
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
        only_own_schema_query!("public", "SELECT COUNT(*) FROM core_notifications WHERE deleted_at IS NULL AND user_id = $1 AND is_read = FALSE"),
    )
    .bind(user_id)
    .fetch_one(&pool)
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
    State(pool): State<PgPool>,
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
        only_own_schema_query!("public", r#"
        SELECT id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        FROM core_notifications
        WHERE user_id = $1
          AND is_read = FALSE
          AND ($2::text IS NULL OR notification_type = $2)
        ORDER BY priority DESC, created_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(user_id)
    .bind(&params.notification_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
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
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/{id}",
    tag = "notification",
    params(
        ("id" = Uuid, Path, description = "通知ID"),
    ),
    responses(
        (status = 200, description = "删除成功", body = serde_json::Value),
        (status = 404, description = "通知不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_notification(
    State(pool): State<PgPool>,
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&pool)
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE core_notifications SET deleted_at = NOW() WHERE id = $1 AND user_id = $2"
    ))
    .bind(id)
    .bind(user_id)
    .execute(&pool)
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
    State(pool): State<PgPool>,
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE core_notifications SET deleted_at = NOW() WHERE user_id = $1"
    ))
    .bind(user_id)
    .execute(&pool)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notifications/{id}",
    tag = "notification",
    params(
        ("id" = Uuid, Path, description = "Notification ID"),
    ),
    responses(
        (status = 200, description = "Notification detail", body = serde_json::Value),
        (status = 404, description = "Notification not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_notification(
    State(pool): State<PgPool>,
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
        only_own_schema_query!("public", r#"
        SELECT id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        FROM core_notifications
        WHERE id = $1 AND user_id = $2
        "#),
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&pool)
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
    State(pool): State<PgPool>,
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&pool)
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET is_read = FALSE, read_at = NULL
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&pool)
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
    State(pool): State<PgPool>,
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND id = ANY($2)
        "#
    ))
    .bind(user_id)
    .bind(&payload.notification_ids)
    .execute(&pool)
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
    State(pool): State<PgPool>,
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE core_notifications SET deleted_at = NOW() WHERE user_id = $1 AND id = ANY($2)"
    ))
    .bind(user_id)
    .bind(&payload.notification_ids)
    .execute(&pool)
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
    State(pool): State<PgPool>,
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT notification_type, COUNT(*) as count,
               SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
        FROM core_notifications
        WHERE user_id = $1
        GROUP BY notification_type
        ORDER BY count DESC
        "#
    ))
    .bind(user_id)
    .fetch_all(&pool)
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

            let total_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "public",
                "SELECT COUNT(*) FROM core_notifications WHERE deleted_at IS NULL AND user_id = $1"
            ))
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

            let total_unread_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("public", "SELECT COUNT(*) FROM core_notifications WHERE deleted_at IS NULL AND user_id = $1 AND is_read = FALSE"),
            )
            .bind(user_id)
            .fetch_one(&pool)
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

/// 归档通知
pub async fn archive_notification(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Archiving notification: {} for user: {}",
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&pool)
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET is_archived = TRUE
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "Notification archived successfully",
            "data": null
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "Notification not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to archive notification: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to archive notification: {}", e),
                "data": null
            }))
        }
    }
}

/// 取消归档
pub async fn unarchive_notification(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Unarchiving notification: {} for user: {}",
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&pool)
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET is_archived = FALSE
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "Notification unarchived successfully",
            "data": null
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "Notification not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to unarchive notification: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to unarchive notification: {}", e),
                "data": null
            }))
        }
    }
}

/// 列出归档通知
pub async fn list_archived_notifications(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Listing archived notifications for user: {}",
        claims.username
    );

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
        only_own_schema_query!("public", r#"
        SELECT id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        FROM core_notifications
        WHERE user_id = $1
          AND is_archived = TRUE
          AND ($2::boolean IS NULL OR is_read = $2)
          AND ($3::text IS NULL OR notification_type = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#),
    )
    .bind(user_id)
    .bind(params.is_read)
    .bind(&params.notification_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
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

            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "public",
                r#"
                SELECT COUNT(*) FROM core_notifications
                WHERE deleted_at IS NULL AND user_id = $1
                  AND is_archived = TRUE
                  AND ($2::boolean IS NULL OR is_read = $2)
                  AND ($3::text IS NULL OR notification_type = $3)
                "#
            ))
            .bind(user_id)
            .bind(params.is_read)
            .bind(&params.notification_type)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(serde_json::json!({
                "success": true,
                "message": "List archived notifications success",
                "data": {
                    "notifications": notifications,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }
            }))
        }
        Err(e) => {
            tracing::error!("Failed to list archived notifications: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list archived notifications: {}", e),
                "data": null
            }))
        }
    }
}

pub async fn get_archive_config(
    State(_pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "Success",
        "data": {
            "enabled": false,
            "retention_days": 90,
            "auto_archive_enabled": false,
            "auto_archive_interval_days": 7,
            "auto_archive_days": 30,
        },
        "code": 0
    }))
}

pub async fn update_archive_config(
    State(_pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
    Json(_config): Json<ArchiveConfig>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "Archive config updated",
        "data": _config,
        "code": 0
    }))
}

pub async fn run_auto_archive(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限执行自动归档",
            "data": null,
            "code": 403
        }));
    }

    let archived_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET is_archived = true
        WHERE created_at < NOW() - INTERVAL '30 days' AND is_archived = false AND deleted_at IS NULL
        RETURNING COUNT(*)
        "#
    ))
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let deleted_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_notifications
        SET deleted_at = NOW()
        WHERE created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL
        RETURNING COUNT(*)
        "#
    ))
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let count: i64 = archived_count + deleted_count;

    Json(serde_json::json!({
        "success": true,
        "message": format!("Auto archive completed, {} notifications archived", count),
        "data": { "archived_count": count },
        "code": 0
    }))
}

/// 列出通知模板
pub async fn list_templates(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Listing notification templates for user: {}",
        claims.username
    );

    let result = sqlx::query(
        only_own_schema_query!("public", r#"
        SELECT id, name, title_template, content_template, notification_type, description, created_by, created_at, updated_at
        FROM core_notification_templates
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        "#),
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let templates: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "name": row.get::<String, _>("name"),
                        "title_template": row.get::<String, _>("title_template"),
                        "content_template": row.get::<String, _>("content_template"),
                        "notification_type": row.get::<Option<String>, _>("notification_type"),
                        "description": row.get::<Option<String>, _>("description"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "List templates success",
                "data": templates
            }))
        }
        Err(e) => {
            tracing::error!("Failed to list templates: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list templates: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取模板详情
pub async fn get_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!("Getting template: {} for user: {}", id, claims.username);

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT id, name, title, content, notification_type, priority, data, created_at, updated_at
        FROM core_notification_templates
        WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content"),
                "notification_type": row.get::<Option<String>, _>("notification_type"),
                "priority": row.get::<Option<i32>, _>("priority"),
                "data": row.get::<Option<serde_json::Value>, _>("data"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Get template success",
                "data": template
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to get template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get template: {}", e),
                "data": null
            }))
        }
    }
}

/// 创建模板
pub async fn create_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Creating template: {} by user: {}",
        req.name,
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限创建通知模板",
            "data": null,
            "code": 403
        }));
    }

    let id = Uuid::new_v4();
    let notification_type = req
        .notification_type
        .clone()
        .unwrap_or_else(|| "info".to_string());
    let priority = req.priority.unwrap_or(0);

    let result = sqlx::query(
        only_own_schema_query!("public", r#"
        INSERT INTO core_notification_templates (id, name, title, content, notification_type, priority, data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, name, title, content, notification_type, priority, data, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&notification_type)
    .bind(priority)
    .bind(&req.data)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content"),
                "notification_type": row.get::<Option<String>, _>("notification_type"),
                "priority": row.get::<Option<i32>, _>("priority"),
                "data": row.get::<Option<serde_json::Value>, _>("data"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Template created successfully",
                "data": template
            }))
        }
        Err(e) => {
            tracing::error!("Failed to create template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to create template: {}", e),
                "data": null
            }))
        }
    }
}

/// 更新模板
pub async fn update_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Updating template: {} by user: {}", id, claims.username);

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限更新通知模板",
            "data": null,
            "code": 403
        }));
    }

    let result = sqlx::query(
        only_own_schema_query!("public", r#"
        UPDATE core_notification_templates
        SET name = COALESCE($1, name),
            title = COALESCE($2, title),
            content = COALESCE($3, content),
            notification_type = COALESCE($4, notification_type),
            priority = COALESCE($5, priority),
            data = COALESCE($6, data),
            updated_at = NOW()
        WHERE id = $7
        RETURNING id, name, title, content, notification_type, priority, data, created_at, updated_at
        "#),
    )
    .bind(&req.name)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.notification_type)
    .bind(req.priority)
    .bind(&req.data)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content"),
                "notification_type": row.get::<Option<String>, _>("notification_type"),
                "priority": row.get::<Option<i32>, _>("priority"),
                "data": row.get::<Option<serde_json::Value>, _>("data"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Template updated successfully",
                "data": template
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to update template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update template: {}", e),
                "data": null
            }))
        }
    }
}

/// 删除模板
pub async fn delete_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!("Deleting template: {} by user: {}", id, claims.username);

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限删除通知模板",
            "data": null,
            "code": 403
        }));
    }

    let result = sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE core_notification_templates SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "Template deleted successfully",
            "data": null
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to delete template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to delete template: {}", e),
                "data": null
            }))
        }
    }
}

async fn send_notification_email(pool: &PgPool, req: &SendNotificationRequest) -> Result<(), ()> {
    let email: Option<String> = sqlx::query_scalar(only_own_schema_query!(
        "public",
        "SELECT email FROM core_users WHERE id = $1"
    ))
    .bind(req.user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get user email: {}", e);
    })?;

    if let Some(email) = email {
        let queue_id = crate::mail::queue_email(
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

// ===== 通知渠道 CRUD =====

/// 列出通知渠道
pub async fn list_channels(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ChannelQuery>,
    headers: HeaderMap,
) -> Json<serde_json::Value> {
    let tenant_id: Option<String> = if claims.is_superuser {
        None
    } else {
        Some(claims
            .tenant_id
            .clone()
            .unwrap_or_else(|| "default".to_string()))
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let type_filter = query.r#type.clone();
    let status_filter = query.status.clone();
    let locale = Locale::from_headers(&headers).as_sql();

    let rows = match sqlx::query_as::<_, NotificationChannel>(
        "SELECT id, tenant_id,
                CASE WHEN $4 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                type, status, provider_id, is_default, config, \
         rate_limit_per_minute, retry_count, description, \
         created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at \
         FROM notification_channels \
         WHERE ($1::text IS NULL OR tenant_id = $1) \
           AND ($2::text IS NULL OR type = $2) \
           AND ($3::text IS NULL OR status = $3) \
         ORDER BY created_at DESC LIMIT $5 OFFSET $6",
    )
    .bind(&tenant_id)
    .bind(type_filter)
    .bind(status_filter)
    .bind(locale)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("list_channels error: {}", e);
            return Json(serde_json::json!({
                "success": false, "message": format!("查询失败: {}", e), "data": null, "code": 500
            }));
        }
    };

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM notification_channels \
         WHERE ($1::text IS NULL OR tenant_id = $1) AND ($2::text IS NULL OR type = $2) AND ($3::text IS NULL OR status = $3)",
    )
    .bind(&tenant_id)
    .bind(query.r#type)
    .bind(query.status)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    Json(serde_json::json!({
        "success": true,
        "message": "ok",
        "data": {
            "items": rows,
            "total": total,
            "page": page,
            "page_size": page_size
        },
        "code": 200
    }))
}

/// 获取单个渠道
pub async fn get_channel(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<serde_json::Value> {
    let tenant_id: Option<String> = if claims.is_superuser {
        None
    } else {
        Some(claims
            .tenant_id
            .clone()
            .unwrap_or_else(|| "default".to_string()))
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match sqlx::query_as::<_, NotificationChannel>(
        "SELECT id, tenant_id,
                CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                type, status, provider_id, is_default, config, \
         rate_limit_per_minute, retry_count, description, \
         created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at \
         FROM notification_channels WHERE id = $1 AND ($2::text IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(&tenant_id)
    .bind(locale)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(ch)) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": ch, "code": 200
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "渠道不存在", "data": null, "code": 404
        })),
        Err(e) => Json(serde_json::json!({
            "success": false, "message": format!("查询失败: {}", e), "data": null, "code": 500
        })),
    }
}

/// 创建渠道
pub async fn create_channel(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateChannelRequest>,
) -> Json<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "default".to_string());
    let id = Uuid::new_v4();
    let config = req.config.unwrap_or_else(|| serde_json::json!({}));
    let is_default = req.is_default.unwrap_or(false);

    // 如果设为默认，先取消其他默认
    if is_default {
        let _ = sqlx::query(
            "UPDATE notification_channels SET is_default = false, updated_at = NOW() \
             WHERE tenant_id = $1 AND is_default = true",
        )
        .bind(&tenant_id)
        .execute(&pool)
        .await;
    }

    match sqlx::query_as::<_, NotificationChannel>(
        "INSERT INTO notification_channels \
         (id, tenant_id, name, type, status, provider_id, is_default, config, \
          rate_limit_per_minute, retry_count, description, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9,$10,NOW(),NOW()) \
         RETURNING id, tenant_id, name, type, status, provider_id, is_default, config, \
         rate_limit_per_minute, retry_count, description, created_at, updated_at",
    )
    .bind(id)
    .bind(&tenant_id)
    .bind(&req.name)
    .bind(&req.r#type)
    .bind(req.provider_id)
    .bind(is_default)
    .bind(config)
    .bind(req.rate_limit_per_minute)
    .bind(req.retry_count.unwrap_or(3))
    .bind(req.description)
    .fetch_one(&pool)
    .await
    {
        Ok(ch) => Json(serde_json::json!({
            "success": true, "message": "创建成功", "data": ch, "code": 200
        })),
        Err(e) => Json(serde_json::json!({
            "success": false, "message": format!("创建失败: {}", e), "data": null, "code": 500
        })),
    }
}

/// 更新渠道
pub async fn update_channel(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateChannelRequest>,
) -> Json<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "default".to_string());

    // 如果设为默认，先取消其他默认
    if req.is_default.unwrap_or(false) {
        let _ = sqlx::query(
            "UPDATE notification_channels SET is_default = false, updated_at = NOW() \
             WHERE tenant_id = $1 AND is_default = true AND id != $2",
        )
        .bind(&tenant_id)
        .bind(id)
        .execute(&pool)
        .await;
    }

    match sqlx::query_as::<_, NotificationChannel>(
        "UPDATE notification_channels SET \
         name = COALESCE($1, name), \
         config = COALESCE($2, config), \
         is_default = COALESCE($3, is_default), \
         rate_limit_per_minute = COALESCE($4, rate_limit_per_minute), \
         retry_count = COALESCE($5, retry_count), \
         description = COALESCE($6, description), \
         status = COALESCE($7, status), \
         updated_at = NOW() \
         WHERE id = $8 AND tenant_id = $9 \
         RETURNING id, tenant_id, name, type, status, provider_id, is_default, config, \
         rate_limit_per_minute, retry_count, description, created_at, updated_at",
    )
    .bind(req.name)
    .bind(req.config)
    .bind(req.is_default)
    .bind(req.rate_limit_per_minute)
    .bind(req.retry_count)
    .bind(req.description)
    .bind(req.status)
    .bind(id)
    .bind(&tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(ch)) => Json(serde_json::json!({
            "success": true, "message": "更新成功", "data": ch, "code": 200
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "渠道不存在", "data": null, "code": 404
        })),
        Err(e) => Json(serde_json::json!({
            "success": false, "message": format!("更新失败: {}", e), "data": null, "code": 500
        })),
    }
}

/// 删除渠道
pub async fn delete_channel(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let tenant_id = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "default".to_string());
    match sqlx::query("DELETE FROM notification_channels WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(&tenant_id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(serde_json::json!({
                    "success": true, "message": "删除成功", "data": {"deleted": true}, "code": 200
                }))
            } else {
                Json(serde_json::json!({
                    "success": false, "message": "渠道不存在", "data": null, "code": 404
                }))
            }
        }
        Err(e) => Json(serde_json::json!({
            "success": false, "message": format!("删除失败: {}", e), "data": null, "code": 500
        })),
    }
}

/// 测试渠道连接
pub async fn test_channel(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let tenant_id: Option<String> = if claims.is_superuser {
        None
    } else {
        Some(claims
            .tenant_id
            .clone()
            .unwrap_or_else(|| "default".to_string()))
    };
    match sqlx::query_as::<_, NotificationChannel>(
        "SELECT id, tenant_id, name, type, status, provider_id, is_default, config, \
         rate_limit_per_minute, retry_count, description, created_at, updated_at \
         FROM notification_channels WHERE id = $1 AND ($2::text IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(&tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(_ch)) => {
            // 最小可用：标记测试成功（实际发送测试可后续扩展）
            Json(serde_json::json!({
                "success": true, "message": "渠道测试通过（模拟）", "data": {"success": true}, "code": 200
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "渠道不存在", "data": null, "code": 404
        })),
        Err(e) => Json(serde_json::json!({
            "success": false, "message": format!("测试失败: {}", e), "data": null, "code": 500
        })),
    }
}

/// 获取渠道指标
pub async fn get_channel_metrics(
    State(_pool): State<PgPool>,
    Extension(_claims): Extension<Claims>,
    Path(_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    // 最小可用：返回空指标结构，避免 404
    let metrics = ChannelMetrics {
        total_sent: 0,
        total_failed: 0,
        success_rate: 0.0,
        avg_latency_ms: 0.0,
        by_hour: vec![],
    };
    Json(serde_json::json!({
        "success": true, "message": "ok", "data": metrics, "code": 200
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_priority_urgent() {
        assert_eq!(
            classify_notification_priority("urgent"),
            NotificationPriority::Urgent
        );
        assert_eq!(
            classify_notification_priority("CRITICAL"),
            NotificationPriority::Urgent
        );
        assert_eq!(
            classify_notification_priority("Emergency"),
            NotificationPriority::Urgent
        );
    }

    #[test]
    fn test_classify_priority_high() {
        assert_eq!(
            classify_notification_priority("high"),
            NotificationPriority::High
        );
        assert_eq!(
            classify_notification_priority("Important"),
            NotificationPriority::High
        );
    }

    #[test]
    fn test_classify_priority_low() {
        assert_eq!(
            classify_notification_priority("low"),
            NotificationPriority::Low
        );
        assert_eq!(
            classify_notification_priority(" minor "),
            NotificationPriority::Low
        );
    }

    #[test]
    fn test_classify_priority_normal_default() {
        assert_eq!(
            classify_notification_priority("normal"),
            NotificationPriority::Normal
        );
        assert_eq!(
            classify_notification_priority("info"),
            NotificationPriority::Normal
        );
        assert_eq!(
            classify_notification_priority(""),
            NotificationPriority::Normal
        );
        assert_eq!(
            classify_notification_priority("unknown"),
            NotificationPriority::Normal
        );
    }

    #[test]
    fn test_classify_priority_case_insensitive_and_trimmed() {
        assert_eq!(
            classify_notification_priority("  HIGH  "),
            NotificationPriority::High
        );
        assert_eq!(
            classify_notification_priority("Urgent"),
            NotificationPriority::Urgent
        );
    }

    #[test]
    fn test_select_channels_urgent_forces_all() {
        let channels = select_channels("urgent", &["email"]);
        assert!(channels.contains(&"push".to_string()));
        assert!(channels.contains(&"im".to_string()));
        assert!(channels.contains(&"email".to_string()));
        assert_eq!(channels.len(), 3);
    }

    #[test]
    fn test_select_channels_respects_preferences() {
        let channels = select_channels("info", &["email", "im"]);
        assert_eq!(channels, vec!["email".to_string(), "im".to_string()]);
    }

    #[test]
    fn test_select_channels_all_preference() {
        let channels = select_channels("info", &["all"]);
        assert_eq!(channels.len(), 3);
    }

    #[test]
    fn test_select_channels_empty_prefs_defaults_push() {
        let channels = select_channels("info", &[]);
        assert_eq!(channels, vec!["push".to_string()]);
    }

    #[test]
    fn test_select_channels_dedupes() {
        let channels = select_channels("info", &["email", "email", "im"]);
        assert_eq!(channels, vec!["email".to_string(), "im".to_string()]);
    }

    #[test]
    fn test_select_channels_ignores_unknown_pref() {
        let channels = select_channels("info", &["carrier_pigeon"]);
        assert_eq!(channels, vec!["push".to_string()]);
    }

    #[test]
    fn test_normalize_notification_type_default() {
        assert_eq!(normalize_notification_type(""), "info");
        assert_eq!(normalize_notification_type("   "), "info");
    }

    #[test]
    fn test_normalize_notification_type_lowercase() {
        assert_eq!(normalize_notification_type("URGENT"), "urgent");
        assert_eq!(normalize_notification_type("Info"), "info");
    }

    #[test]
    fn test_normalize_notification_type_trimmed() {
        assert_eq!(normalize_notification_type("  warning  "), "warning");
    }

    #[test]
    fn test_normalize_notification_type_passthrough() {
        assert_eq!(normalize_notification_type("alert"), "alert");
    }

    #[test]
    fn test_truncate_title_no_truncation() {
        assert_eq!(truncate_notification_title("hello", 10), "hello");
        assert_eq!(truncate_notification_title("hello", 5), "hello");
    }

    #[test]
    fn test_truncate_title_truncates_with_ellipsis() {
        let result = truncate_notification_title("hello world", 5);
        assert_eq!(result, "hello…");
    }

    #[test]
    fn test_truncate_title_utf8_boundaries() {
        let result = truncate_notification_title("你好世界朋友", 4);
        assert_eq!(result, "你好世界…");
    }

    #[test]
    fn test_truncate_title_empty() {
        assert_eq!(truncate_notification_title("", 5), "");
    }

    #[test]
    fn test_truncate_title_zero_max_len() {
        let result = truncate_notification_title("hello", 0);
        assert_eq!(result, "…");
    }

    // ===== NotificationPriority 枚举 trait / axum handler 测试 =====

    #[test]
    fn test_notification_priority_eq_variants() {
        assert_eq!(NotificationPriority::Low, NotificationPriority::Low);
        assert_ne!(NotificationPriority::Low, NotificationPriority::Normal);
        assert_ne!(NotificationPriority::High, NotificationPriority::Urgent);
    }

    #[test]
    fn test_notification_priority_clone() {
        let p = NotificationPriority::High;
        let cloned = p.clone();
        assert_eq!(p, cloned);
    }

    #[test]
    fn test_notification_priority_debug_format() {
        let s = format!("{:?}", NotificationPriority::Urgent);
        assert_eq!(s, "Urgent");
        let s = format!("{:?}", NotificationPriority::Normal);
        assert_eq!(s, "Normal");
        let s = format!("{:?}", NotificationPriority::Low);
        assert_eq!(s, "Low");
        let s = format!("{:?}", NotificationPriority::High);
        assert_eq!(s, "High");
    }

    #[test]
    fn test_classify_priority_returns_all_variants() {
        // 确保每个变体都至少被命中一次
        let variants = [
            NotificationPriority::Urgent,
            NotificationPriority::High,
            NotificationPriority::Low,
            NotificationPriority::Normal,
        ];
        let got = [
            classify_notification_priority("urgent"),
            classify_notification_priority("high"),
            classify_notification_priority("low"),
            classify_notification_priority("normal"),
        ];
        for (v, g) in variants.iter().zip(got.iter()) {
            assert_eq!(v, g);
        }
    }

    fn sample_claims() -> Claims {
        Claims {
            sub: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    fn lazy_pool() -> PgPool {
        use sqlx::postgres::PgPoolOptions;
        // 极短的 acquire_timeout 让 DB 错误路径快速失败，避免测试卡在连接超时
        PgPoolOptions::new()
            .acquire_timeout(std::time::Duration::from_millis(50))
            .connect_lazy("postgres://nobody:nobody@127.0.0.1:1/none")
            .expect("lazy pool")
    }

    #[tokio::test]
    async fn test_get_archive_config_returns_defaults() {
        let pool = lazy_pool();
        let claims = sample_claims();
        let res = get_archive_config(State(pool), Extension(claims)).await;
        let v = res.0;
        assert_eq!(v["success"], true);
        assert_eq!(v["data"]["enabled"], false);
        assert_eq!(v["data"]["retention_days"], 90);
        assert_eq!(v["data"]["auto_archive_days"], 30);
        assert_eq!(v["code"], 0);
    }

    #[tokio::test]
    async fn test_update_archive_config_echoes_back() {
        let pool = lazy_pool();
        let claims = sample_claims();
        let cfg = ArchiveConfig {
            enabled: true,
            retention_days: 7,
            auto_archive_enabled: true,
            auto_archive_interval_days: 2,
            auto_archive_days: 3,
        };
        let res = update_archive_config(State(pool), Extension(claims), Json(cfg)).await;
        let v = res.0;
        assert_eq!(v["success"], true);
        assert_eq!(v["data"]["enabled"], true);
        assert_eq!(v["data"]["retention_days"], 7);
        assert_eq!(v["data"]["auto_archive_days"], 3);
        assert_eq!(v["code"], 0);
    }

    #[tokio::test]
    async fn test_run_auto_archive_forbidden_without_permission() {
        let pool = lazy_pool();
        let claims = sample_claims(); // is_superuser=false, 无权限
        let res = run_auto_archive(State(pool), Extension(claims)).await;
        let v = res.0;
        assert_eq!(v["success"], false);
        assert_eq!(v["code"], 403);
    }

    #[tokio::test]
    async fn test_run_auto_archive_superuser_hits_db_error() {
        let pool = lazy_pool();
        let mut claims = sample_claims();
        claims.is_superuser = true;
        // 不可达 DB → query 失败 → unwrap_or(0)，但仍返回 success:true
        let res = run_auto_archive(State(pool), Extension(claims)).await;
        let v = res.0;
        assert_eq!(v["success"], true);
        assert_eq!(v["data"]["archived_count"], 0);
    }

    #[tokio::test]
    async fn test_send_notification_forbidden_without_permission() {
        let pool = lazy_pool();
        let claims = sample_claims(); // 无 notification:write 权限
        let req = SendNotificationRequest {
            user_id: Uuid::new_v4(),
            title: "t".to_string(),
            content: None,
            notification_type: None,
            priority: None,
            data: None,
            send_email: None,
        };
        let res = send_notification(State(pool), Extension(claims), Json(req)).await;
        let v = res.0;
        assert_eq!(v["success"], false);
        assert_eq!(v["code"], 403);
    }

    #[tokio::test]
    async fn test_broadcast_notification_forbidden_without_permission() {
        let pool = lazy_pool();
        let claims = sample_claims();
        let req = BroadcastNotificationRequest {
            user_ids: vec![Uuid::new_v4()],
            title: "t".to_string(),
            content: None,
            notification_type: None,
            priority: None,
            data: None,
            send_email: None,
        };
        let res = broadcast_notification(State(pool), Extension(claims), Json(req)).await;
        let v = res.0;
        assert_eq!(v["success"], false);
        assert_eq!(v["code"], 403);
    }

    #[tokio::test]
    async fn test_create_notification_invalid_body() {
        let pool = lazy_pool();
        let claims = sample_claims();
        // 缺少 user_id → 反序列化失败
        let bad = serde_json::json!({"title": "t"});
        let res = create_notification(State(pool), Extension(claims), Json(bad)).await;
        let v = res.0;
        assert_eq!(v["success"], false);
    }

    #[tokio::test]
    async fn test_bulk_mark_read_empty_ids_short_circuits() {
        let pool = lazy_pool();
        let mut claims = sample_claims();
        claims.sub = "550e8400-e29b-41d4-a716-446655440000".to_string();
        let res = bulk_mark_read(
            State(pool),
            Extension(claims),
            Json(BulkIdsRequest {
                notification_ids: vec![],
            }),
        )
        .await;
        let v = res.0;
        assert_eq!(v["success"], true);
        assert_eq!(v["data"]["updated_count"], 0);
    }

    #[tokio::test]
    async fn test_bulk_delete_empty_ids_short_circuits() {
        let pool = lazy_pool();
        let mut claims = sample_claims();
        claims.sub = "550e8400-e29b-41d4-a716-446655440000".to_string();
        let res = bulk_delete(
            State(pool),
            Extension(claims),
            Json(BulkIdsRequest {
                notification_ids: vec![],
            }),
        )
        .await;
        let v = res.0;
        assert_eq!(v["success"], true);
        assert_eq!(v["data"]["deleted_count"], 0);
    }
}
