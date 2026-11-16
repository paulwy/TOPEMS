use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::locale::Locale;
use topems_shared_db::scope::{Db, ScopedTxn};
use uuid::Uuid;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::models::{
    ArchiveConfig, BatchSubscribeRequest, BatchUnsubscribeRequest, BroadcastNotificationRequest,
    BulkConditionRequest, BulkIdsRequest, BulkIdsV2Request, BulkTemplateStatusRequest,
    CategoryPreferenceUpdate, ChannelMetrics, ChannelQuery, CreateChannelRequest,
    CreateSubscriptionRequest, CreateTemplateRequest, DeliveryQuery, DeliveryStatsQuery,
    GlobalMuteRequest, NotificationChannel, NotificationQuery, PreferencesUpdate, QuietHoursUpdate,
    SendNotificationRequest, SubscriptionQuery, UpdateChannelRequest, UpdateSubscriptionRequest,
    UpdateTemplateRequest,
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SendNotificationRequest>,
) -> Response {
    tracing::info!(
        "Sending notification to user: {} by user: {}",
        req.user_id,
        claims.username
    );

    // 检查权限：管理员或超级管理员可以发送通知给任意用户
    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "没有权限发送通知",
                "data": null,
                "code": 403
            })),
        )
            .into_response();
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            })),
        )
            .into_response();
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "数据库事务不可用",
                    "data": null,
                    "code": 500
                })),
            )
                .into_response();
        }
    };

    let id = Uuid::new_v4();
    let send_email = req.send_email.unwrap_or(false);

    let notification_type =
        normalize_notification_type(req.notification_type.as_deref().unwrap_or("info"));
    let priority = req
        .priority
        .unwrap_or_else(|| classify_notification_priority(&notification_type).as_i32());
    let title = truncate_notification_title(&req.title, 255);
    let channels = select_channels(&notification_type, &["all"]);

    let tenant_bind = if claims.is_superuser {
        Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
            .unwrap_or(Uuid::nil())
    };
    let result = sqlx::query(
        only_own_schema_query!("public", r#"
        INSERT INTO public.core_notifications (id, user_id, title, content, notification_type, priority, data, tenant_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
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
    .bind(tenant_bind)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(row) => {
            let notification = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "user_id": row.get::<Uuid, _>("user_id"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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
                let _ = send_notification_email(&db, &mut scope, &req).await;
            }

            Json(serde_json::json!({
                "success": true,
                "message": "Notification sent successfully",
                "data": notification
            }))
            .into_response()
        }
        Err(e) => {
            tracing::error!("Failed to send notification: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": format!("Failed to send notification: {}", e),
                    "data": null
                })),
            )
                .into_response()
        }
    }
}

/// 广播通知（管理员使用）
// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notify/broadcast",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn broadcast_notification(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BroadcastNotificationRequest>,
) -> Response {
    tracing::info!(
        "Broadcasting notification to {} users by user: {}",
        req.user_ids.len(),
        claims.username
    );

    // 检查权限
    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "没有权限发送广播通知",
                "data": null,
                "code": 403
            })),
        )
            .into_response();
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }))
        .into_response();
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }))
            .into_response();
        }
    };

    let notification_type =
        normalize_notification_type(&req.notification_type.unwrap_or_else(|| "info".to_string()));
    let priority = req
        .priority
        .unwrap_or_else(|| classify_notification_priority(&notification_type).as_i32());
    let title = truncate_notification_title(&req.title, 255);
    let channels = select_channels(&notification_type, &["all"]);
    let mut sent_count = 0;
    let mut failed_count = 0;
    let mut first_error: Option<String> = None;

    // 同租户默认（拍板 A，2026-10-25）：非超管发送方仅可通知本租户收件人，
    // 跨租户/不存在 user_id 跳过并计数；超管=全租户白名单不受限
    let sender_tenant: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };

    for user_id in &req.user_ids {
        if let Some(st) = sender_tenant {
            let recipient_ok: Option<(Option<Uuid>,)> = sqlx::query_as(
                "SELECT tenant_id FROM iam.users WHERE id = $1 AND deleted_at IS NULL",
            )
            .bind(user_id)
            .fetch_optional(&mut scope)
            .await
            .unwrap_or(None);
            let tenant_matches = match recipient_ok {
                None => false, // 收件人不存在/已删除
                Some((Some(rt),)) => rt == st,
                Some((None,)) => false, // 收件人无租户归属，非同租户
            };
            if !tenant_matches {
                failed_count += 1;
                if first_error.is_none() {
                    first_error = Some(format!("跨租户收件人已跳过（同租户默认）: {user_id}"));
                }
                continue;
            }
        }
        let tenant_bind = if claims.is_superuser {
            Uuid::nil()
        } else {
            claims
                .tenant_id
                .as_deref()
                .and_then(|t| Uuid::parse_str(t).ok())
                .unwrap_or(Uuid::nil())
        };
        let id = Uuid::new_v4();
        let result = sqlx::query(
            only_own_schema_query!("public", r#"
            INSERT INTO public.core_notifications (id, user_id, title, content, notification_type, priority, data, tenant_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            "#),
        )
        .bind(id)
        .bind(user_id)
        .bind(&title)
        .bind(&req.content)
        .bind(&notification_type)
        .bind(priority)
        .bind(&req.data)
        .bind(tenant_bind)
        .execute(&mut scope)
        .await;

        match result {
            Ok(_) => sent_count += 1,
            Err(e) => {
                // P3 修复：INSERT 失败不再静默吞掉，聚合失败计数并回传首个错误，
                // 便于调用方发现部分写入失败。
                failed_count += 1;
                if first_error.is_none() {
                    first_error = Some(e.to_string());
                }
            }
        }
    }

    Json(serde_json::json!({
        "success": failed_count == 0,
        "message": format!("Broadcast completed, sent {} notifications", sent_count),
        "data": {
            "total_users": req.user_ids.len(),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "first_error": first_error,
            "channels": channels
        }
    }))
    .into_response()
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Response {
    tracing::info!("Creating notification via /notification/notifications");
    // 委托给 send_notification 处理逻辑
    let send_req = serde_json::from_value::<SendNotificationRequest>(req.clone());
    match send_req {
        Ok(r) => send_notification(State(db), Extension(txn_arc), Extension(claims), Json(r)).await,
        Err(_) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Invalid notification request body"
            })),
        )
            .into_response(),
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        FROM public.core_notifications
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
    .fetch_all(&mut scope)
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
                        "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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
                SELECT COUNT(*) FROM public.core_notifications
                WHERE deleted_at IS NULL AND user_id = $1
                  AND ($2::boolean IS NULL OR is_read = $2)
                  AND ($3::text IS NULL OR notification_type = $3)
                "#
            ))
            .bind(user_id)
            .bind(params.is_read)
            .bind(&params.notification_type)
            .fetch_one(&mut scope)
            .await;

            let total = count_result.unwrap_or(0);

            let unread_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("public", "SELECT COUNT(*) FROM public.core_notifications WHERE deleted_at IS NULL AND user_id = $1 AND is_read = FALSE"),
            )
            .bind(user_id)
            .fetch_one(&mut scope)
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM public.core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&mut scope)
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
        UPDATE public.core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&mut scope)
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notify/read-all",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn mark_all_as_read(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        UPDATE public.core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND is_read = FALSE
        "#
    ))
    .bind(user_id)
    .execute(&mut scope)
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    list_notifications(
        State(db),
        Extension(txn_arc),
        Extension(claims),
        Query(params),
    )
    .await
}

