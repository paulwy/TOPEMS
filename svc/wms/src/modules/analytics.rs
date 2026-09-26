//! WMS 分析聚合 API
//! 提供库存周转率、订单履约率等聚合查询
//! 路径前缀: /wms/analytics

use axum::{
    extract::{Extension, FromRef, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use num_traits::cast::ToPrimitive;

use crate::modules::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::decimal::big_decimal_to_f64;

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
        .and_then(|s| s.parse::<chrono::NaiveDate>().ok())
        .unwrap_or_else(|| chrono::Utc::now().date_naive());
    let start = params
        .start_date
        .as_ref()
        .and_then(|s| s.parse::<chrono::NaiveDate>().ok())
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/analytics/inventory-turnover",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
async fn get_inventory_turnover(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Json<ApiResponse<InventoryTurnoverResponse>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(match resolve_tenant_id(&claims) {
            Ok(id) => id,
            Err(e) => return Json(ApiResponse::error(401, &e)),
        })
    };

    let (start, end) = parse_date_range(&params);
    let group_by = params.group_by.as_deref().unwrap_or("month");

    // 查询出库移动记录，按周期聚合
    let warehouse_filter = params
        .warehouse_id
        .as_ref()
        .map(|_| "AND from_warehouse_id = $4")
        .unwrap_or("");
    let sql = format!(
        r#"
        SELECT
            DATE_TRUNC('{}', performed_at)::date AS period_date,
            COUNT(*) AS outbound_count,
            COALESCE(SUM(quantity), 0) AS total_quantity
        FROM wms.inventory_movements
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
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
        "SELECT COALESCE(AVG(quantity), 0) FROM wms.inventory WHERE ($1::uuid IS NULL OR tenant_id = $1)",
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/analytics/order-fulfillment",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
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

    let warehouse_filter = params
        .warehouse_id
        .as_ref()
        .map(|_| "AND warehouse_id = $4")
        .unwrap_or("");
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
        WHERE organization_id = $1
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
        let avg_days: f64 = row
            .get::<Option<f64>, _>("avg_fulfillment_days")
            .unwrap_or(0.0);

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

// ===== 流量趋势 =====

#[derive(Debug, Serialize)]
pub struct FlowTrendData {
    pub period: String,
    pub inbound_qty: f64,
    pub outbound_qty: f64,
    pub inbound_count: i64,
    pub outbound_count: i64,
}

#[derive(Debug, Serialize)]
pub struct FlowTrendSummary {
    pub total_inbound_qty: f64,
    pub total_outbound_qty: f64,
    pub total_inbound_count: i64,
    pub total_outbound_count: i64,
    pub period_count: i64,
}

#[derive(Debug, Serialize)]
pub struct FlowTrendResponse {
    pub data: Vec<FlowTrendData>,
    pub summary: FlowTrendSummary,
}

/// 获取流量趋势（入库/出库数量和订单数）
#[utoipa::path(
    get,
    path = "/api/wms/analytics/flow-trend",
    tag = "WMS/analytics",
    params(
        ("start_date" = Option<String>, Query, description = "开始日期"),
        ("end_date" = Option<String>, Query, description = "结束日期"),
        ("group_by" = Option<String>, Query, description = "时间粒度: month/week/day"),
        ("warehouse_id" = Option<String>, Query, description = "仓库ID"),
    ),
    responses((status = 200, description = "流量趋势查询成功"))
)]
pub async fn get_flow_trend(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Json<ApiResponse<FlowTrendResponse>> {
    let group_by = params.group_by.as_deref().unwrap_or("month");
    let date_trunc = match group_by {
        "day" => "day",
        "week" => "week",
        _ => "month",
    };

    // 入库统计
    let inbound_result = sqlx::query(
        r#"
        SELECT
            DATE_TRUNC($1, created_at) as period,
            COALESCE(SUM(total_items), 0) as total_qty,
            COUNT(*) as order_count
        FROM wms.inbound_orders
        WHERE deleted_at IS NULL
          AND ($2::date IS NULL OR created_at >= $2::date)
          AND ($3::date IS NULL OR created_at <= $3::date)
          AND ($4::uuid IS NULL OR warehouse_id = $4::uuid)
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY period ASC
        "#,
    )
    .bind(date_trunc)
    .bind(params.start_date.as_deref())
    .bind(params.end_date.as_deref())
    .bind(params.warehouse_id.as_deref())
    .fetch_all(&state.db)
    .await;

    // 出库统计
    let outbound_result = sqlx::query(
        r#"
        SELECT
            DATE_TRUNC($1, created_at) as period,
            COALESCE(SUM(total_items), 0) as total_qty,
            COUNT(*) as order_count
        FROM wms.outbound_orders
        WHERE deleted_at IS NULL
          AND ($2::date IS NULL OR created_at >= $2::date)
          AND ($3::date IS NULL OR created_at <= $3::date)
          AND ($4::uuid IS NULL OR warehouse_id = $4::uuid)
        GROUP BY DATE_TRUNC($1, created_at)
        ORDER BY period ASC
        "#,
    )
    .bind(date_trunc)
    .bind(params.start_date.as_deref())
    .bind(params.end_date.as_deref())
    .bind(params.warehouse_id.as_deref())
    .fetch_all(&state.db)
    .await;

    let mut data = Vec::new();
    let mut total_inbound_qty = 0.0;
    let mut total_outbound_qty = 0.0;
    let mut total_inbound_count = 0i64;
    let mut total_outbound_count = 0i64;

    // 合并入库和出库数据
    let mut periods = std::collections::BTreeMap::new();

    if let Ok(rows) = inbound_result {
        for row in rows {
            let period: Option<chrono::NaiveDateTime> = row.try_get("period").ok().flatten();
            let qty: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_qty")
                    .ok()
                    .flatten(),
            );
            let count: i64 = row.try_get("order_count").unwrap_or(0);
            let key = period
                .map(|p| format_period_date(p, group_by))
                .unwrap_or_default();
            periods
                .entry(key.clone())
                .or_insert_with(|| (0.0, 0.0, 0i64, 0i64));
            if let Some(v) = periods.get_mut(&key) {
                v.0 = qty;
                v.2 = count;
            }
            total_inbound_qty += qty;
            total_inbound_count += count;
        }
    }

    if let Ok(rows) = outbound_result {
        for row in rows {
            let period: Option<chrono::NaiveDateTime> = row.try_get("period").ok().flatten();
            let qty: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_qty")
                    .ok()
                    .flatten(),
            );
            let count: i64 = row.try_get("order_count").unwrap_or(0);
            let key = period
                .map(|p| format_period_date(p, group_by))
                .unwrap_or_default();
            periods
                .entry(key.clone())
                .or_insert_with(|| (0.0, 0.0, 0i64, 0i64));
            if let Some(v) = periods.get_mut(&key) {
                v.1 = qty;
                v.3 = count;
            }
            total_outbound_qty += qty;
            total_outbound_count += count;
        }
    }

    for (period, (inbound_qty, outbound_qty, inbound_count, outbound_count)) in periods {
        data.push(FlowTrendData {
            period,
            inbound_qty: (inbound_qty * 100.0).round() / 100.0,
            outbound_qty: (outbound_qty * 100.0).round() / 100.0,
            inbound_count,
            outbound_count,
        });
    }

    let period_count = data.len() as i64;

    Json(ApiResponse::success(
        FlowTrendResponse {
            data,
            summary: FlowTrendSummary {
                total_inbound_qty: (total_inbound_qty * 100.0).round() / 100.0,
                total_outbound_qty: (total_outbound_qty * 100.0).round() / 100.0,
                total_inbound_count,
                total_outbound_count,
                period_count,
            },
        },
        "流量趋势查询成功",
    ))
}

