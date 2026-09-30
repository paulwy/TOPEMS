//! PM 项目管理模块 API 处理器

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

/// 获取项目列表（真实数据库查询）
pub async fn list_projects(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询项目列表
    let projects = sqlx::query(
        r#"
        SELECT id, name, code, description, status, start_date, end_date, created_at
        FROM pm.projects
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
        FROM pm.projects
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (projects, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "code": r.get::<Option<String>, _>("code"),
                        "description": r.get::<Option<String>, _>("description"),
                        "status": r.get::<Option<String>, _>("status"),
                        "startDate": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("start_date").map(|d| d.to_rfc3339()),
                        "endDate": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("end_date").map(|d| d.to_rfc3339()),
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
            tracing::error!("Failed to query pm projects: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取项目列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取任务列表（真实数据库查询）
pub async fn list_tasks(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询任务列表
    let tasks = sqlx::query(
        r#"
        SELECT id, title, description, status, priority, project_id, created_at
        FROM pm.pm_tasks
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
        FROM pm.pm_tasks
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
                        "name": r.get::<String, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
                        "status": r.get::<Option<String>, _>("status"),
                        "priority": r.get::<Option<String>, _>("priority"),
                        "projectId": r.get::<uuid::Uuid, _>("project_id").to_string(),
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
            tracing::error!("Failed to query pm tasks: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取任务列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取项目成员列表（真实数据库查询）
pub async fn list_project_members(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询项目成员列表
    let members = sqlx::query(
        r#"
        SELECT id, project_id, user_id, role, created_at
        FROM pm.project_members
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
        FROM pm.project_members
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (members, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "projectId": r.get::<uuid::Uuid, _>("project_id").to_string(),
                        "userId": r.get::<String, _>("user_id"),
                        "role": r.get::<Option<String>, _>("role"),
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
            tracing::error!("Failed to query pm project members: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取项目成员列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取项目资源列表（真实数据库查询）
pub async fn list_project_resources(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询项目资源列表
    let resources = sqlx::query(
        r#"
        SELECT id, project_id, resource_name, resource_type, quantity, created_at
        FROM pm.project_resources
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
        FROM pm.project_resources
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (resources, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "projectId": r.get::<uuid::Uuid, _>("project_id").to_string(),
                        "name": r.get::<String, _>("resource_name"),
                        "type": r.get::<Option<String>, _>("resource_type"),
                        "quantity": r.get::<Option<rust_decimal::Decimal>, _>("quantity").map(|q| q.to_string()),
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
            tracing::error!("Failed to query pm project resources: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取项目资源列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取项目风险列表（真实数据库查询）
pub async fn list_project_risks(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询项目风险列表
    let risks = sqlx::query(
        r#"
        SELECT id, project_id, risk_name, risk_description, risk_level, status, created_at
        FROM pm.project_risks
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
        FROM pm.project_risks
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (risks, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "projectId": r.get::<Option<uuid::Uuid>, _>("project_id").map(|d| d.to_string()),
                        "name": r.get::<String, _>("risk_name"),
                        "description": r.get::<Option<String>, _>("risk_description"),
                        "level": r.get::<Option<String>, _>("risk_level"),
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
            tracing::error!("Failed to query pm project risks: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取项目风险列表失败: {}", e),
                "data": null
            }))
        }
    }
}