/// 获取当前用户的未读通知数量
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notifications/unread-count",
    responses(
        (status = 200, description = "Get unread count", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_unread_count(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        only_own_schema_query!("public", "SELECT COUNT(*) FROM public.core_notifications WHERE deleted_at IS NULL AND user_id = $1 AND is_read = FALSE"),
    )
    .bind(user_id)
    .fetch_one(&mut scope)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notifications/unread",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_unread_notifications(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        FROM public.core_notifications
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
    .fetch_all(&mut scope)
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
                        "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM public.core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&mut scope)
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
        "UPDATE public.core_notifications SET deleted_at = NOW() WHERE id = $1 AND user_id = $2"
    ))
    .bind(id)
    .bind(user_id)
    .execute(&mut scope)
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
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn delete_all_notifications(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        "UPDATE public.core_notifications SET deleted_at = NOW() WHERE user_id = $1"
    ))
    .bind(user_id)
    .execute(&mut scope)
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        FROM public.core_notifications
        WHERE id = $1 AND user_id = $2
        "#),
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => {
            let notification = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "user_id": row.get::<Uuid, _>("user_id"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/{id}/unread",
    params(
        ("id" = String, Path, description = "Notification ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn mark_as_unread(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM public.core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&mut scope)
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
        UPDATE public.core_notifications
        SET is_read = FALSE, read_at = NULL
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&mut scope)
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/bulk-read",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn bulk_mark_read(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
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

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE public.core_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND id = ANY($2)
        "#
    ))
    .bind(user_id)
    .bind(&payload.notification_ids)
    .execute(&mut scope)
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
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/bulk-delete",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn bulk_delete(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
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

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE public.core_notifications SET deleted_at = NOW() WHERE user_id = $1 AND id = ANY($2)"
    ))
    .bind(user_id)
    .bind(&payload.notification_ids)
    .execute(&mut scope)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notifications/stats/me",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_notification_stats(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        FROM public.core_notifications
        WHERE user_id = $1
        GROUP BY notification_type
        ORDER BY count DESC
        "#
    ))
    .bind(user_id)
    .fetch_all(&mut scope)
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
                "SELECT COUNT(*) FROM public.core_notifications WHERE deleted_at IS NULL AND user_id = $1"
            ))
            .bind(user_id)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);

            let total_unread_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("public", "SELECT COUNT(*) FROM public.core_notifications WHERE deleted_at IS NULL AND user_id = $1 AND is_read = FALSE"),
            )
            .bind(user_id)
            .fetch_one(&mut scope)
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/{id}/archive",
    params(
        ("id" = String, Path, description = "Notification ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn archive_notification(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM public.core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&mut scope)
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
        UPDATE public.core_notifications
        SET is_archived = TRUE
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&mut scope)
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/{id}/unarchive",
    params(
        ("id" = String, Path, description = "Notification ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn unarchive_notification(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        only_own_schema_query!("public", "SELECT EXISTS(SELECT 1 FROM public.core_notifications WHERE deleted_at IS NULL AND id = $1 AND user_id = $2)"),
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(&mut scope)
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
        UPDATE public.core_notifications
        SET is_archived = FALSE
        WHERE id = $1 AND user_id = $2
        "#
    ))
    .bind(id)
    .bind(user_id)
    .execute(&mut scope)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notifications/archived",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_archived_notifications(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<NotificationQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        FROM public.core_notifications
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
    .fetch_all(&mut scope)
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
                        "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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
                SELECT COUNT(*) FROM public.core_notifications
                WHERE deleted_at IS NULL AND user_id = $1
                  AND is_archived = TRUE
                  AND ($2::boolean IS NULL OR is_read = $2)
                  AND ($3::text IS NULL OR notification_type = $3)
                "#
            ))
            .bind(user_id)
            .bind(params.is_read)
            .bind(&params.notification_type)
            .fetch_one(&mut scope)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notifications/archive/config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_archive_config(
    State(_db): State<Db>,
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/archive/config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn update_archive_config(
    State(_db): State<Db>,
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

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/archive/run",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn run_auto_archive(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
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

    let mut txn_guard = txn_arc.lock().await;
    let mut scope = match txn_guard.as_mut() {
        Some(txn) => match db.scope_with(txn).await {
            Ok(scope) => Some(scope),
            Err(e) => {
                tracing::error!("建立 RLS 事务作用域失败: {}", e);
                None
            }
        },
        None => {
            tracing::error!("rls txn missing: RLS 事务中间件未注入");
            None
        }
    };

    let archived_count: i64 = match scope.as_mut() {
        Some(scope) => sqlx::query_scalar(only_own_schema_query!(
            "public",
            r#"
            WITH archived AS (
                UPDATE public.core_notifications
                SET is_archived = true
                WHERE created_at < NOW() - INTERVAL '30 days' AND is_archived = false AND deleted_at IS NULL
                RETURNING 1
            )
            SELECT COUNT(*) FROM archived
            "#
        ))
        .fetch_one(scope)
        .await
        .unwrap_or(0),
        None => 0,
    };

    let deleted_count: i64 = match scope.as_mut() {
        Some(scope) => sqlx::query_scalar(only_own_schema_query!(
            "public",
            r#"
            WITH soft_deleted AS (
                UPDATE public.core_notifications
                SET deleted_at = NOW()
                WHERE created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL
                RETURNING 1
            )
            SELECT COUNT(*) FROM soft_deleted
            "#
        ))
        .fetch_one(scope)
        .await
        .unwrap_or(0),
        None => 0,
    };

    let count: i64 = archived_count + deleted_count;

    Json(serde_json::json!({
        "success": true,
        "message": format!("Auto archive completed, {} notifications archived", count),
        "data": { "archived_count": count },
        "code": 0
    }))
}

/// 列出通知模板
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notification-templates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_templates(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    tracing::info!(
        "Listing notification templates for user: {}",
        claims.username
    );

    let result = sqlx::query(
        only_own_schema_query!("public", r#"
        SELECT id, name, title_template, content_template, notification_type, description, created_by, created_at, updated_at
        FROM public.core_notification_templates
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        "#),
    )
    .fetch_all(&mut scope)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notification-templates/{id}",
    params(
        ("id" = String, Path, description = "Template ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    tracing::info!("Getting template: {} for user: {}", id, claims.username);

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT id, name, title_template AS title, content_template AS content, notification_type, priority, data, created_at, updated_at
        FROM public.core_notification_templates
        WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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

/// 渲染模板（变量替换，预览）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/notification-templates/{id}/render",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn render_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(data): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    tracing::info!("Rendering template: {} for user: {}", id, claims.username);

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT title_template AS title, content_template AS content
        FROM public.core_notification_templates
        WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => {
            let title_tpl = row.get::<Option<String>, _>("title").unwrap_or_default();
            let content_tpl = row.get::<Option<String>, _>("content").unwrap_or_default();
            let obj = data.as_object();
            let rendered_title = render_template_vars(&title_tpl, obj);
            let rendered_content = render_template_vars(&content_tpl, obj);
            Json(serde_json::json!({
                "success": true,
                "message": "Render template success",
                "data": {
                    "title": rendered_title,
                    "content": rendered_content,
                }
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to render template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to render template: {}", e),
                "data": null
            }))
        }
    }
}

/// 渲染模板变量：将 `{{var}}` 替换为 data 中对应字符串值；缺失时保留原占位
fn render_template_vars(
    template: &str,
    data: Option<&serde_json::Map<String, serde_json::Value>>,
) -> String {
    let mut out = String::with_capacity(template.len());
    let mut rest = template;
    while let Some(start) = rest.find("{{") {
        out.push_str(&rest[..start]);
        if let Some(end_rel) = rest[start + 2..].find("}}") {
            let key = rest[start + 2..start + 2 + end_rel].trim().to_string();
            let end = start + 2 + end_rel + 2;
            let replacement = data
                .and_then(|o| o.get(&key))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| rest[start..end].to_string());
            out.push_str(&replacement);
            rest = &rest[end..];
        } else {
            out.push_str(&rest[start..]);
            rest = "";
        }
    }
    out.push_str(rest);
    out
}

/// 创建模板
// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notification-templates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn create_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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

    let tenant_bind = if claims.is_superuser {
        Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
            .unwrap_or(Uuid::nil())
    };
    let result = sqlx::query(
        only_own_schema_query!("public", r#"
        INSERT INTO public.core_notification_templates (id, name, title_template, content_template, notification_type, priority, data, tenant_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id, name, title_template AS title, content_template AS content, notification_type, priority, data, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&notification_type)
    .bind(priority)
    .bind(&req.data)
    .bind(tenant_bind)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(row) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notification-templates/{id}",
    params(
        ("id" = String, Path, description = "Template ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn update_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        UPDATE public.core_notification_templates
        SET name = COALESCE($1, name),
            title_template = COALESCE($2, title_template),
            content_template = COALESCE($3, content_template),
            notification_type = COALESCE($4, notification_type),
            priority = COALESCE($5, priority),
            data = COALESCE($6, data),
            updated_at = NOW()
        WHERE id = $7
        RETURNING id, name, title_template AS title, content_template AS content, notification_type, priority, data, created_at, updated_at
        "#),
    )
    .bind(&req.name)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.notification_type)
    .bind(req.priority)
    .bind(&req.data)
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content").unwrap_or_default(),
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
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notification-templates/{id}",
    params(
        ("id" = String, Path, description = "Template ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn delete_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
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
        "UPDATE public.core_notification_templates SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut scope)
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

async fn send_notification_email(
    db: &Db,
    scope: &mut ScopedTxn<'_>,
    req: &SendNotificationRequest,
) -> Result<(), ()> {
    let email: Option<String> = sqlx::query_scalar(only_own_schema_query!(
        "public",
        "SELECT email FROM iam.users WHERE id = $1",
        "iam"
    ))
    .bind(req.user_id)
    .fetch_optional(&mut *scope)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get user email: {}", e);
    })?;

    if let Some(email) = email {
        let queue_id = crate::mail::queue_email(
            db,
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/channels",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_channels(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ChannelQuery>,
    headers: HeaderMap,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    // tenant_id 列为 uuid；claims.tenant_id 为字符串，解析失败按 None（超管分支仍为 None）
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
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
         WHERE ($1::uuid IS NULL OR tenant_id = $1) \
           AND ($2::text IS NULL OR type = $2) \
           AND ($3::text IS NULL OR status = $3) \
         ORDER BY created_at DESC LIMIT $5 OFFSET $6",
    )
    .bind(tenant_id)
    .bind(type_filter)
    .bind(status_filter)
    .bind(locale)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
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
         WHERE ($1::uuid IS NULL OR tenant_id = $1) AND ($2::text IS NULL OR type = $2) AND ($3::text IS NULL OR status = $3)",
    )
    .bind(tenant_id)
    .bind(query.r#type)
    .bind(query.status)
    .fetch_one(&mut scope)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/channels/{id}",
    params(
        ("id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_channel(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    // tenant_id 列为 uuid；claims.tenant_id 为字符串，解析失败按 None（超管分支仍为 None）
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match sqlx::query_as::<_, NotificationChannel>(
        "SELECT id, tenant_id,
                CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                type, status, provider_id, is_default, config, \
         rate_limit_per_minute, retry_count, description, \
         created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at \
         FROM notification_channels WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(locale)
    .fetch_optional(&mut scope)
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/channels",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn create_channel(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateChannelRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    // tenant_id 列为 uuid；claims.tenant_id 为字符串，解析失败回退 nil（与本文件其他写入一致）
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or(Uuid::nil());
    let id = Uuid::new_v4();
    let config = req.config.unwrap_or_else(|| serde_json::json!({}));
    let is_default = req.is_default.unwrap_or(false);

    // 如果设为默认，先取消其他默认
    if is_default {
        let _ = sqlx::query(
            "UPDATE notification_channels SET is_default = false, updated_at = NOW() \
             WHERE tenant_id = $1 AND is_default = true",
        )
        .bind(tenant_id)
        .execute(&mut scope)
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
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.r#type)
    .bind(req.provider_id)
    .bind(is_default)
    .bind(config)
    .bind(req.rate_limit_per_minute)
    .bind(req.retry_count.unwrap_or(3))
    .bind(req.description)
    .fetch_one(&mut scope)
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
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/channels/{id}",
    params(
        ("id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn update_channel(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateChannelRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    // tenant_id 列为 uuid；claims.tenant_id 为字符串，解析失败回退 nil（与 create_channel 一致）
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or(Uuid::nil());

    // 如果设为默认，先取消其他默认
    if req.is_default.unwrap_or(false) {
        let _ = sqlx::query(
            "UPDATE notification_channels SET is_default = false, updated_at = NOW() \
             WHERE tenant_id = $1 AND is_default = true AND id != $2",
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&mut scope)
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
    .bind(tenant_id)
    .fetch_optional(&mut scope)
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
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/channels/{id}",
    params(
        ("id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn delete_channel(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    // tenant_id 列为 uuid；claims.tenant_id 为字符串，解析失败回退 nil
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or(Uuid::nil());
    match sqlx::query("DELETE FROM notification_channels WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&mut scope)
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/channels/{id}/test",
    params(
        ("id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn test_channel(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    // tenant_id 列为 uuid；claims.tenant_id 为字符串，解析失败按 None（超管分支仍为 None）
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    match sqlx::query_as::<_, NotificationChannel>(
        "SELECT id, tenant_id, name, type, status, provider_id, is_default, config, \
         rate_limit_per_minute, retry_count, description, created_at, updated_at \
         FROM notification_channels WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/channels/{id}/metrics",
    params(
        ("id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_channel_metrics(
    State(_db): State<Db>,
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

/// 批量标记未读（`POST /notifications/bulk-unread`，载荷 `{ ids }`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/bulk-unread",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn bulk_mark_unread(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BulkIdsV2Request>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false, "message": "无效的用户ID", "data": null, "code": 400
            }));
        }
    };
    if payload.ids.is_empty() {
        return Json(serde_json::json!({
            "success": true, "message": "No notifications to mark as unread",
            "data": { "updated_count": 0 }
        }));
    }
    let result = sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE public.core_notifications SET is_read = FALSE, read_at = NULL WHERE user_id = $1 AND id = ANY($2)"
    ))
    .bind(user_id)
    .bind(&payload.ids)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Marked {} notifications as unread", r.rows_affected()),
            "data": { "updated_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to bulk mark notifications as unread: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to bulk mark notifications as unread: {}", e),
                "data": null
            }))
        }
    }
}

/// 条件批量已读（`POST /notifications/bulk-read-by-condition`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/bulk-read-by-condition",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn bulk_read_by_condition(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BulkConditionRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false, "message": "无效的用户ID", "data": null, "code": 400
            }));
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE public.core_notifications SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1
          AND ($2::uuid[] IS NULL OR id = ANY($2))
          AND ($3::int IS NULL OR created_at < NOW() - ($3 * INTERVAL '1 day'))
          AND ($4::text[] IS NULL OR notification_type = ANY($4))
        "#
    ))
    .bind(user_id)
    .bind(&req.ids)
    .bind(req.older_than_days)
    .bind(req.notification_types)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Marked {} notifications as read", r.rows_affected()),
            "data": { "updated_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to bulk read by condition: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to bulk read by condition: {}", e),
                "data": null
            }))
        }
    }
}

