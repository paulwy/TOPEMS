//! QMS 质量管理模块 API 处理器

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

/// 获取检验项目列表（真实数据库查询）
pub async fn list_inspection_items(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询检验项目列表
    let items = sqlx::query(
        r#"
        SELECT id
        FROM qms.inspection_items
        WHERE deleted_at IS NULL
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
        FROM qms.inspection_items
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match items {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": {
                    "items": data,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                },
                "success": true,
                "message": "获取检验项目列表成功"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query inspection items: {}", e);
            Json(serde_json::json!({
                "data": {
                    "items": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                },
                "success": false,
                "message": "获取检验项目列表失败"
            }))
        }
    }
}

/// 获取质检单列表（真实数据库查询）
pub async fn list_quality_inspections(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询质检单列表
    let inspections = sqlx::query(
        r#"
        SELECT id, inspection_no, inspection_type, product_name, quantity, qualified_quantity, 
               unqualified_quantity, qualification_rate, status, inspector, inspected_at, result, created_at
        FROM qms.qa_quality_inspections
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
        FROM qms.qa_quality_inspections
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match inspections {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "inspection_no": r.get::<String, _>("inspection_no"),
                        "inspection_type": r.get::<String, _>("inspection_type"),
                        "product_name": r.get::<Option<String>, _>("product_name"),
                        "quantity": r.get::<rust_decimal::Decimal, _>("quantity").to_string().parse::<f64>().unwrap_or(0.0),
                        "qualified_quantity": r.get::<Option<rust_decimal::Decimal>, _>("qualified_quantity").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "unqualified_quantity": r.get::<Option<rust_decimal::Decimal>, _>("unqualified_quantity").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "qualification_rate": r.get::<Option<rust_decimal::Decimal>, _>("qualification_rate").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "status": r.get::<String, _>("status"),
                        "inspector": r.get::<Option<String>, _>("inspector"),
                        "inspected_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("inspected_at"),
                        "result": r.get::<Option<String>, _>("result"),
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
            tracing::error!("Failed to query quality inspections: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取质检单列表失败"
            }))
        }
    }
}

/// 获取质量问题列表（真实数据库查询）
pub async fn list_quality_issues(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询质量问题列表
    let issues = sqlx::query(
        r#"
        SELECT id, issue_no, title, description, severity, status, source, created_by, created_at, resolved_at
        FROM qms.qa_quality_issues
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
        FROM qms.qa_quality_issues
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match issues {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "issue_no": r.get::<String, _>("issue_no"),
                        "title": r.get::<String, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
                        "severity": r.get::<Option<String>, _>("severity"),
                        "status": r.get::<String, _>("status"),
                        "source": r.get::<Option<String>, _>("source"),
                        "created_by": r.get::<Option<String>, _>("created_by"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "resolved_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("resolved_at"),
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
            tracing::error!("Failed to query quality issues: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取质量问题列表失败"
            }))
        }
    }
}
