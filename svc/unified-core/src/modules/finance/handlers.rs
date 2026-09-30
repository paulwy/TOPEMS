//! Finance 财务模块 API 处理器

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;

use super::models::*;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
}

/// 获取应收列表（真实数据库查询）
pub async fn list_receivables(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询应收列表
    let receivables = sqlx::query(
        r#"
        SELECT id, invoice_number, amount
        FROM finance.receivables
        WHERE deleted_at IS NULL
        ORDER BY id DESC
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
        FROM finance.receivables
        WHERE deleted_at IS NULL
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match receivables {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "invoice_number": r.get::<Option<String>, _>("invoice_number"),
                        "amount": r.get::<Option<rust_decimal::Decimal>, _>("amount").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
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
            tracing::error!("Failed to query receivables: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取应收列表失败"
            }))
        }
    }
}

/// 获取应付列表（真实数据库查询）
pub async fn list_payables(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询应付列表
    let payables = sqlx::query(
        r#"
        SELECT id, invoice_number, amount
        FROM finance.payables
        WHERE deleted_at IS NULL
        ORDER BY id DESC
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
        FROM finance.payables
        WHERE deleted_at IS NULL
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match payables {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "invoice_number": r.get::<Option<String>, _>("invoice_number"),
                        "amount": r.get::<Option<rust_decimal::Decimal>, _>("amount").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
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
            tracing::error!("Failed to query payables: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取应付列表失败"
            }))
        }
    }
}

/// 获取凭证列表（真实数据库查询）
pub async fn list_vouchers(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询凭证列表
    let vouchers = sqlx::query(
        r#"
        SELECT id, voucher_no, voucher_date, period, voucher_type::text as voucher_type, total_debit, total_credit, status::text as status, description, created_at
        FROM finance.core_finance_vouchers
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
        FROM finance.core_finance_vouchers
        WHERE deleted_at IS NULL
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match vouchers {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "voucher_no": r.get::<String, _>("voucher_no"),
                        "voucher_date": r.get::<chrono::DateTime<chrono::Utc>, _>("voucher_date"),
                        "period": r.get::<String, _>("period"),
                        "voucher_type": r.get::<String, _>("voucher_type"),
                        "total_debit": r.get::<rust_decimal::Decimal, _>("total_debit").to_string().parse::<f64>().unwrap_or(0.0),
                        "total_credit": r.get::<rust_decimal::Decimal, _>("total_credit").to_string().parse::<f64>().unwrap_or(0.0),
                        "status": r.get::<String, _>("status"),
                        "description": r.get::<Option<String>, _>("description"),
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
            tracing::error!("Failed to query vouchers: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取凭证列表失败"
            }))
        }
    }
}

/// 获取预算列表（真实数据库查询）
pub async fn list_budgets(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询预算列表
    let budgets = sqlx::query(
        r#"
        SELECT id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at
        FROM finance.budgets
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
        FROM finance.budgets
        WHERE deleted_at IS NULL
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match budgets {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "budget_type": r.get::<String, _>("budget_type"),
                        "fiscal_year": r.get::<i32, _>("fiscal_year"),
                        "total_budget": r.get::<rust_decimal::Decimal, _>("total_budget").to_string().parse::<f64>().unwrap_or(0.0),
                        "used_amount": r.get::<rust_decimal::Decimal, _>("used_amount").to_string().parse::<f64>().unwrap_or(0.0),
                        "remaining_amount": r.get::<rust_decimal::Decimal, _>("remaining_amount").to_string().parse::<f64>().unwrap_or(0.0),
                        "usage_rate": r.get::<rust_decimal::Decimal, _>("usage_rate").to_string().parse::<f64>().unwrap_or(0.0),
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
            tracing::error!("Failed to query budgets: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取预算列表失败"
            }))
        }
    }
}