// ===== ABC分析 =====

#[derive(Debug, Serialize)]
pub struct AbcAnalysisData {
    pub category: String,
    pub material_count: i64,
    pub total_value: f64,
    pub value_percentage: f64,
    pub count_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct AbcAnalysisResponse {
    pub data: Vec<AbcAnalysisData>,
    pub total_materials: i64,
    pub total_value: f64,
}

/// 获取ABC分析（按物料价值分类）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/analytics/abc-analysis",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
pub async fn get_abc_analysis(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Json<ApiResponse<AbcAnalysisResponse>> {
    // 按物料汇总价值
    let result = sqlx::query(
        r#"
        SELECT
            material_code,
            material_name,
            SUM(quantity * COALESCE(purchase_price, 0)) as total_value,
            SUM(quantity) as total_qty
        FROM wms.inventory
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR warehouse_id = $1::uuid)
        GROUP BY material_code, material_name
        ORDER BY total_value DESC
        "#,
    )
    .bind(params.warehouse_id.as_deref())
    .fetch_all(&state.db)
    .await;

    let mut materials: Vec<(String, f64)> = Vec::new();
    let mut total_value = 0.0;

    if let Ok(rows) = result {
        for row in rows {
            let code: String = row.try_get("material_code").unwrap_or_default();
            let value: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                    .ok()
                    .flatten(),
            );
            materials.push((code, value));
            total_value += value;
        }
    }

