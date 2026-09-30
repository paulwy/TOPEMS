//! RD 研发模块 API 处理器

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

/// 获取Bug列表（真实数据库查询）
pub async fn list_bugs(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询Bug列表
    let bugs = sqlx::query(
        r#"
        SELECT id, bug_no, bug_title, description, status, severity, created_at
        FROM rd.bugs
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
        FROM rd.bugs
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (bugs, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "bugNo": r.get::<String, _>("bug_no"),
                        "title": r.get::<String, _>("bug_title"),
                        "description": r.get::<Option<String>, _>("description"),
                        "status": r.get::<String, _>("status"),
                        "severity": r.get::<String, _>("severity"),
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
            tracing::error!("Failed to query rd bugs: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取Bug列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取测试用例列表（真实数据库查询）
pub async fn list_test_cases(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询测试用例列表
    let test_cases = sqlx::query(
        r#"
        SELECT id, case_no, case_name, case_type, status, priority, created_at
        FROM rd.test_cases
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
        FROM rd.test_cases
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (test_cases, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "caseNo": r.get::<String, _>("case_no"),
                        "title": r.get::<String, _>("case_name"),
                        "type": r.get::<String, _>("case_type"),
                        "status": r.get::<String, _>("status"),
                        "priority": r.get::<String, _>("priority"),
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
            tracing::error!("Failed to query rd test cases: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取测试用例列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取构建列表（真实数据库查询）
pub async fn list_builds(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询构建列表
    let builds = sqlx::query(
        r#"
        SELECT id, build_no, branch, status, created_at
        FROM rd.builds
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
        FROM rd.builds
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (builds, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "buildNumber": r.get::<String, _>("build_no"),
                        "branch": r.get::<Option<String>, _>("branch"),
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
            tracing::error!("Failed to query rd builds: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取构建列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取部署列表（真实数据库查询）
pub async fn list_deploys(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询部署列表
    let deploys = sqlx::query(
        r#"
        SELECT id, environment, version, status, created_at
        FROM rd.deploys
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
        FROM rd.deploys
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (deploys, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "environment": r.get::<String, _>("environment"),
                        "version": r.get::<Option<String>, _>("version"),
                        "status": r.get::<Option<String>, _>("status"),
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
            tracing::error!("Failed to query rd deploys: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取部署列表失败: {}", e),
                "data": null
            }))
        }
    }
}
