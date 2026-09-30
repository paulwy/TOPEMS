//! Communication 通讯模块 API 处理器

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
}

/// 获取通知列表（真实数据库查询）
pub async fn list_notifications(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询通知列表
    let notifications = sqlx::query(
        r#"
        SELECT id, title, content, is_read, is_archived, created_at
        FROM communication.core_notifications
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM communication.core_notifications
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (notifications, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "content": r.get::<Option<String>, _>("content"),
                        "isRead": r.get::<bool, _>("is_read"),
                        "isArchived": r.get::<bool, _>("is_archived"),
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query communication notifications: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取通知列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取通知模板列表（真实数据库查询）
pub async fn list_notification_templates(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询通知模板列表
    let notification_templates = sqlx::query(
        r#"
        SELECT id, name, title_template, content_template, notification_type, created_at
        FROM communication.core_notification_templates
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM communication.core_notification_templates
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (notification_templates, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "title": r.get::<String, _>("title_template"),
                        "content": r.get::<String, _>("content_template"),
                        "type": r.get::<Option<String>, _>("notification_type"),
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!(
                "Failed to query communication notification templates: {}",
                e
            );
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取通知模板列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取邮件列表（真实数据库查询）
pub async fn list_emails(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询邮件列表
    let emails = sqlx::query(
        r#"
        SELECT id, subject, from_email, to_email, is_read, created_at
        FROM communication.core_emails
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM communication.core_emails
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (emails, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "subject": r.get::<Option<String>, _>("subject"),
                        "from": r.get::<String, _>("from_email"),
                        "to": r.get::<String, _>("to_email"),
                        "isRead": r.get::<bool, _>("is_read"),
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query communication emails: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取邮件列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取邮件模板列表（真实数据库查询）
pub async fn list_email_templates(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询邮件模板列表
    let email_templates = sqlx::query(
        r#"
        SELECT id, name, subject_template, body_template, created_at
        FROM communication.core_email_templates
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM communication.core_email_templates
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (email_templates, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "subject": r.get::<String, _>("subject_template"),
                        "content": r.get::<String, _>("body_template"),
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query communication email templates: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取邮件模板列表失败: {}", e),
                "data": null
            }))
        }
    }
}
