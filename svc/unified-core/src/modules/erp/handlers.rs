//! ERP 企业资源计划模块 API 处理器

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
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
}

/// 获取采购订单列表（真实数据库查询）
pub async fn list_purchase_orders(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询采购订单列表
    let orders = sqlx::query(
        r#"
        SELECT id, order_no, supplier_name, order_date, delivery_date, status, total_amount, payable_amount
        FROM erp.purchase_orders
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
        FROM erp.purchase_orders
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match orders {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "order_no": r.get::<Option<String>, _>("order_no"),
                        "supplier_name": r.get::<Option<String>, _>("supplier_name"),
                        "order_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("order_date"),
                        "delivery_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("delivery_date"),
                        "status": r.get::<Option<String>, _>("status"),
                        "total_amount": r.get::<f64, _>("total_amount"),
                        "payable_amount": r.get::<f64, _>("payable_amount"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": {
                    "orders": data,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                },
                "success": true,
                "message": "获取采购订单列表成功"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query purchase orders: {}", e);
            Json(serde_json::json!({
                "data": {
                    "orders": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                },
                "success": false,
                "message": "获取采购订单列表失败"
            }))
        }
    }
}

/// 获取销售订单列表（真实数据库查询）
pub async fn list_sales_orders(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询销售订单列表
    let orders = sqlx::query(
        r#"
        SELECT id, order_no, customer_name, order_date, delivery_date, status, total_amount, payable_amount
        FROM erp.sales_orders
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
        FROM erp.sales_orders
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match orders {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "order_no": r.get::<String, _>("order_no"),
                        "customer_name": r.get::<Option<String>, _>("customer_name"),
                        "order_date": r.get::<chrono::DateTime<chrono::Utc>, _>("order_date"),
                        "delivery_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("delivery_date"),
                        "status": r.get::<String, _>("status"),
                        "total_amount": r.get::<Option<rust_decimal::Decimal>, _>("total_amount").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "payable_amount": r.get::<Option<rust_decimal::Decimal>, _>("payable_amount").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
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
            tracing::error!("Failed to query sales orders: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取销售订单列表失败"
            }))
        }
    }
}
