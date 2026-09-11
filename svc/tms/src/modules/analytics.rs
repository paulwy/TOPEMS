//! TMS 分析聚合 API
//! 提供运输趋势、车辆排名、状态分布等聚合查询
//! 路径前缀: /tms/analytics

use axum::{
    extract::{Extension, FromRef, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ===== 数据类型 =====

#[derive(Debug, Serialize, Deserialize)]
pub struct ShipmentTrendItem {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VehicleRankingItem {
    pub vehicle_id: String,
    pub vehicle_no: String,
    pub shipment_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusDistributionItem {
    pub status: String,
    pub count: i64,
    pub percentage: f64,
}

// ===== API 处理函数 =====

/// 获取运输趋势（最近7天）
pub async fn get_shipment_trend(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ShipmentTrendItem>>> {
    tracing::info!("获取TMS运输趋势数据");

    let rows: Vec<(Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT 
            dates.date::text as date,
            COALESCE(s.count, 0) as count
         FROM (
             SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as date
         ) dates
         LEFT JOIN (
             SELECT DATE(created_at) as date, COUNT(*) as count
             FROM tms.tms_shipments
             WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY DATE(created_at)
         ) s ON dates.date = s.date
         ORDER BY dates.date"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<ShipmentTrendItem> = rows
        .into_iter()
        .map(|(date, count)| ShipmentTrendItem {
            date: date.unwrap_or_default(),
            count: count.unwrap_or(0),
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取车辆运单排名
pub async fn get_vehicle_ranking(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<VehicleRankingItem>>> {
    tracing::info!("获取TMS车辆运单排名");

    let rows: Vec<(Option<String>, Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT s.vehicle_id::text as vehicle_id, v.vehicle_no, COUNT(*) as shipment_count
         FROM tms.tms_shipments s
         LEFT JOIN tms.tms_vehicles v ON s.vehicle_id = v.id
         WHERE s.vehicle_id IS NOT NULL
         GROUP BY s.vehicle_id, v.vehicle_no
         ORDER BY shipment_count DESC
         LIMIT 10",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<VehicleRankingItem> = rows
        .into_iter()
        .map(
            |(vehicle_id, vehicle_no, shipment_count)| VehicleRankingItem {
                vehicle_id: vehicle_id.unwrap_or_default(),
                vehicle_no: vehicle_no.unwrap_or_else(|| "未知车辆".to_string()),
                shipment_count: shipment_count.unwrap_or(0),
            },
        )
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取运单状态分布
pub async fn get_status_distribution(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<StatusDistributionItem>>> {
    tracing::info!("获取TMS运单状态分布");

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tms.tms_shipments")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let rows: Vec<(Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT status, COUNT(*) as count
         FROM tms.tms_shipments
         GROUP BY status
         ORDER BY count DESC",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<StatusDistributionItem> = rows
        .into_iter()
        .map(|(status, count)| {
            let cnt = count.unwrap_or(0);
            let percentage = if total > 0 {
                (cnt as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            StatusDistributionItem {
                status: status.unwrap_or_else(|| "未知".to_string()),
                count: cnt,
                percentage,
            }
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

// ===== 路由注册 =====

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .route("/analytics/shipment-trend", get(get_shipment_trend))
        .route("/analytics/vehicle-ranking", get(get_vehicle_ranking))
        .route(
            "/analytics/status-distribution",
            get(get_status_distribution),
        )
}