    // ABC分类：A类(前70%价值)、B类(70-90%)、C类(90-100%)
    let mut cumulative = 0.0;
    let mut category_a = (0i64, 0.0f64);
    let mut category_b = (0i64, 0.0f64);
    let mut category_c = (0i64, 0.0f64);

    for (_, value) in &materials {
        cumulative += value;
        let percentage = if total_value > 0.0 {
            cumulative / total_value
        } else {
            0.0
        };

        if percentage <= 0.7 {
            category_a.0 += 1;
            category_a.1 += value;
        } else if percentage <= 0.9 {
            category_b.0 += 1;
            category_b.1 += value;
        } else {
            category_c.0 += 1;
            category_c.1 += value;
        }
    }

    let total_count = materials.len() as i64;
    let data = vec![
        AbcAnalysisData {
            category: "A".to_string(),
            material_count: category_a.0,
            total_value: (category_a.1 * 100.0).round() / 100.0,
            value_percentage: if total_value > 0.0 {
                (category_a.1 / total_value * 10000.0).round() / 100.0
            } else {
                0.0
            },
            count_percentage: if total_count > 0 {
                (category_a.0 as f64 / total_count as f64 * 10000.0).round() / 100.0
            } else {
                0.0
            },
        },
        AbcAnalysisData {
            category: "B".to_string(),
            material_count: category_b.0,
            total_value: (category_b.1 * 100.0).round() / 100.0,
            value_percentage: if total_value > 0.0 {
                (category_b.1 / total_value * 10000.0).round() / 100.0
            } else {
                0.0
            },
            count_percentage: if total_count > 0 {
                (category_b.0 as f64 / total_count as f64 * 10000.0).round() / 100.0
            } else {
                0.0
            },
        },
        AbcAnalysisData {
            category: "C".to_string(),
            material_count: category_c.0,
            total_value: (category_c.1 * 100.0).round() / 100.0,
            value_percentage: if total_value > 0.0 {
                (category_c.1 / total_value * 10000.0).round() / 100.0
            } else {
                0.0
            },
            count_percentage: if total_count > 0 {
                (category_c.0 as f64 / total_count as f64 * 10000.0).round() / 100.0
            } else {
                0.0
            },
        },
    ];

    Json(ApiResponse::success(
        AbcAnalysisResponse {
            data,
            total_materials: total_count,
            total_value: (total_value * 100.0).round() / 100.0,
        },
        "ABC分析查询成功",
    ))
}

// ===== 库龄帕累托 =====

#[derive(Debug, Serialize)]
pub struct AgeParetoData {
    pub age_bucket: String,
    pub material_count: i64,
    pub total_value: f64,
    pub cumulative_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct AgeParetoResponse {
    pub data: Vec<AgeParetoData>,
    pub total_materials: i64,
    pub total_value: f64,
}

/// 获取库龄帕累托分析
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/analytics/age-pareto",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
pub async fn get_age_pareto(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Json<ApiResponse<AgeParetoResponse>> {
    let result = sqlx::query(
        r#"
        SELECT
            material_code,
            material_name,
            SUM(quantity * COALESCE(purchase_price, 0)) as total_value,
            MIN(COALESCE(production_date, created_at::date)) as earliest_date
        FROM wms.inventory
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR warehouse_id = $1::uuid)
        GROUP BY material_code, material_name
        ORDER BY total_value DESC
        "#,
    )
    .bind(params.warehouse_id.as_deref())
    .fetch_all(&state.db)
    .await;

    let mut items: Vec<(String, f64, i64)> = Vec::new(); // (age_bucket, value, days)
    let mut total_value = 0.0;

    let now = chrono::Utc::now().date_naive();

    if let Ok(rows) = result {
        for row in rows {
            let value: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                    .ok()
                    .flatten(),
            );
            let earliest: Option<chrono::NaiveDate> = row.try_get("earliest_date").ok().flatten();
            let days = earliest.map(|d| (now - d).num_days()).unwrap_or(0);

            let bucket = if days <= 30 {
                "0-30天"
            } else if days <= 90 {
                "31-90天"
            } else if days <= 180 {
                "91-180天"
            } else if days <= 365 {
                "181-365天"
            } else {
                "365天以上"
            };

            items.push((bucket.to_string(), value, days));
            total_value += value;
        }
    }

