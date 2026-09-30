//! SRM 供应商关系管理模块 API 处理器

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

/// 获取招标列表（真实数据库查询）
pub async fn list_tenders(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询招标列表
    let tenders = sqlx::query(
        r#"
        SELECT id, title, description, status, created_at
        FROM srm.tenders
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
        FROM srm.tenders
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (tenders, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
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
            tracing::error!("Failed to query srm tenders: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取招标列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取投标列表（真实数据库查询）
pub async fn list_bids(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询投标列表
    let bids = sqlx::query(
        r#"
        SELECT id, request_id, supplier_id, price, status, created_at
        FROM srm.bids
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
        FROM srm.bids
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (bids, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "requestId": r.get::<uuid::Uuid, _>("request_id").to_string(),
                        "supplierId": r.get::<Option<uuid::Uuid>, _>("supplier_id").map(|d| d.to_string()),
                        "price": r.get::<Option<rust_decimal::Decimal>, _>("price").map(|p| p.to_string()),
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
            tracing::error!("Failed to query srm bids: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取投标列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取报价列表（真实数据库查询）
pub async fn list_quotations(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询报价列表
    let quotations = sqlx::query(
        r#"
        SELECT id, inquiry_id, supplier_id, total_amount, status, created_at
        FROM srm.quotations
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
        FROM srm.quotations
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (quotations, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "inquiryId": r.get::<Option<uuid::Uuid>, _>("inquiry_id").map(|d| d.to_string()),
                        "supplierId": r.get::<Option<uuid::Uuid>, _>("supplier_id").map(|d| d.to_string()),
                        "price": r.get::<Option<f64>, _>("total_amount"),
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
            tracing::error!("Failed to query srm quotations: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取报价列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取供应商合同列表（真实数据库查询）
pub async fn list_supplier_contracts(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询供应商合同列表
    let contracts = sqlx::query(
        r#"
        SELECT id, supplier_id, title, status, created_at
        FROM srm.supplier_contracts
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
        FROM srm.supplier_contracts
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (contracts, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "supplierId": r.get::<uuid::Uuid, _>("supplier_id").to_string(),
                        "title": r.get::<String, _>("title"),
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
            tracing::error!("Failed to query srm supplier contracts: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取供应商合同列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取供应商评估列表（真实数据库查询）
pub async fn list_supplier_evaluations(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询供应商评估列表
    let evaluations = sqlx::query(
        r#"
        SELECT id, supplier_id, overall_score, status, created_at
        FROM srm.supplier_evaluations
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
        FROM srm.supplier_evaluations
        "#
    )
    .fetch_one(&state.pool)
    .await;

    match (evaluations, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "supplierId": r.get::<uuid::Uuid, _>("supplier_id").to_string(),
                        "score": r.get::<Option<rust_decimal::Decimal>, _>("overall_score").map(|s| s.to_string()),
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
            tracing::error!("Failed to query srm supplier evaluations: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取供应商评估列表失败: {}", e),
                "data": null
            }))
        }
    }
}
