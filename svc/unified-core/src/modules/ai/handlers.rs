//! AI 人工智能模块 API 处理器

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

/// 获取AI模型列表（真实数据库查询）
pub async fn list_ai_models(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询AI模型列表
    let ai_models = sqlx::query(
        r#"
        SELECT id, name, type, status, created_at
        FROM ai.ai_models
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
        FROM ai.ai_models
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (ai_models, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "type": r.get::<String, _>("type"),
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
            tracing::error!("Failed to query ai models: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取AI模型列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取AI提示词模板列表（真实数据库查询）
pub async fn list_ai_prompt_templates(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询AI提示词模板列表
    let ai_prompt_templates = sqlx::query(
        r#"
        SELECT id, name, prompt_template, category, created_at
        FROM ai.ai_prompt_templates
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
        FROM ai.ai_prompt_templates
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (ai_prompt_templates, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "promptTemplate": r.get::<String, _>("prompt_template"),
                        "category": r.get::<String, _>("category"),
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
            tracing::error!("Failed to query ai prompt templates: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取AI提示词模板列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取AI文档列表（真实数据库查询）
pub async fn list_ai_documents(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询AI文档列表
    let ai_documents = sqlx::query(
        r#"
        SELECT id, title, description, status, created_at
        FROM ai.documents
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
        FROM ai.documents
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (ai_documents, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
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
            tracing::error!("Failed to query ai documents: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取AI文档列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取AI问答历史列表（真实数据库查询）
pub async fn list_ai_qa_history(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询AI问答历史列表
    let ai_qa_history = sqlx::query(
        r#"
        SELECT id, question, answer, created_at
        FROM ai.qa_history
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
        FROM ai.qa_history
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (ai_qa_history, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "question": r.get::<String, _>("question"),
                        "answer": r.get::<Option<String>, _>("answer"),
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
            tracing::error!("Failed to query ai qa history: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取AI问答历史列表失败: {}", e),
                "data": null
            }))
        }
    }
}
