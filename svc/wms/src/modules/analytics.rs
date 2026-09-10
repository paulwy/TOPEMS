//! WMS 分析聚合 API
//! 提供库存周转率、订单履约率等聚合查询
//! 路径前缀: /wms/analytics

use axum::{
    extract::{Extension, FromRef, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::modules::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ===== 查询参数 =====

#[derive(Debug, Deserialize)]
pub struct AnalyticsQueryParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub group_by: Option<String>, // month, week, day
    pub warehouse_id: Option<String>,
}

// ===== 响应类型 =====

#[derive(Debug, Serialize)]
pub struct InventoryTurnoverData {
    pub period: String,
    pub turnover_rate: f64,
    pub turnover_days: f64,
    pub cost_of_goods_sold: f64,
    pub average_inventory_value: f64,
    pub outbound_count: i64,
}

#[derive(Debug, Serialize)]
pub struct InventoryTurnoverResponse {
    pub data: Vec<InventoryTurnoverData>,
    pub summary: InventoryTurnoverSummary,
}

#[derive(Debug, Serialize)]
pub struct InventoryTurnoverSummary {
    pub total_turnover: f64,
    pub avg_turnover: f64,
    pub total_outbound: i64,
    pub period_count: i64,
}

#[derive(Debug, Serialize)]
pub struct OrderFulfillmentData {
    pub period: String,
    pub total_orders: i64,
    pub fulfilled_orders: i64,
    pub fulfillment_rate: f64,
    pub avg_fulfillment_days: f64,
    pub on_time_orders: i64,
    pub on_time_rate: f64,
}

#[derive(Debug, Serialize)]
pub struct OrderFulfillmentResponse {
    pub data: Vec<OrderFulfillmentData>,
    pub summary: OrderFulfillmentSummary,
}

#[derive(Debug, Serialize)]
pub struct OrderFulfillmentSummary {
    pub total_orders: i64,
    pub fulfilled_orders: i64,
    pub fulfillment_rate: f64,
    pub avg_fulfillment_days: f64,
    pub on_time_rate: f64,
}

// ===== 工具函数 =====

fn resolve_tenant_id(claims: &Claims) -> Result<Uuid, String> {
    match &claims.tenant_id {
        Some(id) => Uuid::parse_str(id).map_err(|e| format!("无效的租户ID: {}", e)),
        None => Err("缺少租户ID".to_string()),
    }
}

fn parse_date_range(params: &AnalyticsQueryParams) -> (NaiveDate, NaiveDate) {
    let end = params
        .end_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .unwrap_or_else(|| chrono::Utc::now().date_naive());
    let start = params
        .start_date
        .as_ref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .unwrap_or_else(|| end - chrono::Duration::days(90));
    (start, end)
}

fn format_period(date: NaiveDate, group_by: &str) -> String {
    match group_by {
        "month" => format!("{:04}-{:02}", date.year(), date.month()),
        "week" => {
            let iso_week = date.iso_week();
            format!("{:04}-W{:02}", iso_week.year(), iso_week.week())
        }
        _ => format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day()),
    }
}

// ===== 库存周转率 =====

async fn get_inventory_turnover(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Json<ApiResponse<InventoryTurnoverResponse>> {
    let tenant_id = match resolve_tenant_id(&claims) {
        Ok(id) => id,
        Err(e) => return Json(ApiResponse::error(401, &e)),
    };

    let (start, end) = parse_date_range(&params);
    let group_by = params.group_by.as_deref().unwrap_or("month");

    // 查询出库移动记录，按周期聚合
    let warehouse_filter = params.warehouse_id.as_ref().map(|_| "AND from_warehouse_id = $4").unwrap_or("");
    let sql = format!(
        r#"
        SELECT
            DATE_TRUNC('{}', performed_at)::date AS period_date,
            COUNT(*) AS outbound_count,
            COALESCE(SUM(quantity), 0) AS total_quantity
        FROM wms.inventory_movements
        WHERE tenant_id = $1
          AND movement_type = 'outbound'
          AND status = 'completed'
          AND performed_at >= $2
          AND performed_at <= $3
          {}
        GROUP BY period_date
        ORDER BY period_date
        "#,
        group_by, warehouse_filter
    );

    let mut query = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(start.and_hms_opt(0, 0, 0).unwrap())
        .bind(end.and_hms_opt(23, 59, 59).unwrap());

    if let Some(wh_id) = &params.warehouse_id {
        query = query.bind(wh_id.parse::<Uuid>().unwrap_or(Uuid::nil()));
    }

    let rows = match query.fetch_all(&state.db).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("inventory_turnover query error: {}", e);
            return Json(ApiResponse::error(500, &format!("查询失败: {}", e)));
        }
    };

    // 计算平均库存（简化：用当前库存作为平均库存的近似）
    let avg_inventory: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(quantity), 0) FROM wms.inventory WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let mut data = Vec::new();
    let mut total_turnover = 0.0;
    let mut total_outbound = 0i64;

    for row in rows {
        let period_date: NaiveDate = row.get("period_date");
        let outbound_count: i64 = row.get("outbound_count");
        let total_quantity: f64 = row.get::<Option<f64>, _>("total_quantity").unwrap_or(0.0);

        let turnover_rate = if avg_inventory > 0.0 {
            total_quantity / avg_inventory
        } else {
            0.0
        };
        let turnover_days = if turnover_rate > 0.0 {
            30.0 / turnover_rate
        } else {
            0.0
        };

        total_turnover += turnover_rate;
        total_outbound += outbound_count;

        data.push(InventoryTurnoverData {
            period: format_period(period_date, group_by),
            turnover_rate: (turnover_rate * 100.0).round() / 100.0,
            turnover_days: (turnover_days * 100.0).round() / 100.0,
            cost_of_goods_sold: (total_quantity * 100.0).round() / 100.0,
            average_inventory_value: (avg_inventory * 100.0).round() / 100.0,
            outbound_count,
        });
    }

    let period_count = data.len() as i64;
    let avg_turnover = if period_count > 0 {
        total_turnover / period_count as f64
    } else {
        0.0
    };

    Json(ApiResponse::success(
        InventoryTurnoverResponse {
            data,
            summary: InventoryTurnoverSummary {
                total_turnover: (total_turnover * 100.0).round() / 100.0,
                avg_turnover: (avg_turnover * 100.0).round() / 100.0,
                total_outbound,
                period_count,
            },
        },
        "库存周转率查询成功",
    ))
}

