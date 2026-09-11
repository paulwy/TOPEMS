//! SCM 分析聚合 API
//! 提供采购趋势、状态分布、供应商排名等聚合查询
//! 路径前缀: /scm/analytics

use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::modules::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ===== 数据类型 =====

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseTrendItem {
    pub date: String,
    pub count: i64,
    pub amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseStatusItem {
    pub status: String,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierRankingItem {
    pub supplier_id: String,
    pub supplier_name: String,
    pub order_count: i64,
    pub total_amount: f64,
}

// ===== API 处理函数 =====

/// 获取采购趋势（最近7天）
pub async fn get_purchase_trend(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<PurchaseTrendItem>>> {
    tracing::info!("获取SCM采购趋势数据");

    let rows: Vec<(Option<String>, Option<i64>, Option<f64>)> = sqlx::query_as(
        "SELECT 
            dates.date::text as date,
            COALESCE(po.count, 0) as count,
            COALESCE(po.amount, 0) as amount
         FROM (
             SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as date
         ) dates
         LEFT JOIN (
             SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
             FROM scm.purchase_orders
             WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY DATE(created_at)
         ) po ON dates.date = po.date
         ORDER BY dates.date"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<PurchaseTrendItem> = rows
        .into_iter()
        .map(|(date, count, amount)| PurchaseTrendItem {
            date: date.unwrap_or_default(),
            count: count.unwrap_or(0),
            amount: amount.unwrap_or(0.0),
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取采购状态分布
pub async fn get_purchase_status(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<PurchaseStatusItem>>> {
    tracing::info!("获取SCM采购状态分布");

    let total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM scm.purchase_orders WHERE deleted_at IS NULL")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let rows: Vec<(Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT status, COUNT(*) as count
         FROM scm.purchase_orders
         WHERE deleted_at IS NULL
         GROUP BY status
         ORDER BY count DESC",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<PurchaseStatusItem> = rows
        .into_iter()
        .map(|(status, count)| {
            let cnt = count.unwrap_or(0);
            let percentage = if total > 0 {
                (cnt as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            PurchaseStatusItem {
                status: status.unwrap_or_else(|| "未知".to_string()),
                count: cnt,
                percentage,
            }
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取供应商采购排名
pub async fn get_supplier_ranking(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<SupplierRankingItem>>> {
    tracing::info!("获取SCM供应商采购排名");

    let rows: Vec<(Option<String>, Option<String>, Option<i64>, Option<f64>)> = sqlx::query_as(
        "SELECT po.supplier_id::text as supplier_id, s.name as supplier_name, 
                COUNT(*) as order_count, COALESCE(SUM(po.total_amount), 0) as total_amount
         FROM scm.purchase_orders po
         LEFT JOIN scm.suppliers s ON po.supplier_id = s.id
         WHERE po.deleted_at IS NULL AND po.supplier_id IS NOT NULL
         GROUP BY po.supplier_id, s.name
         ORDER BY total_amount DESC
         LIMIT 10",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<SupplierRankingItem> = rows
        .into_iter()
        .map(
            |(supplier_id, supplier_name, order_count, total_amount)| SupplierRankingItem {
                supplier_id: supplier_id.unwrap_or_default(),
                supplier_name: supplier_name.unwrap_or_else(|| "未知供应商".to_string()),
                order_count: order_count.unwrap_or(0),
                total_amount: total_amount.unwrap_or(0.0),
            },
        )
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

// ===== 路由注册 =====

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/analytics/purchase-trend", get(get_purchase_trend))
        .route("/analytics/purchase-status", get(get_purchase_status))
        .route("/analytics/supplier-ranking", get(get_supplier_ranking))
}