    // 按库龄桶汇总
    let mut buckets = std::collections::BTreeMap::new();
    for (bucket, value, _) in items {
        let entry = buckets.entry(bucket).or_insert_with(|| (0i64, 0.0f64));
        entry.0 += 1;
        entry.1 += value;
    }

    let mut cumulative = 0.0;
    let mut data = Vec::new();
    let total_count = buckets.values().map(|v| v.0).sum::<i64>();

    for (bucket, (count, value)) in buckets {
        cumulative += value;
        data.push(AgeParetoData {
            age_bucket: bucket,
            material_count: count,
            total_value: (value * 100.0).round() / 100.0,
            cumulative_percentage: if total_value > 0.0 {
                (cumulative / total_value * 10000.0).round() / 100.0
            } else {
                0.0
            },
        });
    }

    Json(ApiResponse::success(
        AgeParetoResponse {
            data,
            total_materials: total_count,
            total_value: (total_value * 100.0).round() / 100.0,
        },
        "库龄帕累托查询成功",
    ))
}

// ===== 库位利用率 =====

#[derive(Debug, Serialize)]
pub struct LocationUtilizationData {
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: String,
    pub total_locations: i64,
    pub used_locations: i64,
    pub utilization_rate: f64,
    pub avg_capacity_usage: f64,
    pub dead_stock_locations: i64,
}

#[derive(Debug, Serialize)]
pub struct LocationUtilizationResponse {
    pub data: Vec<LocationUtilizationData>,
    pub total_locations: i64,
    pub used_locations: i64,
    pub overall_utilization: f64,
}