/// 条件批量删除（`POST /notifications/bulk-delete-by-condition`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/bulk-delete-by-condition",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn bulk_delete_by_condition(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BulkConditionRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false, "message": "无效的用户ID", "data": null, "code": 400
            }));
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE public.core_notifications SET deleted_at = NOW()
        WHERE user_id = $1
          AND ($2::uuid[] IS NULL OR id = ANY($2))
          AND ($3::int IS NULL OR created_at < NOW() - ($3 * INTERVAL '1 day'))
          AND ($4::text[] IS NULL OR notification_type = ANY($4))
          AND (COALESCE($5, FALSE) OR is_archived = FALSE)
        "#
    ))
    .bind(user_id)
    .bind(&req.ids)
    .bind(req.older_than_days)
    .bind(req.notification_types)
    .bind(req.include_archived)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Deleted {} notifications", r.rows_affected()),
            "data": { "deleted_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to bulk delete by condition: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to bulk delete by condition: {}", e),
                "data": null
            }))
        }
    }
}

/// 批量归档（`POST /notifications/bulk-archive`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/bulk-archive",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn bulk_archive(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BulkConditionRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false, "message": "无效的用户ID", "data": null, "code": 400
            }));
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE public.core_notifications SET is_archived = TRUE
        WHERE user_id = $1 AND is_archived = FALSE
          AND ($2::uuid[] IS NULL OR id = ANY($2))
          AND ($3::int IS NULL OR created_at < NOW() - ($3 * INTERVAL '1 day'))
          AND ($4::text[] IS NULL OR notification_type = ANY($4))
        "#
    ))
    .bind(user_id)
    .bind(&req.ids)
    .bind(req.older_than_days)
    .bind(req.notification_types)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Archived {} notifications", r.rows_affected()),
            "data": { "archived_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to bulk archive notifications: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to bulk archive notifications: {}", e),
                "data": null
            }))
        }
    }
}

/// 批量取消归档（`POST /notifications/bulk-unarchive`，载荷 `{ ids }`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/notifications/bulk-unarchive",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn bulk_unarchive(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BulkIdsV2Request>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false, "message": "无效的用户ID", "data": null, "code": 400
            }));
        }
    };
    if payload.ids.is_empty() {
        return Json(serde_json::json!({
            "success": true, "message": "No notifications to unarchive",
            "data": { "updated_count": 0 }
        }));
    }
    let result = sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE public.core_notifications SET is_archived = FALSE WHERE user_id = $1 AND id = ANY($2)"
    ))
    .bind(user_id)
    .bind(&payload.ids)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Unarchived {} notifications", r.rows_affected()),
            "data": { "updated_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to bulk unarchive notifications: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to bulk unarchive notifications: {}", e),
                "data": null
            }))
        }
    }
}

/// 模板批量状态更新（`PUT /notification-templates/batch-status`，载荷 `{ ids, status }`）
// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:admin"])),
    path = "/notification/notification-templates/batch-status",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn batch_update_template_status(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BulkTemplateStatusRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限更新通知模板状态",
            "data": null,
            "code": 403
        }));
    }
    if req.ids.is_empty() {
        return Json(serde_json::json!({
            "success": true, "message": "No templates to update",
            "data": { "updated_count": 0 }
        }));
    }
    let tenant_bind = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id)
    };
    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE public.core_notification_templates
        SET status = $1, updated_at = NOW()
        WHERE id = ANY($2) AND ($3::uuid IS NULL OR tenant_id = $3)
        "#
    ))
    .bind(&req.status)
    .bind(&req.ids)
    .bind(tenant_bind)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true,
            "message": format!("Updated {} templates", r.rows_affected()),
            "data": { "updated_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to batch update template status: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to batch update template status: {}", e),
                "data": null
            }))
        }
    }
}

fn default_preferences(user_id: Uuid) -> serde_json::Value {
    serde_json::json!({
        "user_id": user_id.to_string(),
        "categories": [],
        "quiet_hours": {
            "enabled": false,
            "start_time": "22:00",
            "end_time": "08:00",
            "days_of_week": [1, 2, 3, 4, 5],
            "bypass_priority": 2
        },
        "global_mute": { "enabled": false },
        "default_channels": ["in_app"],
        "language": "zh-CN",
        "timezone": "Asia/Shanghai",
        "updated_at": chrono::Utc::now().to_rfc3339()
    })
}

