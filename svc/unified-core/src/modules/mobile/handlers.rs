//! Mobile 移动端模块 API 处理器

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

/// 获取移动设备列表（真实数据库查询）
pub async fn list_devices(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询移动设备列表
    let devices = sqlx::query(
        r#"
        SELECT id, device_name, device_type, is_active, created_at
        FROM mobile.devices
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM mobile.devices
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (devices, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "deviceName": r.get::<String, _>("device_name"),
                        "deviceType": r.get::<String, _>("device_type"),
                        "isActive": r.get::<bool, _>("is_active"),
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
            tracing::error!("Failed to query mobile devices: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取移动设备列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取移动任务列表（真实数据库查询）
pub async fn list_mobile_tasks(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询移动任务列表
    let mobile_tasks = sqlx::query(
        r#"
        SELECT id, title, task_type, status, created_at
        FROM mobile.mobile_tasks
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM mobile.mobile_tasks
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (mobile_tasks, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "taskType": r.get::<String, _>("task_type"),
                        "status": r.get::<String, _>("status"),
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
            tracing::error!("Failed to query mobile tasks: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取移动任务列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取OA公告列表（真实数据库查询）
pub async fn list_oa_announcements(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询OA公告列表
    let oa_announcements = sqlx::query(
        r#"
        SELECT id, title, content, priority, published_at
        FROM mobile.oa_announcements
        ORDER BY published_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM mobile.oa_announcements
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (oa_announcements, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "content": r.get::<String, _>("content"),
                        "priority": r.get::<String, _>("priority"),
                        "publishedAt": r.get::<chrono::DateTime<chrono::Utc>, _>("published_at").to_rfc3339(),
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
            tracing::error!("Failed to query mobile oa announcements: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取OA公告列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取推送通知列表（真实数据库查询）
pub async fn list_push_notifications(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询推送通知列表
    let push_notifications = sqlx::query(
        r#"
        SELECT id, title, body, status, created_at
        FROM mobile.push_notifications
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM mobile.push_notifications
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (push_notifications, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "content": r.get::<String, _>("body"),
                        "status": r.get::<String, _>("status"),
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
            tracing::error!("Failed to query mobile push notifications: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取推送通知列表失败: {}", e),
                "data": null
            }))
        }
    }
}
