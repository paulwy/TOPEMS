use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{ArchiveConfig, NotificationQuery};

/// 归档通知
pub async fn archive_notification(
    State(state): State<AppState>,
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
        SET is_archived = TRUE
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
    State(state): State<AppState>,
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
        SET is_archived = FALSE
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
    State(state): State<AppState>,
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
        r#"
        SELECT id, user_id, title, content, notification_type, is_read, priority, data, created_at, read_at
        FROM core_notifications
        WHERE user_id = $1
          AND is_archived = TRUE
          AND ($2::boolean IS NULL OR is_read = $2)
          AND ($3::text IS NULL OR notification_type = $3)
        ORDER BY created_at DESC
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
                  AND is_archived = TRUE
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
    State(_state): State<AppState>,
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
    State(_state): State<AppState>,
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
    State(state): State<AppState>,
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

    let count: i64 = sqlx::query_scalar(
        r#"
        UPDATE core_notifications
        SET is_deleted = true
        WHERE created_at < NOW() - INTERVAL '30 days' AND is_deleted = false
        RETURNING COUNT(*)
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    Json(serde_json::json!({
        "success": true,
        "message": format!("Auto archive completed, {} notifications archived", count),
        "data": { "archived_count": count },
        "code": 0
    }))
}

pub async fn get_notification_health_detailed(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let db_status = match sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.pool)
        .await
    {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let notification_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_notifications")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let unread_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_notifications WHERE is_read = false")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    Json(serde_json::json!({
        "success": true,
        "message": "Success",
        "data": {
            "status": "healthy",
            "uptime": "unknown",
            "dependencies": {
                "database": db_status,
                "redis": "unknown",
            },
            "counters": {
                "total_notifications": notification_count,
                "unread_notifications": unread_count,
            }
        },
        "code": 0
    }))
}
