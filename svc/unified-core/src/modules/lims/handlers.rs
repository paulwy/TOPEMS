//! LIMS 实验室信息管理系统模块 API 处理器

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

/// 获取样本列表（真实数据库查询）
pub async fn list_samples(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询样本列表
    let samples = sqlx::query(
        r#"
        SELECT id, code, name, status, created_at
        FROM lims.samples
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
        FROM lims.samples
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (samples, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "sampleNo": r.get::<Option<String>, _>("code"),
                        "name": r.get::<Option<String>, _>("name"),
                        "status": r.get::<Option<String>, _>("status"),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
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
            tracing::error!("Failed to query lims samples: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取样本列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取仪器列表（真实数据库查询）
pub async fn list_instruments(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询仪器列表
    let instruments = sqlx::query(
        r#"
        SELECT id, name, model, status, created_at
        FROM lims.instruments
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
        FROM lims.instruments
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (instruments, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "model": r.get::<Option<String>, _>("model"),
                        "status": r.get::<Option<String>, _>("status"),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
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
            tracing::error!("Failed to query lims instruments: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取仪器列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取检验任务列表（真实数据库查询）
pub async fn list_inspection_tasks(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询检验任务列表
    let tasks = sqlx::query(
        r#"
        SELECT id, sample_no, status, inspector, sample_id, created_at
        FROM lims.inspection_tasks
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
        FROM lims.inspection_tasks
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (tasks, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<Option<String>, _>("sample_no"),
                        "inspector": r.get::<Option<String>, _>("inspector"),
                        "status": r.get::<Option<String>, _>("status"),
                        "sampleId": r.get::<Option<uuid::Uuid>, _>("sample_id").map(|d| d.to_string()),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
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
            tracing::error!("Failed to query lims inspection tasks: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取检验任务列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取检验记录列表（真实数据库查询）
pub async fn list_inspection_records(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询检验记录列表
    let records = sqlx::query(
        r#"
        SELECT id, step_name, result, conclusion, task_id, created_at
        FROM lims.inspection_records
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
        FROM lims.inspection_records
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (records, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<Option<String>, _>("step_name"),
                        "result": r.get::<Option<String>, _>("result"),
                        "conclusion": r.get::<Option<String>, _>("conclusion"),
                        "taskId": r.get::<Option<uuid::Uuid>, _>("task_id").map(|d| d.to_string()),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
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
            tracing::error!("Failed to query lims inspection records: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取检验记录列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取试剂列表（真实数据库查询）
pub async fn list_reagents(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询试剂列表
    let reagents = sqlx::query(
        r#"
        SELECT id, name, model, status, created_at
        FROM lims.reagents
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
        FROM lims.reagents
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (reagents, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "model": r.get::<Option<String>, _>("model"),
                        "status": r.get::<Option<String>, _>("status"),
                        "createdAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|d| d.to_rfc3339()),
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
            tracing::error!("Failed to query lims reagents: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取试剂列表失败: {}", e),
                "data": null
            }))
        }
    }
}