fn resolve_user_id(claims: &Claims) -> Result<Uuid, serde_json::Value> {
    Uuid::parse_str(&claims.sub).map_err(|e| {
        tracing::error!("Invalid user ID: {}", e);
        serde_json::json!({
            "success": false, "message": "无效的用户ID", "data": null, "code": 400
        })
    })
}

fn tenant_bind_for(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    }
}

/// 读取用户偏好行；不存在时返回 None
type PrefRow = (
    serde_json::Value,
    serde_json::Value,
    serde_json::Value,
    Vec<String>,
    String,
    String,
);

async fn load_preference_row(
    scope: &mut ScopedTxn<'_>,
    user_id: Uuid,
) -> Result<Option<PrefRow>, String> {
    let row = sqlx::query(
        "SELECT categories, quiet_hours, global_mute, default_channels, language, timezone \
         FROM core_notification_preferences WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(&mut *scope)
    .await
    .map_err(|e| format!("Failed to load preferences: {}", e))?;

    match row {
        None => Ok(None),
        Some(r) => Ok(Some((
            r.try_get::<serde_json::Value, _>("categories")
                .map_err(|e| format!("bad categories: {}", e))?,
            r.try_get::<serde_json::Value, _>("quiet_hours")
                .map_err(|e| format!("bad quiet_hours: {}", e))?,
            r.try_get::<serde_json::Value, _>("global_mute")
                .map_err(|e| format!("bad global_mute: {}", e))?,
            r.try_get::<Vec<String>, _>("default_channels")
                .map_err(|e| format!("bad default_channels: {}", e))?,
            r.try_get::<String, _>("language")
                .map_err(|e| format!("bad language: {}", e))?,
            r.try_get::<String, _>("timezone")
                .map_err(|e| format!("bad timezone: {}", e))?,
        ))),
    }
}

/// 获取当前用户偏好（`GET /notification/preferences`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/preferences",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_preferences(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    get_preferences_impl(&claims, &mut scope).await
}

async fn get_preferences_impl(
    claims: &Claims,
    scope: &mut ScopedTxn<'_>,
) -> Json<serde_json::Value> {
    let user_id = match resolve_user_id(claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    match load_preference_row(scope, user_id).await {
        Ok(Some((categories, quiet_hours, global_mute, channels, language, timezone))) => {
            Json(serde_json::json!({
                "success": true,
                "message": "ok",
                "data": {
                    "user_id": user_id.to_string(),
                    "categories": categories,
                    "quiet_hours": quiet_hours,
                    "global_mute": global_mute,
                    "default_channels": channels,
                    "language": language,
                    "timezone": timezone,
                    "updated_at": chrono::Utc::now().to_rfc3339()
                }
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": true,
            "message": "ok",
            "data": default_preferences(user_id)
        })),
        Err(e) => {
            tracing::error!("{}", e);
            Json(serde_json::json!({
                "success": false, "message": e, "data": null
            }))
        }
    }
}

/// 更新当前用户偏好（`PUT /notification/preferences`）
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/preferences",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn update_preferences(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PreferencesUpdate>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let existing = load_preference_row(&mut scope, user_id)
        .await
        .unwrap_or(None);
    let (old_cat, old_qh, old_gm, old_ch, old_lang, old_tz) = existing.unwrap_or((
        serde_json::json!([]),
        serde_json::json!({}),
        serde_json::json!({}),
        vec!["in_app".to_string()],
        "zh-CN".to_string(),
        "Asia/Shanghai".to_string(),
    ));
    let categories = req.categories.unwrap_or(old_cat);
    let quiet_hours = req.quiet_hours.unwrap_or(old_qh);
    let global_mute = old_gm;
    let default_channels = req.default_channels.unwrap_or(old_ch);
    let language = req.language.unwrap_or(old_lang);
    let timezone = req.timezone.unwrap_or(old_tz);
    let tenant_bind = tenant_bind_for(&claims);

    let result = sqlx::query(
        "INSERT INTO core_notification_preferences \
         (user_id, categories, quiet_hours, global_mute, default_channels, language, timezone, tenant_id, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) \
         ON CONFLICT (user_id) DO UPDATE SET \
         categories = EXCLUDED.categories, quiet_hours = EXCLUDED.quiet_hours, \
         global_mute = EXCLUDED.global_mute, default_channels = EXCLUDED.default_channels, \
         language = EXCLUDED.language, timezone = EXCLUDED.timezone, updated_at = NOW()",
    )
    .bind(user_id)
    .bind(&categories)
    .bind(&quiet_hours)
    .bind(&global_mute)
    .bind(&default_channels)
    .bind(&language)
    .bind(&timezone)
    .bind(tenant_bind)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => get_preferences_impl(&claims, &mut scope).await,
        Err(e) => {
            tracing::error!("Failed to update preferences: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update preferences: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取分类偏好（`GET /notification/preferences/categories`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/preferences/categories",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_category_preferences(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    match load_preference_row(&mut scope, user_id).await {
        Ok(Some((categories, _, _, _, _, _))) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": { "categories": categories }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": { "categories": [] }
        })),
        Err(e) => {
            tracing::error!("{}", e);
            Json(serde_json::json!({
                "success": false, "message": e, "data": null
            }))
        }
    }
}

/// 更新单个分类偏好（`PUT /notification/preferences/categories/{category}`）
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/preferences/categories/{category}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn update_category_preference(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(category): Path<String>,
    Json(req): Json<CategoryPreferenceUpdate>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let (current, _, _, _, _, _) = load_preference_row(&mut scope, user_id)
        .await
        .unwrap_or(None)
        .unwrap_or((
            serde_json::json!([]),
            serde_json::json!({}),
            serde_json::json!({}),
            vec!["in_app".to_string()],
            "zh-CN".to_string(),
            "Asia/Shanghai".to_string(),
        ));
    let mut cats: Vec<serde_json::Value> = serde_json::from_value(current).unwrap_or_default();
    let mut updated_item = serde_json::json!({ "category": category });
    if let Some(enabled) = req.enabled {
        updated_item["enabled"] = serde_json::json!(enabled);
    }
    if let Some(channels) = req.channels {
        updated_item["channels"] = serde_json::json!(channels);
    }
    if let Some(priority) = req.min_priority {
        updated_item["min_priority"] = serde_json::json!(priority);
    }
    let mut found = false;
    for item in cats.iter_mut() {
        if item.get("category").and_then(|c| c.as_str()) == Some(category.as_str()) {
            if let Some(obj) = item.as_object_mut() {
                for (k, v) in updated_item.as_object().cloned().unwrap_or_default() {
                    obj.insert(k, v);
                }
            }
            found = true;
            break;
        }
    }
    if !found {
        cats.push(updated_item);
    }
    let tenant_bind = tenant_bind_for(&claims);
    let result = sqlx::query(
        "INSERT INTO core_notification_preferences (user_id, categories, tenant_id, updated_at) \
         VALUES ($1, $2, $3, NOW()) \
         ON CONFLICT (user_id) DO UPDATE SET categories = EXCLUDED.categories, updated_at = NOW()",
    )
    .bind(user_id)
    .bind(serde_json::json!(cats))
    .bind(tenant_bind)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true, "message": "ok",
            "data": serde_json::json!({ "category": category })
        })),
        Err(e) => {
            tracing::error!("Failed to update category preference: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update category preference: {}", e),
                "data": null
            }))
        }
    }
}

/// 开启全局静音（`POST /notification/preferences/global-mute`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/preferences/global-mute",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn set_global_mute(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GlobalMuteRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let mute = serde_json::json!({
        "enabled": true,
        "muted_until": req.muted_until,
        "reason": req.reason
    });
    let tenant_bind = tenant_bind_for(&claims);
    let result = sqlx::query(
        "INSERT INTO core_notification_preferences (user_id, global_mute, tenant_id, updated_at) \
         VALUES ($1, $2, $3, NOW()) \
         ON CONFLICT (user_id) DO UPDATE SET global_mute = EXCLUDED.global_mute, updated_at = NOW()",
    )
    .bind(user_id)
    .bind(&mute)
    .bind(tenant_bind)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": mute
        })),
        Err(e) => {
            tracing::error!("Failed to set global mute: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to set global mute: {}", e),
                "data": null
            }))
        }
    }
}

