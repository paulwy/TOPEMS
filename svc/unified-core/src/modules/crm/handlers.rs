//! CRM 客户关系管理模块 API 处理器

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

/// 获取客户列表（真实数据库查询）
pub async fn list_customers(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询客户列表
    let customers = sqlx::query(
        r#"
        SELECT id, name, customer_type, industry, rating, region, email, phone
        FROM crm.customers
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
        FROM crm.customers
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match customers {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<Option<String>, _>("name"),
                        "customer_type": r.get::<Option<String>, _>("customer_type"),
                        "industry": r.get::<Option<String>, _>("industry"),
                        "rating": r.get::<Option<String>, _>("rating"),
                        "region": r.get::<Option<String>, _>("region"),
                        "email": r.get::<Option<String>, _>("email"),
                        "phone": r.get::<Option<String>, _>("phone"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": {
                    "customers": data,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                },
                "success": true,
                "message": "获取客户列表成功"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query customers: {}", e);
            Json(serde_json::json!({
                "data": {
                    "customers": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                },
                "success": false,
                "message": "获取客户列表失败"
            }))
        }
    }
}

/// 获取联系人列表（真实数据库查询）
pub async fn list_contacts(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询联系人列表
    let contacts = sqlx::query(
        r#"
        SELECT id, full_name, position, email, phone, mobile, customer_id, status, created_at
        FROM crm.contacts
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
        FROM crm.contacts
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match contacts {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<Option<String>, _>("full_name"),
                        "position": r.get::<Option<String>, _>("position"),
                        "email": r.get::<Option<String>, _>("email"),
                        "phone": r.get::<Option<String>, _>("phone"),
                        "mobile": r.get::<Option<String>, _>("mobile"),
                        "status": r.get::<Option<String>, _>("status"),
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
            tracing::error!("Failed to query contacts: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取联系人列表失败"
            }))
        }
    }
}

/// 获取商机列表（真实数据库查询）
pub async fn list_opportunities(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询商机列表
    let opportunities = sqlx::query(
        r#"
        SELECT id, opp_no, name, customer_name, stage, priority, value, probability, close_date, status, created_at
        FROM crm.opportunities
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
        FROM crm.opportunities
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match opportunities {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "opportunity_no": r.get::<Option<String>, _>("opp_no"),
                        "name": r.get::<String, _>("name"),
                        "customer_name": r.get::<Option<String>, _>("customer_name"),
                        "stage": r.get::<Option<String>, _>("stage"),
                        "priority": r.get::<Option<String>, _>("priority"),
                        "value": r.get::<Option<rust_decimal::Decimal>, _>("value").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "probability": r.get::<Option<i32>, _>("probability"),
                        "close_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("close_date"),
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
            tracing::error!("Failed to query opportunities: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取商机列表失败"
            }))
        }
    }
}

/// 获取合同列表（真实数据库查询）
pub async fn list_contracts(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询合同列表
    let contracts = sqlx::query(
        r#"
        SELECT id, contract_no, title, customer_name, amount, status, sign_date, start_date, end_date, owner, type, created_at
        FROM crm.contracts
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
        FROM crm.contracts
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match contracts {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "contract_no": r.get::<String, _>("contract_no"),
                        "title": r.get::<String, _>("title"),
                        "customer_name": r.get::<Option<String>, _>("customer_name"),
                        "amount": r.get::<Option<rust_decimal::Decimal>, _>("amount").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "status": r.get::<String, _>("status"),
                        "sign_date": r.get::<Option<chrono::NaiveDate>, _>("sign_date"),
                        "start_date": r.get::<Option<chrono::NaiveDate>, _>("start_date"),
                        "end_date": r.get::<Option<chrono::NaiveDate>, _>("end_date"),
                        "owner": r.get::<Option<String>, _>("owner"),
                        "type": r.get::<Option<String>, _>("type"),
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
            tracing::error!("Failed to query contracts: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取合同列表失败"
            }))
        }
    }
}
