//! TMS 分析聚合 API
//! 提供运输趋势、车辆排名、状态分布等聚合查询
//! 路径前缀: /tms/analytics

use axum::{
    extract::{Extension, FromRef, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
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

#[derive(Debug, Serialize, Deserialize)]
pub struct CarrierPerformanceItem {
    pub carrier_id: String,
    pub carrier_name: String,
    pub total_shipments: i64,
    pub completed_shipments: i64,
    pub total_freight: f64,
    pub avg_freight: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteEfficiencyItem {
    pub route_id: String,
    pub route_name: String,
    pub distance_km: f64,
    pub estimated_hours: f64,
    pub total_trips: i64,
    pub total_freight: f64,
    pub cost_per_km: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DriverPerformanceItem {
    pub driver_id: String,
    pub driver_name: String,
    pub total_deliveries: i64,
    pub completed_deliveries: i64,
    pub total_freight: f64,
    pub avg_freight: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShipmentTrendEnhancedItem {
    pub month: String,
    pub total: i64,
    pub delivered: i64,
    pub cancelled: i64,
    pub in_transit: i64,
    pub pending: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VehicleUtilizationItem {
    pub vehicle_id: String,
    pub vehicle_no: String,
    pub shipment_count: i64,
    pub utilization_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FreightCostTrendItem {
    pub month: String,
    pub total_freight: f64,
    pub shipment_count: i64,
    pub avg_freight: f64,
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

/// 获取承运商绩效
pub async fn get_carrier_performance(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<CarrierPerformanceItem>>> {
    tracing::info!("获取TMS承运商绩效数据");

    let rows: Vec<(
        Option<String>,
        Option<String>,
        Option<i64>,
        Option<i64>,
        Option<f64>,
    )> = sqlx::query_as(
        "SELECT 
            c.id::text as carrier_id,
            c.name as carrier_name,
            COUNT(s.id) as total_shipments,
            COUNT(CASE WHEN s.status = 'delivered' THEN 1 END) as completed_shipments,
            COALESCE(SUM(s.freight_amount), 0)::float8 as total_freight
         FROM tms.tms_carriers c
         LEFT JOIN tms.tms_shipments s ON s.carrier_id = c.id
         GROUP BY c.id, c.name
         ORDER BY total_shipments DESC
         LIMIT 20",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<CarrierPerformanceItem> = rows
        .into_iter()
        .map(
            |(carrier_id, carrier_name, total_shipments, completed_shipments, total_freight)| {
                let total = total_shipments.unwrap_or(0);
                let freight = total_freight.unwrap_or(0.0);
                CarrierPerformanceItem {
                    carrier_id: carrier_id.unwrap_or_default(),
                    carrier_name: carrier_name.unwrap_or_else(|| "未知承运商".to_string()),
                    total_shipments: total,
                    completed_shipments: completed_shipments.unwrap_or(0),
                    total_freight: freight,
                    avg_freight: if total > 0 { freight / total as f64 } else { 0.0 },
                }
            },
        )
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取路线效率
pub async fn get_route_efficiency(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<RouteEfficiencyItem>>> {
    tracing::info!("获取TMS路线效率数据");

    let locale = Locale::from_headers(&headers).as_sql();
    let rows: Vec<(
        Option<String>,
        Option<String>,
        Option<f64>,
        Option<f64>,
        Option<i64>,
        Option<f64>,
    )> = sqlx::query_as(
        "SELECT
            r.id::text as route_id,
            COALESCE(CASE WHEN $1 = 'en' THEN COALESCE(r.name_en, r.name) ELSE r.name END, r.route_no) as route_name,
            COALESCE(r.distance_km, 0)::float8 as distance_km,
            COALESCE(r.estimated_hours, 0)::float8 as estimated_hours,
            COUNT(s.id) as total_trips,
            COALESCE(SUM(s.freight_amount), 0)::float8 as total_freight
         FROM tms.tms_routes r
         LEFT JOIN tms.tms_shipments s ON s.route_id = r.id
         GROUP BY r.id, r.name, r.route_no, r.distance_km, r.estimated_hours
         ORDER BY total_trips DESC
         LIMIT 20",
    )
    .bind(locale)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<RouteEfficiencyItem> = rows
        .into_iter()
        .map(
            |(route_id, route_name, distance_km, estimated_hours, total_trips, total_freight)| {
                let distance = distance_km.unwrap_or(0.0);
                let freight = total_freight.unwrap_or(0.0);
                RouteEfficiencyItem {
                    route_id: route_id.unwrap_or_default(),
                    route_name: route_name.unwrap_or_else(|| "未知路线".to_string()),
                    distance_km: distance,
                    estimated_hours: estimated_hours.unwrap_or(0.0),
                    total_trips: total_trips.unwrap_or(0),
                    total_freight: freight,
                    cost_per_km: if distance > 0.0 { freight / distance } else { 0.0 },
                }
            },
        )
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取司机绩效
pub async fn get_driver_performance(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<DriverPerformanceItem>>> {
    tracing::info!("获取TMS司机绩效数据");

    let rows: Vec<(
        Option<String>,
        Option<String>,
        Option<i64>,
        Option<i64>,
        Option<f64>,
    )> = sqlx::query_as(
        "SELECT 
            d.id::text as driver_id,
            d.name as driver_name,
            COUNT(s.id) as total_deliveries,
            COUNT(CASE WHEN s.status = 'delivered' THEN 1 END) as completed_deliveries,
            COALESCE(SUM(s.freight_amount), 0)::float8 as total_freight
         FROM tms.tms_drivers d
         LEFT JOIN tms.tms_shipments s ON s.driver_id = d.id
         GROUP BY d.id, d.name
         ORDER BY total_deliveries DESC
         LIMIT 20",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<DriverPerformanceItem> = rows
        .into_iter()
        .map(
            |(driver_id, driver_name, total_deliveries, completed_deliveries, total_freight)| {
                let total = total_deliveries.unwrap_or(0);
                let freight = total_freight.unwrap_or(0.0);
                DriverPerformanceItem {
                    driver_id: driver_id.unwrap_or_default(),
                    driver_name: driver_name.unwrap_or_else(|| "未知司机".to_string()),
                    total_deliveries: total,
                    completed_deliveries: completed_deliveries.unwrap_or(0),
                    total_freight: freight,
                    avg_freight: if total > 0 { freight / total as f64 } else { 0.0 },
                }
            },
        )
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取运单趋势增强版（最近12个月，按状态分组）
pub async fn get_shipment_trend_enhanced(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ShipmentTrendEnhancedItem>>> {
    tracing::info!("获取TMS运单趋势增强数据");

    let rows: Vec<(
        Option<String>,
        Option<i64>,
        Option<i64>,
        Option<i64>,
        Option<i64>,
        Option<i64>,
    )> = sqlx::query_as(
        "SELECT 
            TO_CHAR(months.month, 'YYYY-MM') as month,
            COALESCE(s.total, 0) as total,
            COALESCE(s.delivered, 0) as delivered,
            COALESCE(s.cancelled, 0) as cancelled,
            COALESCE(s.in_transit, 0) as in_transit,
            COALESCE(s.pending, 0) as pending
         FROM (
             SELECT generate_series(
                 DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
                 DATE_TRUNC('month', CURRENT_DATE),
                 '1 month'
             )::date as month
         ) months
         LEFT JOIN (
             SELECT 
                 DATE_TRUNC('month', created_at)::date as month,
                 COUNT(*) as total,
                 COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
                 COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                 COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
                 COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
             FROM tms.tms_shipments
             WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
             GROUP BY DATE_TRUNC('month', created_at)::date
         ) s ON months.month = s.month
         ORDER BY months.month"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<ShipmentTrendEnhancedItem> = rows
        .into_iter()
        .map(
            |(month, total, delivered, cancelled, in_transit, pending)| {
                ShipmentTrendEnhancedItem {
                    month: month.unwrap_or_default(),
                    total: total.unwrap_or(0),
                    delivered: delivered.unwrap_or(0),
                    cancelled: cancelled.unwrap_or(0),
                    in_transit: in_transit.unwrap_or(0),
                    pending: pending.unwrap_or(0),
                }
            },
        )
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取车辆利用率
pub async fn get_vehicle_utilization(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<VehicleUtilizationItem>>> {
    tracing::info!("获取TMS车辆利用率数据");

    // 先获取总运单数
    let total_shipments: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM tms.tms_shipments WHERE vehicle_id IS NOT NULL"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let rows: Vec<(Option<String>, Option<String>, Option<i64>)> = sqlx::query_as(
        "SELECT 
            v.id::text as vehicle_id,
            v.vehicle_no,
            COUNT(s.id) as shipment_count
         FROM tms.tms_vehicles v
         LEFT JOIN tms.tms_shipments s ON s.vehicle_id = v.id
         GROUP BY v.id, v.vehicle_no
         ORDER BY shipment_count DESC
         LIMIT 20",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<VehicleUtilizationItem> = rows
        .into_iter()
        .map(|(vehicle_id, vehicle_no, shipment_count)| {
            let count = shipment_count.unwrap_or(0);
            let utilization_rate = if total_shipments > 0 {
                (count as f64 / total_shipments as f64) * 100.0
            } else {
                0.0
            };
            VehicleUtilizationItem {
                vehicle_id: vehicle_id.unwrap_or_default(),
                vehicle_no: vehicle_no.unwrap_or_else(|| "未知车辆".to_string()),
                shipment_count: count,
                utilization_rate: (utilization_rate * 10.0).round() / 10.0,
            }
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取运费成本趋势
pub async fn get_freight_cost_trend(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<FreightCostTrendItem>>> {
    tracing::info!("获取TMS运费成本趋势数据");

    let rows: Vec<(Option<String>, Option<f64>, Option<i64>)> = sqlx::query_as(
        "SELECT 
            TO_CHAR(months.month, 'YYYY-MM') as month,
            COALESCE(s.total_freight, 0)::float8 as total_freight,
            COALESCE(s.shipment_count, 0) as shipment_count
         FROM (
             SELECT generate_series(
                 DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
                 DATE_TRUNC('month', CURRENT_DATE),
                 '1 month'
             )::date as month
         ) months
         LEFT JOIN (
             SELECT 
                 DATE_TRUNC('month', created_at)::date as month,
                 SUM(freight_amount) as total_freight,
                 COUNT(*) as shipment_count
             FROM tms.tms_shipments
             WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
               AND freight_amount IS NOT NULL
             GROUP BY DATE_TRUNC('month', created_at)::date
         ) s ON months.month = s.month
         ORDER BY months.month"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<FreightCostTrendItem> = rows
        .into_iter()
        .map(|(month, total_freight, shipment_count)| {
            let freight = total_freight.unwrap_or(0.0);
            let count = shipment_count.unwrap_or(0);
            FreightCostTrendItem {
                month: month.unwrap_or_default(),
                total_freight: freight,
                shipment_count: count,
                avg_freight: if count > 0 { freight / count as f64 } else { 0.0 },
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
        .route(
            "/analytics/carrier-performance",
            get(get_carrier_performance),
        )
        .route(
            "/analytics/route-efficiency",
            get(get_route_efficiency),
        )
        .route(
            "/analytics/driver-performance",
            get(get_driver_performance),
        )
        .route(
            "/analytics/shipment-trend-enhanced",
            get(get_shipment_trend_enhanced),
        )
        .route(
            "/analytics/vehicle-utilization",
            get(get_vehicle_utilization),
        )
        .route(
            "/analytics/freight-cost-trend",
            get(get_freight_cost_trend),
        )
}