/// 取消全局静音（`DELETE /notification/preferences/global-mute`）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/preferences/global-mute",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn cancel_global_mute(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let mute = serde_json::json!({ "enabled": false });
    let tenant_bind = tenant_bind_for(&claims);
    let result = sqlx::query(
        "INSERT INTO core_notification_preferences (user_id, global_mute, tenant_id, updated_at) \
         VALUES ($1, $2, $3, NOW()) \
         ON CONFLICT (user_id) DO UPDATE SET global_mute = EXCLUDED.global_mute, updated_at = NOW()",
    )
    .bind(user_id)
    .bind(&mute)
    .bind(tenant_bind)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": mute
        })),
        Err(e) => {
            tracing::error!("Failed to cancel global mute: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to cancel global mute: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取免打扰时段（`GET /notification/preferences/quiet-hours`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/preferences/quiet-hours",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_quiet_hours(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    match load_preference_row(&mut scope, user_id).await {
        Ok(Some((_, quiet_hours, _, _, _, _))) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": quiet_hours
        })),
        Ok(None) => Json(serde_json::json!({
            "success": true, "message": "ok",
            "data": {
                "enabled": false,
                "start_time": "22:00",
                "end_time": "08:00",
                "days_of_week": [1, 2, 3, 4, 5],
                "bypass_priority": 2
            }
        })),
        Err(e) => {
            tracing::error!("{}", e);
            Json(serde_json::json!({
                "success": false, "message": e, "data": null
            }))
        }
    }
}

/// 更新免打扰时段（`PUT /notification/preferences/quiet-hours`）
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/preferences/quiet-hours",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn update_quiet_hours(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<QuietHoursUpdate>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let (_, old_qh, _, _, _, _) = load_preference_row(&mut scope, user_id)
        .await
        .unwrap_or(None)
        .unwrap_or((
            serde_json::json!([]),
            serde_json::json!({}),
            serde_json::json!({}),
            vec!["in_app".to_string()],
            "zh-CN".to_string(),
            "Asia/Shanghai".to_string(),
        ));
    let mut qh = old_qh.as_object().cloned().unwrap_or_default();
    if let Some(v) = req.enabled {
        qh.insert("enabled".into(), serde_json::json!(v));
    }
    if let Some(v) = req.start_time {
        qh.insert("start_time".into(), serde_json::json!(v));
    }
    if let Some(v) = req.end_time {
        qh.insert("end_time".into(), serde_json::json!(v));
    }
    if let Some(v) = req.days_of_week {
        qh.insert("days_of_week".into(), serde_json::json!(v));
    }
    if let Some(v) = req.bypass_priority {
        qh.insert("bypass_priority".into(), serde_json::json!(v));
    }
    let tenant_bind = tenant_bind_for(&claims);
    let result = sqlx::query(
        "INSERT INTO core_notification_preferences (user_id, quiet_hours, tenant_id, updated_at) \
         VALUES ($1, $2, $3, NOW()) \
         ON CONFLICT (user_id) DO UPDATE SET quiet_hours = EXCLUDED.quiet_hours, updated_at = NOW()",
    )
    .bind(user_id)
    .bind(serde_json::json!(qh))
    .bind(tenant_bind)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": serde_json::json!(qh)
        })),
        Err(e) => {
            tracing::error!("Failed to update quiet hours: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update quiet hours: {}", e),
                "data": null
            }))
        }
    }
}

/// 重置偏好（`POST /notification/preferences/reset`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/preferences/reset",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn reset_preferences(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let defaults = default_preferences(user_id);
    let tenant_bind = tenant_bind_for(&claims);
    let result = sqlx::query(
        "INSERT INTO core_notification_preferences \
         (user_id, categories, quiet_hours, global_mute, default_channels, language, timezone, tenant_id, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) \
         ON CONFLICT (user_id) DO UPDATE SET \
         categories = EXCLUDED.categories, quiet_hours = EXCLUDED.quiet_hours, \
         global_mute = EXCLUDED.global_mute, default_channels = EXCLUDED.default_channels, \
         language = EXCLUDED.language, timezone = EXCLUDED.timezone, updated_at = NOW()",
    )
    .bind(user_id)
    .bind(serde_json::json!([]))
    .bind(defaults["quiet_hours"].clone())
    .bind(defaults["global_mute"].clone())
    .bind(vec!["in_app".to_string()])
    .bind("zh-CN".to_string())
    .bind("Asia/Shanghai".to_string())
    .bind(tenant_bind)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": defaults
        })),
        Err(e) => {
            tracing::error!("Failed to reset preferences: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to reset preferences: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取默认偏好（`GET /notification/preferences/defaults`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/preferences/defaults",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_default_preferences(
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
    Json(serde_json::json!({
        "success": true, "message": "ok", "data": default_preferences(user_id)
    }))
}

fn subscription_row_to_json(r: &sqlx::postgres::PgRow) -> Result<serde_json::Value, String> {
    let id: Uuid = r.try_get("id").map_err(|e| format!("bad id: {}", e))?;
    let user_id: Uuid = r
        .try_get("user_id")
        .map_err(|e| format!("bad user_id: {}", e))?;
    let tenant_id: Option<Uuid> = r
        .try_get("tenant_id")
        .map_err(|e| format!("bad tenant_id: {}", e))?;
    let event_type: String = r
        .try_get("event_type")
        .map_err(|e| format!("bad event_type: {}", e))?;
    let event_category: Option<String> = r
        .try_get("event_category")
        .map_err(|e| format!("bad event_category: {}", e))?;
    let channels: Vec<String> = r
        .try_get("channels")
        .map_err(|e| format!("bad channels: {}", e))?;
    let status: String = r
        .try_get("status")
        .map_err(|e| format!("bad status: {}", e))?;
    let filter_expression: Option<String> = r
        .try_get("filter_expression")
        .map_err(|e| format!("bad filter_expression: {}", e))?;
    let priority: i32 = r
        .try_get("priority")
        .map_err(|e| format!("bad priority: {}", e))?;
    let expires_at: Option<chrono::DateTime<chrono::Utc>> = r
        .try_get("expires_at")
        .map_err(|e| format!("bad expires_at: {}", e))?;
    let created_at: chrono::DateTime<chrono::Utc> = r
        .try_get("created_at")
        .map_err(|e| format!("bad created_at: {}", e))?;
    let updated_at: chrono::DateTime<chrono::Utc> = r
        .try_get("updated_at")
        .map_err(|e| format!("bad updated_at: {}", e))?;
    Ok(serde_json::json!({
        "id": id.to_string(),
        "tenant_id": tenant_id.map(|t| t.to_string()),
        "user_id": user_id.to_string(),
        "event_type": event_type,
        "event_category": event_category,
        "channels": channels,
        "status": status,
        "filter_expression": filter_expression,
        "priority": priority,
        "expires_at": expires_at.map(|t| t.to_rfc3339()),
        "created_at": created_at.to_rfc3339(),
        "updated_at": updated_at.to_rfc3339()
    }))
}

/// 订阅列表（`GET /notification/subscriptions`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/subscriptions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_subscriptions(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<SubscriptionQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let rows = sqlx::query(
        "SELECT id, user_id, tenant_id, event_type, event_category, channels, status, \
         filter_expression, priority, expires_at, created_at, updated_at \
         FROM core_notification_subscriptions \
         WHERE user_id = $1 \
           AND ($2::text IS NULL OR event_type = $2) \
           AND ($3::text IS NULL OR status = $3) \
           AND ($4::text IS NULL OR $4 = ANY(channels)) \
         ORDER BY created_at DESC \
         LIMIT $5 OFFSET $6",
    )
    .bind(user_id)
    .bind(&query.event_type)
    .bind(&query.status)
    .bind(&query.channel)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;
    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM core_notification_subscriptions \
         WHERE user_id = $1 \
           AND ($2::text IS NULL OR event_type = $2) \
           AND ($3::text IS NULL OR status = $3) \
           AND ($4::text IS NULL OR $4 = ANY(channels))",
    )
    .bind(user_id)
    .bind(&query.event_type)
    .bind(&query.status)
    .bind(&query.channel)
    .fetch_one(&mut scope)
    .await;

    match (rows, total) {
        (Ok(rows), Ok(total)) => {
            let items: Vec<serde_json::Value> = rows
                .iter()
                .filter_map(|r| subscription_row_to_json(r).ok())
                .collect();
            Json(serde_json::json!({
                "success": true, "message": "ok",
                "data": { "items": items, "total": total, "page": page, "page_size": page_size }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to list subscriptions: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list subscriptions: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取单条订阅（`GET /notification/subscriptions/{id}`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/subscriptions/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_subscription(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let row = sqlx::query(
        "SELECT id, user_id, tenant_id, event_type, event_category, channels, status, \
         filter_expression, priority, expires_at, created_at, updated_at \
         FROM core_notification_subscriptions WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => match subscription_row_to_json(&r) {
            Ok(v) => Json(serde_json::json!({ "success": true, "message": "ok", "data": v })),
            Err(e) => Json(serde_json::json!({ "success": false, "message": e, "data": null })),
        },
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "订阅不存在", "data": null, "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to get subscription: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get subscription: {}", e),
                "data": null
            }))
        }
    }
}

