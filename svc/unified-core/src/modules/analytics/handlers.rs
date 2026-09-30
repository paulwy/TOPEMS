//! Analytics 数据分析模块 API 处理器

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

/// 获取仪表板列表（真实数据库查询）
pub async fn list_dashboards(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询仪表板列表
    let dashboards = sqlx::query(
        r#"
        SELECT id, name, description, is_public, created_at
        FROM analytics.analytics_dashboards
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
        FROM analytics.analytics_dashboards
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (dashboards, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "description": r.get::<Option<String>, _>("description"),
                        "isPublic": r.get::<Option<bool>, _>("is_public"),
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
            tracing::error!("Failed to query analytics dashboards: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取仪表板列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取数据集列表（真实数据库查询）
pub async fn list_datasets(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询数据集列表
    let datasets = sqlx::query(
        r#"
        SELECT id, name, description, datasource_id, status, created_at
        FROM analytics.analytics_datasets
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
        FROM analytics.analytics_datasets
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (datasets, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "description": r.get::<Option<String>, _>("description"),
                        "datasourceId": r.get::<Option<uuid::Uuid>, _>("datasource_id").map(|d| d.to_string()),
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
            tracing::error!("Failed to query analytics datasets: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取数据集列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取数据源列表（真实数据库查询）
pub async fn list_datasources(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询数据源列表
    let datasources = sqlx::query(
        r#"
        SELECT id, name, description, source_type, host, port, status, created_at
        FROM analytics.analytics_datasources
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
        FROM analytics.analytics_datasources
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (datasources, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "description": r.get::<Option<String>, _>("description"),
                        "type": r.get::<Option<String>, _>("source_type"),
                        "host": r.get::<Option<String>, _>("host"),
                        "port": r.get::<Option<i32>, _>("port"),
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
            tracing::error!("Failed to query analytics datasources: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取数据源列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取组件列表（真实数据库查询）
pub async fn list_widgets(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询组件列表
    let widgets = sqlx::query(
        r#"
        SELECT id, name, widget_type, dashboard_id, created_at
        FROM analytics.analytics_widgets
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
        FROM analytics.analytics_widgets
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (widgets, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "widgetType": r.get::<Option<String>, _>("widget_type"),
                        "dashboardId": r.get::<Option<uuid::Uuid>, _>("dashboard_id").map(|d| d.to_string()),
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
            tracing::error!("Failed to query analytics widgets: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取组件列表失败: {}", e),
                "data": null
            }))
        }
    }
}
