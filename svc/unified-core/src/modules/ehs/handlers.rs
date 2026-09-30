//! EHS 环境健康安全模块 API 处理器

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

/// 获取事故列表（真实数据库查询）
pub async fn list_accidents(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询事故列表
    let accidents = sqlx::query(
        r#"
        SELECT id, accident_no, title, description, accident_type, severity, status
        FROM ehs.qa_ehs_accidents
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
        FROM ehs.qa_ehs_accidents
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match accidents {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "accident_no": r.get::<Option<String>, _>("accident_no"),
                        "title": r.get::<Option<String>, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
                        "accident_type": r.get::<Option<String>, _>("accident_type"),
                        "severity": r.get::<Option<String>, _>("severity"),
                        "status": r.get::<Option<String>, _>("status"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": {
                    "accidents": data,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                },
                "success": true,
                "message": "获取事故列表成功"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query accidents: {}", e);
            Json(serde_json::json!({
                "data": {
                    "accidents": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                },
                "success": false,
                "message": "获取事故列表失败"
            }))
        }
    }
}

/// 获取隐患列表（真实数据库查询）
pub async fn list_hazards(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询隐患列表
    let hazards = sqlx::query(
        r#"
        SELECT id, hazard_no, title, description, category, level, location, reported_by, reported_at, status, created_at
        FROM ehs.qa_ehs_hazards
        WHERE deleted_at IS NULL
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
        FROM ehs.qa_ehs_hazards
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match hazards {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "hazard_no": r.get::<Option<String>, _>("hazard_no"),
                        "title": r.get::<String, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
                        "category": r.get::<Option<String>, _>("category"),
                        "level": r.get::<Option<String>, _>("level"),
                        "location": r.get::<Option<String>, _>("location"),
                        "reported_by": r.get::<Option<String>, _>("reported_by"),
                        "reported_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("reported_at"),
                        "status": r.get::<String, _>("status"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query hazards: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取隐患列表失败"
            }))
        }
    }
}

/// 获取培训列表（真实数据库查询）
pub async fn list_trainings(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询培训列表
    let trainings = sqlx::query(
        r#"
        SELECT id, training_no, title, content, trainer, training_type, duration_hours, scheduled_at, status, created_at
        FROM ehs.qa_ehs_trainings
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
        FROM ehs.qa_ehs_trainings
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match trainings {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "training_no": r.get::<String, _>("training_no"),
                        "title": r.get::<String, _>("title"),
                        "content": r.get::<Option<String>, _>("content"),
                        "trainer": r.get::<Option<String>, _>("trainer"),
                        "training_type": r.get::<Option<String>, _>("training_type"),
                        "duration_hours": r.get::<Option<i32>, _>("duration_hours"),
                        "scheduled_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("scheduled_at"),
                        "status": r.get::<String, _>("status"),
                        "created_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query trainings: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取培训列表失败"
            }))
        }
    }
}