/// 创建订阅（`POST /notification/subscriptions`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/subscriptions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn create_subscription(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let channels = req.channels.unwrap_or_else(|| vec!["in_app".to_string()]);
    let tenant_bind = tenant_bind_for(&claims);
    let expires = req.expires_at.as_deref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    });
    let row = sqlx::query(
        "INSERT INTO core_notification_subscriptions \
         (user_id, tenant_id, event_type, event_category, channels, status, filter_expression, priority, expires_at) \
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8) \
         RETURNING id, user_id, tenant_id, event_type, event_category, channels, status, \
         filter_expression, priority, expires_at, created_at, updated_at",
    )
    .bind(user_id)
    .bind(tenant_bind)
    .bind(&req.event_type)
    .bind(&req.event_category)
    .bind(&channels)
    .bind(&req.filter_expression)
    .bind(req.priority.unwrap_or(0))
    .bind(expires)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => match subscription_row_to_json(&r) {
            Ok(v) => Json(serde_json::json!({ "success": true, "message": "ok", "data": v })),
            Err(e) => Json(serde_json::json!({ "success": false, "message": e, "data": null })),
        },
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "创建订阅失败", "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to create subscription: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to create subscription: {}", e),
                "data": null
            }))
        }
    }
}

/// 更新订阅（`PUT /notification/subscriptions/{id}`）
#[utoipa::path(
    put,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/subscriptions/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn update_subscription(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSubscriptionRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let expires = req.expires_at.as_deref().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    });
    let row = sqlx::query(
        "UPDATE core_notification_subscriptions SET \
         channels = COALESCE($1, channels), \
         filter_expression = COALESCE($2, filter_expression), \
         priority = COALESCE($3, priority), \
         expires_at = COALESCE($4, expires_at), \
         updated_at = NOW() \
         WHERE id = $5 AND user_id = $6 \
         RETURNING id, user_id, tenant_id, event_type, event_category, channels, status, \
         filter_expression, priority, expires_at, created_at, updated_at",
    )
    .bind(&req.channels)
    .bind(&req.filter_expression)
    .bind(req.priority)
    .bind(expires)
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => match subscription_row_to_json(&r) {
            Ok(v) => Json(serde_json::json!({ "success": true, "message": "ok", "data": v })),
            Err(e) => Json(serde_json::json!({ "success": false, "message": e, "data": null })),
        },
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "订阅不存在", "data": null, "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to update subscription: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update subscription: {}", e),
                "data": null
            }))
        }
    }
}

/// 删除订阅（`DELETE /notification/subscriptions/{id}`）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/subscriptions/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn delete_subscription(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let result =
        sqlx::query("DELETE FROM core_notification_subscriptions WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(&mut scope)
            .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true, "message": "ok",
            "data": { "deleted": r.rows_affected() > 0 }
        })),
        Err(e) => {
            tracing::error!("Failed to delete subscription: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to delete subscription: {}", e),
                "data": null
            }))
        }
    }
}

/// 暂停订阅（`POST /notification/subscriptions/{id}/pause`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/subscriptions/{id}/pause",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn pause_subscription(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let row = sqlx::query(
        "UPDATE core_notification_subscriptions SET status = 'paused', updated_at = NOW() \
         WHERE id = $1 AND user_id = $2 \
         RETURNING id, user_id, tenant_id, event_type, event_category, channels, status, \
         filter_expression, priority, expires_at, created_at, updated_at",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => match subscription_row_to_json(&r) {
            Ok(v) => Json(serde_json::json!({ "success": true, "message": "ok", "data": v })),
            Err(e) => Json(serde_json::json!({ "success": false, "message": e, "data": null })),
        },
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "订阅不存在", "data": null, "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to pause subscription: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to pause subscription: {}", e),
                "data": null
            }))
        }
    }
}

/// 恢复订阅（`POST /notification/subscriptions/{id}/resume`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/subscriptions/{id}/resume",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn resume_subscription(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let row = sqlx::query(
        "UPDATE core_notification_subscriptions SET status = 'active', updated_at = NOW() \
         WHERE id = $1 AND user_id = $2 \
         RETURNING id, user_id, tenant_id, event_type, event_category, channels, status, \
         filter_expression, priority, expires_at, created_at, updated_at",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => match subscription_row_to_json(&r) {
            Ok(v) => Json(serde_json::json!({ "success": true, "message": "ok", "data": v })),
            Err(e) => Json(serde_json::json!({ "success": false, "message": e, "data": null })),
        },
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "订阅不存在", "data": null, "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to resume subscription: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to resume subscription: {}", e),
                "data": null
            }))
        }
    }
}

/// 我的订阅（`GET /notification/my-subscriptions`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/my-subscriptions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn my_subscriptions(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<SubscriptionQuery>,
) -> Json<serde_json::Value> {
    list_subscriptions(
        State(db),
        Extension(txn_arc),
        Extension(claims),
        Query(query),
    )
    .await
}

/// 批量订阅（`POST /notification/batch-subscribe`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/batch-subscribe",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn batch_subscribe(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchSubscribeRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let tenant_bind = tenant_bind_for(&claims);
    let mut created = 0;
    for sub in &req.subscriptions {
        let channels = sub
            .channels
            .clone()
            .unwrap_or_else(|| vec!["in_app".to_string()]);
        let expires = sub.expires_at.as_deref().and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(s)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        });
        let result = sqlx::query(
            "INSERT INTO core_notification_subscriptions \
             (user_id, tenant_id, event_type, event_category, channels, status, filter_expression, priority, expires_at) \
             VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8) \
             ON CONFLICT DO NOTHING",
        )
        .bind(user_id)
        .bind(tenant_bind)
        .bind(&sub.event_type)
        .bind(&sub.event_category)
        .bind(&channels)
        .bind(&sub.filter_expression)
        .bind(sub.priority.unwrap_or(0))
        .bind(expires)
        .execute(&mut scope)
        .await;
        if let Ok(r) = result {
            created += i32::try_from(r.rows_affected()).unwrap_or(0);
        }
    }
    Json(serde_json::json!({
        "success": true, "message": "ok", "data": { "created_count": created }
    }))
}

/// 批量退订（`DELETE /notification/batch-unsubscribe`）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/batch-unsubscribe",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn batch_unsubscribe(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchUnsubscribeRequest>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let result = sqlx::query(
        "DELETE FROM core_notification_subscriptions WHERE user_id = $1 AND id = ANY($2)",
    )
    .bind(user_id)
    .bind(&req.ids)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true, "message": "ok",
            "data": { "cancelled_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to batch unsubscribe: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to batch unsubscribe: {}", e),
                "data": null
            }))
        }
    }
}

/// 按事件类型退订（`DELETE /notification/subscriptions/event?event_type=...`）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/subscriptions/event",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn unsubscribe_event(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<SubscriptionQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let Some(event_type) = query.event_type else {
        return Json(serde_json::json!({
            "success": false, "message": "缺少 event_type 参数", "data": null, "code": 400
        }));
    };
    let result = sqlx::query(
        "DELETE FROM core_notification_subscriptions WHERE user_id = $1 AND event_type = $2",
    )
    .bind(user_id)
    .bind(&event_type)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true, "message": "ok",
            "data": { "deleted": r.rows_affected() > 0 }
        })),
        Err(e) => {
            tracing::error!("Failed to unsubscribe event: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to unsubscribe event: {}", e),
                "data": null
            }))
        }
    }
}

/// 事件类型枚举（`GET /notification/event-types`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/event-types",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_event_types() -> Json<serde_json::Value> {
    let types = serde_json::json!([
        { "event_type": "system", "description": "系统通知", "category": "system" },
        { "event_type": "workflow", "description": "流程待办", "category": "workflow" },
        { "event_type": "reminder", "description": "提醒", "category": "reminder" },
        { "event_type": "alert", "description": "预警", "category": "alert" },
        { "event_type": "message", "description": "消息", "category": "message" },
        { "event_type": "task", "description": "任务", "category": "task" },
        { "event_type": "approval", "description": "审批", "category": "approval" },
        { "event_type": "comment", "description": "评论", "category": "comment" },
        { "event_type": "mention", "description": "提及", "category": "mention" },
        { "event_type": "announcement", "description": "公告", "category": "announcement" }
    ]);
    Json(serde_json::json!({ "success": true, "message": "ok", "data": types }))
}