/// 获取库位利用率
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/analytics/location-utilization",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
pub async fn get_location_utilization(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Json<ApiResponse<LocationUtilizationResponse>> {
    let result = sqlx::query(
        r#"
        SELECT
            l.warehouse_id,
            w.warehouse_name,
            COUNT(*) as total_locations,
            COUNT(*) FILTER (WHERE l.current_quantity > 0) as used_locations,
            COALESCE(AVG(CASE WHEN l.capacity > 0 THEN l.current_quantity / l.capacity ELSE 0 END), 0) as avg_capacity_usage,
            COUNT(*) FILTER (WHERE l.current_quantity > 0 AND l.updated_at < NOW() - INTERVAL '90 days') as dead_stock_locations
        FROM wms.locations l
        LEFT JOIN wms.warehouses w ON l.warehouse_id = w.id
        WHERE l.deleted_at IS NULL
          AND l.is_active = true
          AND ($1::uuid IS NULL OR l.warehouse_id = $1::uuid)
        GROUP BY l.warehouse_id, w.warehouse_name
        ORDER BY total_locations DESC
        "#,
    )
    .bind(params.warehouse_id.as_deref())
    .fetch_all(&state.db)
    .await;

    let mut data = Vec::new();
    let mut total_locations = 0i64;
    let mut used_locations = 0i64;

    if let Ok(rows) = result {
        for row in rows {
            let warehouse_id: Option<Uuid> = row.try_get("warehouse_id").ok();
            let warehouse_name: String = row
                .try_get("warehouse_name")
                .unwrap_or_else(|_| "未知仓库".to_string());
            let total: i64 = row.try_get("total_locations").unwrap_or(0);
            let used: i64 = row.try_get("used_locations").unwrap_or(0);
            let avg_usage: f64 = row.try_get("avg_capacity_usage").unwrap_or(0.0);
            let dead: i64 = row.try_get("dead_stock_locations").unwrap_or(0);

            let utilization = if total > 0 {
                (used as f64 / total as f64 * 10000.0).round() / 100.0
            } else {
                0.0
            };

            data.push(LocationUtilizationData {
                warehouse_id,
                warehouse_name,
                total_locations: total,
                used_locations: used,
                utilization_rate: utilization,
                avg_capacity_usage: (avg_usage * 10000.0).round() / 100.0,
                dead_stock_locations: dead,
            });

            total_locations += total;
            used_locations += used;
        }
    }

    let overall_utilization = if total_locations > 0 {
        (used_locations as f64 / total_locations as f64 * 10000.0).round() / 100.0
    } else {
        0.0
    };

    Json(ApiResponse::success(
        LocationUtilizationResponse {
            data,
            total_locations,
            used_locations,
            overall_utilization,
        },
        "库位利用率查询成功",
    ))
}

// ===== 辅助函数 =====

fn format_period_date(dt: chrono::NaiveDateTime, group_by: &str) -> String {
    match group_by {
        "day" => dt.format("%Y-%m-%d").to_string(),
        "week" => dt.format("%Y-W%U").to_string(),
        _ => dt.format("%Y-%m").to_string(),
    }
}

// ===== Dashboard 汇总 =====

#[derive(Debug, Clone, Serialize)]
pub struct DashboardSummary {
    pub warehouse_count: i64,
    pub inventory_total: f64,
    pub inventory_sku_count: i64,
    pub inbound_today: i64,
    pub outbound_today: i64,
    pub alert_count: i64,
    pub alert_critical: i64,
    pub location_utilization: f64,
}

#[utoipa::path(
    get,
    path = "/api/wms/analytics/dashboard-summary",
    tag = "WMS Analytics",
    responses(
        (status = 200, description = "Dashboard汇总数据", body = ApiResponse<DashboardSummary>),
    ),
)]
pub async fn get_dashboard_summary(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<DashboardSummary>> {
    tracing::info!("获取WMS Dashboard汇总数据");

    // 仓库数
    let warehouse_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM wms.warehouses WHERE deleted_at IS NULL")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    // 库存总量和SKU数
    let inventory_row: (Option<f64>, Option<i64>) = sqlx::query_as(
        "SELECT COALESCE(SUM(quantity), 0) as total, COUNT(DISTINCT material_code) as sku_count FROM wms.inventory"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or((Some(0.0), Some(0)));

    // 今日入库数
    let inbound_today: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM wms.inbound_orders WHERE DATE(created_at) = CURRENT_DATE AND deleted_at IS NULL"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    // 今日出库数
    let outbound_today: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM wms.outbound_orders WHERE DATE(created_at) = CURRENT_DATE AND deleted_at IS NULL"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    // 告警数
    let alert_row: (Option<i64>, Option<i64>) = sqlx::query_as(
        "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE severity = 'critical') as critical FROM wms.alerts WHERE status = 'active' AND deleted_at IS NULL"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or((Some(0), Some(0)));

    // 库位利用率（简化：已使用库位/总库位）
    let location_util: f64 = sqlx::query_scalar(
        "SELECT CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'occupied')::float / COUNT(*)::float) * 100 ELSE 0 END FROM wms.locations WHERE deleted_at IS NULL"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let summary = DashboardSummary {
        warehouse_count,
        inventory_total: inventory_row.0.unwrap_or(0.0),
        inventory_sku_count: inventory_row.1.unwrap_or(0),
        inbound_today,
        outbound_today,
        alert_count: alert_row.0.unwrap_or(0),
        alert_critical: alert_row.1.unwrap_or(0),
        location_utilization: location_util,
    };

    Json(ApiResponse::success(summary, "获取成功"))
}

// ===== Dashboard 图表数据 =====

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryDistributionItem {
    pub warehouse_id: String,
    pub warehouse_name: String,
    pub quantity: f64,
    pub sku_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryTypeItem {
    pub material_type: String,
    pub quantity: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyTrendItem {
    pub date: String,
    pub inbound: i64,
    pub outbound: i64,
}

/// 获取库存分布（按仓库）
#[utoipa::path(
    get,
    path = "/analytics/inventory-distribution",
    tag = "WMS Analytics",
    responses(
        (status = 200, description = "库存分布数据", body = ApiResponse<Vec<InventoryDistributionItem>>),
    ),
)]
pub async fn get_inventory_distribution(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<InventoryDistributionItem>>> {
    tracing::info!("获取WMS库存分布数据");

    let locale = Locale::from_headers(&headers).as_sql();
    let rows: Vec<(String, Option<String>, Option<f64>, Option<i64>)> = sqlx::query_as(
        "SELECT i.warehouse_id::text as warehouse_id,
                CASE WHEN $1 = 'en' THEN COALESCE(w.warehouse_name_en, w.warehouse_name) ELSE w.warehouse_name END as warehouse_name,
                COALESCE(SUM(i.quantity), 0) as quantity,
                COUNT(DISTINCT i.material_code) as sku_count
         FROM wms.inventory i
         LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
         WHERE i.deleted_at IS NULL
         GROUP BY i.warehouse_id, w.warehouse_name
         ORDER BY quantity DESC
         LIMIT 10",
    )
    .bind(locale)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<InventoryDistributionItem> = rows
        .into_iter()
        .map(
            |(warehouse_id, warehouse_name, quantity, sku_count)| InventoryDistributionItem {
                warehouse_id,
                warehouse_name: warehouse_name.unwrap_or_else(|| "未知仓库".to_string()),
                quantity: quantity.unwrap_or(0.0),
                sku_count: sku_count.unwrap_or(0),
            },
        )
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取库存类型分布（按物料类型）
#[utoipa::path(
    get,
    path = "/analytics/inventory-types",
    tag = "WMS Analytics",
    responses(
        (status = 200, description = "库存类型分布", body = ApiResponse<Vec<InventoryTypeItem>>),
    ),
)]
pub async fn get_inventory_types(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<InventoryTypeItem>>> {
    tracing::info!("获取WMS库存类型分布");

    let total: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(quantity), 0) FROM wms.inventory WHERE deleted_at IS NULL",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let rows: Vec<(Option<String>, Option<f64>)> = sqlx::query_as(
        "SELECT COALESCE(material_type, '未分类') as material_type, 
                COALESCE(SUM(quantity), 0) as quantity
         FROM wms.inventory
         WHERE deleted_at IS NULL
         GROUP BY material_type
         ORDER BY quantity DESC
         LIMIT 8",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<InventoryTypeItem> = rows
        .into_iter()
        .map(|(material_type, quantity)| {
            let qty = quantity.unwrap_or(0.0);
            let percentage = if total > 0.0 {
                (qty / total) * 100.0
            } else {
                0.0
            };
            InventoryTypeItem {
                material_type: material_type.unwrap_or_else(|| "未分类".to_string()),
                quantity: qty,
                percentage,
            }
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
}

/// 获取每日出入库趋势（最近7天）
#[utoipa::path(
    get,
    path = "/analytics/daily-trend",
    tag = "WMS Analytics",
    responses(
        (status = 200, description = "每日出入库趋势", body = ApiResponse<Vec<DailyTrendItem>>),
    ),
)]
pub async fn get_daily_trend(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<DailyTrendItem>>> {
    tracing::info!("获取WMS每日出入库趋势");

    let rows: Vec<(Option<String>, Option<i64>, Option<i64>)> = sqlx::query_as(
        "SELECT 
            dates.date::text as date,
            COALESCE(inbound.count, 0) as inbound,
            COALESCE(outbound.count, 0) as outbound
         FROM (
             SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as date
         ) dates
         LEFT JOIN (
             SELECT DATE(created_at) as date, COUNT(*) as count
             FROM wms.inbound_orders
             WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY DATE(created_at)
         ) inbound ON dates.date = inbound.date
         LEFT JOIN (
             SELECT DATE(created_at) as date, COUNT(*) as count
             FROM wms.outbound_orders
             WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY DATE(created_at)
         ) outbound ON dates.date = outbound.date
         ORDER BY dates.date"
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let items: Vec<DailyTrendItem> = rows
        .into_iter()
        .map(|(date, inbound, outbound)| DailyTrendItem {
            date: date.unwrap_or_default(),
            inbound: inbound.unwrap_or(0),
            outbound: outbound.unwrap_or(0),
        })
        .collect();

    Json(ApiResponse::success(items, "获取成功"))
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
        .route("/analytics/flow-trend", get(get_flow_trend))
        .route("/analytics/abc-analysis", get(get_abc_analysis))
        .route("/analytics/age-pareto", get(get_age_pareto))
        .route(
            "/analytics/location-utilization",
            get(get_location_utilization),
        )
        .route("/analytics/dashboard-summary", get(get_dashboard_summary))
        .route(
            "/analytics/inventory-distribution",
            get(get_inventory_distribution),
        )
        .route("/analytics/inventory-types", get(get_inventory_types))
        .route("/analytics/daily-trend", get(get_daily_trend))
}
