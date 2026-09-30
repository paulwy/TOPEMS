//! Portal 门户模块 API 处理器

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

/// 获取公告列表（真实数据库查询）
pub async fn list_announcements(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询公告列表
    let announcements = sqlx::query(
        r#"
        SELECT id
        FROM portal.portal_announcements
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
        FROM portal.portal_announcements
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (announcements, total_row) {
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
            tracing::error!("Failed to query portal announcements: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取公告列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取常见问题列表（真实数据库查询）
pub async fn list_faqs(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询常见问题列表
    let faqs = sqlx::query(
        r#"
        SELECT id, question, answer, category, created_at
        FROM portal.core_faqs
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
        FROM portal.core_faqs
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (faqs, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "question": r.get::<String, _>("question"),
                        "answer": r.get::<Option<String>, _>("answer"),
                        "category": r.get::<Option<String>, _>("category"),
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
            tracing::error!("Failed to query portal faqs: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取常见问题列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取待办事项列表（真实数据库查询）
pub async fn list_todos(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询待办事项列表
    let todos = sqlx::query(
        r#"
        SELECT id
        FROM portal.portal_todos
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
        FROM portal.portal_todos
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (todos, total_row) {
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
            tracing::error!("Failed to query portal todos: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取待办事项列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取指南列表（真实数据库查询）
pub async fn list_guides(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询指南列表
    let guides = sqlx::query(
        r#"
        SELECT id, title, description, category, created_at
        FROM portal.core_guides
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
        FROM portal.core_guides
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (guides, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
                        "category": r.get::<Option<String>, _>("category"),
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
            tracing::error!("Failed to query portal guides: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取指南列表失败: {}", e),
                "data": null
            }))
        }
    }
}