fn delivery_row_to_json(r: &sqlx::postgres::PgRow) -> Result<serde_json::Value, String> {
    let id: Uuid = r.try_get("id").map_err(|e| format!("bad id: {}", e))?;
    let notification_id: Uuid = r
        .try_get("notification_id")
        .map_err(|e| format!("bad notification_id: {}", e))?;
    let user_id: Option<Uuid> = r
        .try_get("user_id")
        .map_err(|e| format!("bad user_id: {}", e))?;
    let channel: String = r
        .try_get("channel")
        .map_err(|e| format!("bad channel: {}", e))?;
    let status: String = r
        .try_get("status")
        .map_err(|e| format!("bad status: {}", e))?;
    let recipient: String = r
        .try_get("recipient")
        .map_err(|e| format!("bad recipient: {}", e))?;
    let subject: Option<String> = r
        .try_get("subject")
        .map_err(|e| format!("bad subject: {}", e))?;
    let body: Option<String> = r.try_get("body").map_err(|e| format!("bad body: {}", e))?;
    let sent_at: Option<chrono::DateTime<chrono::Utc>> = r
        .try_get("sent_at")
        .map_err(|e| format!("bad sent_at: {}", e))?;
    let delivered_at: Option<chrono::DateTime<chrono::Utc>> = r
        .try_get("delivered_at")
        .map_err(|e| format!("bad delivered_at: {}", e))?;
    let failed_at: Option<chrono::DateTime<chrono::Utc>> = r
        .try_get("failed_at")
        .map_err(|e| format!("bad failed_at: {}", e))?;
    let failure_reason: Option<String> = r
        .try_get("failure_reason")
        .map_err(|e| format!("bad failure_reason: {}", e))?;
    let retry_count: i32 = r
        .try_get("retry_count")
        .map_err(|e| format!("bad retry_count: {}", e))?;
    let max_retries: i32 = r
        .try_get("max_retries")
        .map_err(|e| format!("bad max_retries: {}", e))?;
    let next_retry_at: Option<chrono::DateTime<chrono::Utc>> = r
        .try_get("next_retry_at")
        .map_err(|e| format!("bad next_retry_at: {}", e))?;
    let provider_message_id: Option<String> = r
        .try_get("provider_message_id")
        .map_err(|e| format!("bad provider_message_id: {}", e))?;
    let metadata: Option<serde_json::Value> = r
        .try_get("metadata")
        .map_err(|e| format!("bad metadata: {}", e))?;
    let created_at: chrono::DateTime<chrono::Utc> = r
        .try_get("created_at")
        .map_err(|e| format!("bad created_at: {}", e))?;
    let updated_at: chrono::DateTime<chrono::Utc> = r
        .try_get("updated_at")
        .map_err(|e| format!("bad updated_at: {}", e))?;
    Ok(serde_json::json!({
        "id": id.to_string(),
        "notification_id": notification_id.to_string(),
        "user_id": user_id.map(|u| u.to_string()),
        "channel": channel,
        "status": status,
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "sent_at": sent_at.map(|t| t.to_rfc3339()),
        "delivered_at": delivered_at.map(|t| t.to_rfc3339()),
        "failed_at": failed_at.map(|t| t.to_rfc3339()),
        "failure_reason": failure_reason,
        "retry_count": retry_count,
        "max_retries": max_retries,
        "next_retry_at": next_retry_at.map(|t| t.to_rfc3339()),
        "provider_message_id": provider_message_id,
        "metadata": metadata,
        "created_at": created_at.to_rfc3339(),
        "updated_at": updated_at.to_rfc3339()
    }))
}

fn delivery_select_sql() -> &'static str {
    "SELECT id, notification_id, user_id, channel, status, recipient, subject, body, \
     sent_at, delivered_at, failed_at, failure_reason, retry_count, max_retries, \
     next_retry_at, provider_message_id, metadata, created_at, updated_at \
     FROM core_notification_deliveries"
}

fn parse_ts(s: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    s.as_deref().and_then(|v| {
        chrono::DateTime::parse_from_rfc3339(v)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    })
}

async fn paginated_deliveries(
    scope: &mut ScopedTxn<'_>,
    user_id: Uuid,
    query: &DeliveryQuery,
) -> Json<serde_json::Value> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let from = parse_ts(&query.from_date);
    let to = parse_ts(&query.to_date);
    let filter = format!(
        "WHERE user_id = $1 \
         AND ($2::text IS NULL OR status = $2) \
         AND ($3::text IS NULL OR channel = $3) \
         AND ($4::uuid IS NULL OR notification_id = $4) \
         AND ($5::uuid IS NULL OR batch_id = $5) \
         AND ($6::timestamptz IS NULL OR created_at >= $6) \
         AND ($7::timestamptz IS NULL OR created_at <= $7)"
    );
    let sql = format!(
        "{} {} ORDER BY created_at DESC LIMIT $8 OFFSET $9",
        delivery_select_sql(),
        filter
    );
    let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
    q = q.bind(user_id);
    q = q.bind(&query.status);
    q = q.bind(&query.channel);
    q = q.bind(query.notification_id);
    q = q.bind(query.batch_id);
    q = q.bind(from);
    q = q.bind(to);
    q = q.bind(page_size);
    q = q.bind(offset);
    let rows = q.fetch_all(&mut *scope).await;
    let count_sql = format!(
        "SELECT COUNT(*) FROM core_notification_deliveries {}",
        filter
    );
    let mut c = sqlx::query(sqlx::AssertSqlSafe(count_sql));
    c = c.bind(user_id);
    c = c.bind(&query.status);
    c = c.bind(&query.channel);
    c = c.bind(query.notification_id);
    c = c.bind(query.batch_id);
    c = c.bind(from);
    c = c.bind(to);
    let total = c.fetch_one(&mut *scope).await;
    match (rows, total) {
        (Ok(rows), Ok(total)) => {
            let items: Vec<serde_json::Value> = rows
                .iter()
                .filter_map(|r| delivery_row_to_json(r).ok())
                .collect();
            let total: i64 = total.try_get("count").unwrap_or(0);
            Json(serde_json::json!({
                "success": true, "message": "ok",
                "data": { "deliveries": items, "total": total, "page": page, "page_size": page_size }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to list deliveries: {}", e);
            Json(serde_json::json!({
                "success": false, "message": format!("Failed to list deliveries: {}", e), "data": null
            }))
        }
    }
}

/// 投递列表（`GET /notification/deliveries`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/deliveries",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_deliveries(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DeliveryQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    paginated_deliveries(&mut scope, user_id, &query).await
}

/// 获取单条投递（`GET /notification/deliveries/{id}`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/deliveries/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn get_delivery(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let row = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{} WHERE id = $1 AND user_id = $2",
        delivery_select_sql()
    )))
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => match delivery_row_to_json(&r) {
            Ok(v) => Json(serde_json::json!({ "success": true, "message": "ok", "data": v })),
            Err(e) => Json(serde_json::json!({ "success": false, "message": e, "data": null })),
        },
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "投递记录不存在", "data": null, "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to get delivery: {}", e);
            Json(serde_json::json!({
                "success": false, "message": format!("Failed to get delivery: {}", e), "data": null
            }))
        }
    }
}

/// 重试投递（`POST /notification/deliveries/{id}/retry`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/deliveries/{id}/retry",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn retry_delivery(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let prev = sqlx::query_scalar::<_, String>(
        "SELECT status FROM core_notification_deliveries WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;
    let previous_status = match prev {
        Ok(Some(s)) => s,
        Ok(None) => {
            return Json(serde_json::json!({
                "success": false, "message": "投递记录不存在", "data": null, "code": 404
            }))
        }
        Err(e) => {
            return Json(serde_json::json!({
                "success": false, "message": format!("Failed to retry delivery: {}", e), "data": null
            }))
        }
    };
    let row = sqlx::query(
        "UPDATE core_notification_deliveries SET status = 'pending', \
         retry_count = retry_count + 1, failure_reason = NULL, \
         next_retry_at = NOW() + INTERVAL '5 minutes', updated_at = NOW() \
         WHERE id = $1 AND user_id = $2 \
         RETURNING id, notification_id, user_id, channel, status, recipient, subject, body, \
         sent_at, delivered_at, failed_at, failure_reason, retry_count, max_retries, \
         next_retry_at, provider_message_id, metadata, created_at, updated_at",
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(_)) => Json(serde_json::json!({
            "success": true, "message": "ok",
            "data": { "id": id.to_string(), "previous_status": previous_status, "new_status": "pending" }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false, "message": "投递记录不存在", "data": null, "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to retry delivery: {}", e);
            Json(serde_json::json!({
                "success": false, "message": format!("Failed to retry delivery: {}", e), "data": null
            }))
        }
    }
}

/// 按批次查询投递（`GET /notification/deliveries/batch/{batchId}`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/deliveries/batch/{batchId}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_batch_deliveries(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(batch_id): Path<Uuid>,
    Query(query): Query<DeliveryQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let mut q = query;
    q.batch_id = Some(batch_id);
    paginated_deliveries(&mut scope, user_id, &q).await
}

/// 按用户查询投递（`GET /notification/deliveries/by-user/{userId}`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/deliveries/by-user/{userId}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_user_deliveries(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<Uuid>,
    Query(query): Query<DeliveryQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let current = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let _ = current;
    paginated_deliveries(&mut scope, user_id, &query).await
}