// ===== 订单履约率 =====

async fn get_order_fulfillment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Json<ApiResponse<OrderFulfillmentResponse>> {
    let tenant_id = match resolve_tenant_id(&claims) {
        Ok(id) => id,
        Err(e) => return Json(ApiResponse::error(401, &e)),
    };

    let (start, end) = parse_date_range(&params);
    let group_by = params.group_by.as_deref().unwrap_or("month");

    let warehouse_filter = params.warehouse_id.as_ref().map(|_| "AND warehouse_id = $4").unwrap_or("");
    let sql = format!(
        r#"
        SELECT
            DATE_TRUNC('{}', created_at)::date AS period_date,
            COUNT(*) AS total_orders,
            COUNT(*) FILTER (WHERE status IN ('shipped', 'delivered', 'completed')) AS fulfilled_orders,
            COUNT(*) FILTER (
                WHERE status IN ('shipped', 'delivered', 'completed')
                AND actual_ship_date <= expected_ship_date
            ) AS on_time_orders,
            COALESCE(AVG(
                CASE
                    WHEN actual_ship_date IS NOT NULL AND expected_ship_date IS NOT NULL
                    THEN (actual_ship_date - expected_ship_date)::integer
                    ELSE NULL
                END
            ), 0) AS avg_fulfillment_days
        FROM wms.outbound_orders
        WHERE org_id = $1
          AND created_at >= $2
          AND created_at <= $3
          {}
        GROUP BY period_date
        ORDER BY period_date
        "#,
        group_by, warehouse_filter
    );

    let mut query = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(start.and_hms_opt(0, 0, 0).unwrap())
        .bind(end.and_hms_opt(23, 59, 59).unwrap());

    if let Some(wh_id) = &params.warehouse_id {
        query = query.bind(wh_id.parse::<Uuid>().unwrap_or(Uuid::nil()));
    }

    let rows = match query.fetch_all(&state.db).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("order_fulfillment query error: {}", e);
            return Json(ApiResponse::error(500, &format!("查询失败: {}", e)));
        }
    };

    let mut data = Vec::new();
    let mut total_orders = 0i64;
    let mut fulfilled_orders = 0i64;
    let mut on_time_orders = 0i64;
    let mut total_fulfillment_days = 0.0;
    let mut period_with_data = 0i64;

    for row in rows {
        let period_date: NaiveDate = row.get("period_date");
        let period_total: i64 = row.get("total_orders");
        let period_fulfilled: i64 = row.get("fulfilled_orders");
        let period_on_time: i64 = row.get("on_time_orders");
        let avg_days: f64 = row.get::<Option<f64>, _>("avg_fulfillment_days").unwrap_or(0.0);

        let fulfillment_rate = if period_total > 0 {
            period_fulfilled as f64 / period_total as f64 * 100.0
        } else {
            0.0
        };
        let on_time_rate = if period_fulfilled > 0 {
            period_on_time as f64 / period_fulfilled as f64 * 100.0
        } else {
            0.0
        };

        total_orders += period_total;
        fulfilled_orders += period_fulfilled;
        on_time_orders += period_on_time;
        if period_total > 0 {
            total_fulfillment_days += avg_days;
            period_with_data += 1;
        }

        data.push(OrderFulfillmentData {
            period: format_period(period_date, group_by),
            total_orders: period_total,
            fulfilled_orders: period_fulfilled,
            fulfillment_rate: (fulfillment_rate * 100.0).round() / 100.0,
            avg_fulfillment_days: (avg_days * 100.0).round() / 100.0,
            on_time_orders: period_on_time,
            on_time_rate: (on_time_rate * 100.0).round() / 100.0,
        });
    }

    let overall_fulfillment_rate = if total_orders > 0 {
        fulfilled_orders as f64 / total_orders as f64 * 100.0
    } else {
        0.0
    };
    let overall_on_time_rate = if fulfilled_orders > 0 {
        on_time_orders as f64 / fulfilled_orders as f64 * 100.0
    } else {
        0.0
    };
    let overall_avg_days = if period_with_data > 0 {
        total_fulfillment_days / period_with_data as f64
    } else {
        0.0
    };

    Json(ApiResponse::success(
        OrderFulfillmentResponse {
            data,
            summary: OrderFulfillmentSummary {
                total_orders,
                fulfilled_orders,
                fulfillment_rate: (overall_fulfillment_rate * 100.0).round() / 100.0,
                avg_fulfillment_days: (overall_avg_days * 100.0).round() / 100.0,
                on_time_rate: (overall_on_time_rate * 100.0).round() / 100.0,
            },
        },
        "订单履约率查询成功",
    ))
}

// ===== 路由注册 =====

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/analytics/inventory-turnover", get(get_inventory_turnover))
        .route("/analytics/order-fulfillment", get(get_order_fulfillment))
}
