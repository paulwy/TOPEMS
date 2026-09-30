//! Integration 集成模块 API 处理器

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

/// 获取异步任务列表（真实数据库查询）
pub async fn list_async_tasks(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询异步任务列表
    let async_tasks = sqlx::query(
        r#"
        SELECT id, task_type, source_service, target_service, status, created_at
        FROM integration.async_tasks
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
        FROM integration.async_tasks
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (async_tasks, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "taskType": r.get::<String, _>("task_type"),
                        "sourceService": r.get::<Option<String>, _>("source_service"),
                        "targetService": r.get::<Option<String>, _>("target_service"),
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
            tracing::error!("Failed to query integration async tasks: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取异步任务列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取集成事件列表（真实数据库查询）
pub async fn list_integration_events(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询集成事件列表
    let integration_events = sqlx::query(
        r#"
        SELECT id, source_system, target_system, event_type, status, created_at
        FROM integration.integration_events
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
        FROM integration.integration_events
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (integration_events, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "sourceSystem": r.get::<String, _>("source_system"),
                        "targetSystem": r.get::<String, _>("target_system"),
                        "eventType": r.get::<String, _>("event_type"),
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
            tracing::error!("Failed to query integration events: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取集成事件列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取ERP连接列表（真实数据库查询）
pub async fn list_erp_connections(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询ERP连接列表
    let erp_connections = sqlx::query(
        r#"
        SELECT id, last_sync_at, last_sync_status, consecutive_failures
        FROM integration.erp_connections
        ORDER BY last_sync_at DESC
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
        FROM integration.erp_connections
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (erp_connections, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "lastSyncAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_sync_at").map(|dt| dt.to_rfc3339()),
                        "lastSyncStatus": r.get::<Option<String>, _>("last_sync_status"),
                        "consecutiveFailures": r.get::<i32, _>("consecutive_failures"),
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
            tracing::error!("Failed to query integration erp connections: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取ERP连接列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取ERP映射列表（真实数据库查询）
pub async fn list_erp_mappings(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询ERP映射列表
    let erp_mappings = sqlx::query(
        r#"
        SELECT id
        FROM integration.erp_mappings
        ORDER BY id
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
        FROM integration.erp_mappings
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (erp_mappings, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
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
            tracing::error!("Failed to query integration erp mappings: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取ERP映射列表失败: {}", e),
                "data": null
            }))
        }
    }
}