/// 投递统计（`GET /notification/deliveries/stats`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/deliveries/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn delivery_stats(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<DeliveryStatsQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let from = parse_ts(&query.from_date);
    let to = parse_ts(&query.to_date);
    let agg = sqlx::query(
        "SELECT COUNT(*) AS total, \
         COUNT(*) FILTER (WHERE status = 'pending') AS pending, \
         COUNT(*) FILTER (WHERE status = 'delivered') AS delivered, \
         COUNT(*) FILTER (WHERE status = 'failed') AS failed, \
         COUNT(*) FILTER (WHERE status = 'expired') AS expired, \
         COALESCE(AVG(CASE WHEN delivered_at IS NOT NULL \
           THEN EXTRACT(EPOCH FROM (delivered_at - COALESCE(sent_at, created_at))) * 1000 END), 0) AS avg_ms \
         FROM core_notification_deliveries \
         WHERE ($1::timestamptz IS NULL OR created_at >= $1) \
           AND ($2::timestamptz IS NULL OR created_at <= $2) \
           AND ($3::text IS NULL OR channel = $3)",
    )
    .bind(from)
    .bind(to)
    .bind(&query.channel)
    .fetch_one(&mut scope)
    .await;
    let by_channel = sqlx::query(
        "SELECT channel, COUNT(*) AS cnt FROM core_notification_deliveries \
         WHERE ($1::timestamptz IS NULL OR created_at >= $1) \
           AND ($2::timestamptz IS NULL OR created_at <= $2) \
           AND ($3::text IS NULL OR channel = $3) GROUP BY channel",
    )
    .bind(from)
    .bind(to)
    .bind(&query.channel)
    .fetch_all(&mut scope)
    .await;
    let by_status = sqlx::query(
        "SELECT status, COUNT(*) AS cnt FROM core_notification_deliveries \
         WHERE ($1::timestamptz IS NULL OR created_at >= $1) \
           AND ($2::timestamptz IS NULL OR created_at <= $2) \
           AND ($3::text IS NULL OR channel = $3) GROUP BY status",
    )
    .bind(from)
    .bind(to)
    .bind(&query.channel)
    .fetch_all(&mut scope)
    .await;
    let reasons = sqlx::query(
        "SELECT COALESCE(failure_reason, 'unknown') AS reason, COUNT(*) AS cnt \
         FROM core_notification_deliveries WHERE status = 'failed' \
         GROUP BY reason ORDER BY cnt DESC LIMIT 10",
    )
    .fetch_all(&mut scope)
    .await;

    match (agg, by_channel, by_status, reasons) {
        (Ok(a), Ok(ch), Ok(st), Ok(rs)) => {
            let total: i64 = a.try_get("total").unwrap_or(0);
            let pending: i64 = a.try_get("pending").unwrap_or(0);
            let delivered: i64 = a.try_get("delivered").unwrap_or(0);
            let failed: i64 = a.try_get("failed").unwrap_or(0);
            let expired: i64 = a.try_get("expired").unwrap_or(0);
            let avg_ms: f64 = a.try_get("avg_ms").unwrap_or(0.0);
            let mut by_channel_map = serde_json::Map::new();
            for r in &ch {
                let c: String = r.try_get("channel").unwrap_or_default();
                let n: i64 = r.try_get("cnt").unwrap_or(0);
                by_channel_map.insert(c, serde_json::json!(n));
            }
            let mut by_status_map = serde_json::Map::new();
            for r in &st {
                let s: String = r.try_get("status").unwrap_or_default();
                let n: i64 = r.try_get("cnt").unwrap_or(0);
                by_status_map.insert(s, serde_json::json!(n));
            }
            let mut failure_reasons = Vec::new();
            for r in &rs {
                let reason: String = r.try_get("reason").unwrap_or_default();
                let n: i64 = r.try_get("cnt").unwrap_or(0);
                failure_reasons.push(serde_json::json!({ "reason": reason, "count": n }));
            }
            #[allow(clippy::cast_precision_loss, clippy::as_conversions)]
            let delivery_rate = if total > 0 {
                delivered as f64 / total as f64
            } else {
                0.0
            };
            Json(serde_json::json!({
                "success": true, "message": "ok",
                "data": {
                    "total": total, "pending": pending, "delivered": delivered,
                    "failed": failed, "expired": expired,
                    "by_channel": by_channel_map, "by_status": by_status_map,
                    "delivery_rate": delivery_rate,
                    "average_delivery_time_ms": avg_ms,
                    "failure_reasons": failure_reasons
                }
            }))
        }
        (Err(e), _, _, _) => {
            tracing::error!("Failed to compute delivery stats: {}", e);
            Json(serde_json::json!({
                "success": false, "message": format!("Failed to compute delivery stats: {}", e), "data": null
            }))
        }
        (_, Err(e), _, _) | (_, _, Err(e), _) | (_, _, _, Err(e)) => {
            tracing::error!("Failed to compute delivery stats: {}", e);
            Json(serde_json::json!({
                "success": false, "message": format!("Failed to compute delivery stats: {}", e), "data": null
            }))
        }
    }
}

/// 失败投递列表（`GET /notification/deliveries/failed`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/deliveries/failed",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_failed_deliveries(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DeliveryQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let mut q = query;
    q.status = Some("failed".to_string());
    paginated_deliveries(&mut scope, user_id, &q).await
}

/// 全部失败重试（`POST /notification/deliveries/retry-all`）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/deliveries/retry-all",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn retry_all_failed(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let result = sqlx::query(
        "UPDATE core_notification_deliveries SET status = 'pending', \
         retry_count = retry_count + 1, failure_reason = NULL, \
         next_retry_at = NOW() + INTERVAL '5 minutes', updated_at = NOW() \
         WHERE status = 'failed' AND user_id = $1",
    )
    .bind(user_id)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true, "message": "ok",
            "data": { "retried_count": r.rows_affected() }
        })),
        Err(e) => {
            tracing::error!("Failed to retry all failed deliveries: {}", e);
            Json(serde_json::json!({
                "success": false, "message": format!("Failed to retry all failed deliveries: {}", e), "data": null
            }))
        }
    }
}

/// 按渠道查询投递（`GET /notification/deliveries/by-channel/{channel}`）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:notification:read"])),
    path = "/notification/deliveries/by-channel/{channel}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn list_channel_deliveries(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(channel): Path<String>,
    Query(query): Query<DeliveryQuery>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(id) => id,
        Err(v) => return Json(v),
    };
    let mut q = query;
    q.channel = Some(channel);
    paginated_deliveries(&mut scope, user_id, &q).await
}

/// 删除投递记录（`DELETE /notification/deliveries/{id}`）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["communication:notification:write"])),
    path = "/notification/deliveries/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
pub async fn delete_delivery(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(serde_json::json!({
            "success": false,
            "message": "数据库事务不可用",
            "data": null,
            "code": 500
        }));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "数据库事务不可用",
                "data": null,
                "code": 500
            }));
        }
    };
    let user_id = match resolve_user_id(&claims) {
        Ok(uid) => uid,
        Err(v) => return Json(v),
    };
    let result =
        sqlx::query("DELETE FROM core_notification_deliveries WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(&mut scope)
            .await;
    match result {
        Ok(r) => Json(serde_json::json!({
            "success": true, "message": "ok", "data": r.rows_affected() > 0
        })),
        Err(e) => {
            tracing::error!("Failed to delete delivery: {}", e);
            Json(serde_json::json!({
                "success": false, "message": format!("Failed to delete delivery: {}", e), "data": null
            }))
        }
    }
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

    async fn response_json(res: Response) -> serde_json::Value {
        let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
            .await
            .expect("read response body");
        serde_json::from_slice(&bytes).expect("response body json")
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
            must_change_password: false,
        }
    }

    fn lazy_pool() -> Db {
        use sqlx::postgres::PgPoolOptions;
        // 极短的 acquire_timeout 让 DB 错误路径快速失败，避免测试卡在连接超时
        Db::new(
            PgPoolOptions::new()
                .acquire_timeout(std::time::Duration::from_millis(50))
                .connect_lazy("postgres://127.0.0.1:1/none")
                .expect("lazy pool"),
            "communication, public",
        )
    }

    fn test_txn_cell() -> RlsTxnCell {
        std::sync::Arc::new(tokio::sync::Mutex::new(None))
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
        let res =
            run_auto_archive(State(pool), Extension(test_txn_cell()), Extension(claims)).await;
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
        let res =
            run_auto_archive(State(pool), Extension(test_txn_cell()), Extension(claims)).await;
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
        let res = send_notification(
            State(pool),
            Extension(test_txn_cell()),
            Extension(claims),
            Json(req),
        )
        .await;
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
        let v = response_json(res).await;
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
        let res = broadcast_notification(
            State(pool),
            Extension(test_txn_cell()),
            Extension(claims),
            Json(req),
        )
        .await;
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
        let v = response_json(res).await;
        assert_eq!(v["success"], false);
        assert_eq!(v["code"], 403);
    }

    #[tokio::test]
    async fn test_create_notification_invalid_body() {
        let pool = lazy_pool();
        let claims = sample_claims();
        // 缺少 user_id → 反序列化失败
        let bad = serde_json::json!({"title": "t"});
        let res = create_notification(
            State(pool),
            Extension(test_txn_cell()),
            Extension(claims),
            Json(bad),
        )
        .await;
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
        let v = response_json(res).await;
        assert_eq!(v["success"], false);
    }

    #[tokio::test]
    async fn test_bulk_mark_read_empty_ids_short_circuits() {
        let pool = lazy_pool();
        let mut claims = sample_claims();
        claims.sub = "550e8400-e29b-41d4-a716-446655440000".to_string();
        let res = bulk_mark_read(
            State(pool),
            Extension(test_txn_cell()),
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
            Extension(test_txn_cell()),
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
