//! Production Kanban handlers
//!
//! 生产看板只读接口：提供看板总览、订单进度、工位状态、质量趋势、设备状态等聚合查询。

use axum::{extract::Extension, extract::State, routing::get, Json, Router};
use chrono::NaiveDate;
use serde::Serialize;
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/kanban/dashboard", get(get_dashboard))
        .route("/kanban/order-progress", get(get_order_progress))
        .route("/kanban/workstation-status", get(get_workstation_status))
        .route("/kanban/quality-trend", get(get_quality_trend))
        .route("/kanban/equipment-status", get(get_equipment_status))
}

// ==================== Response Types ====================

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct KanbanSummary {
    pub total_orders: i64,
    pub in_progress_orders: i64,
    pub completed_orders: i64,
    pub today_output: f64,
    pub pass_rate: f64,
    pub oee: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct DashboardResponse {
    pub summary: KanbanSummary,
    pub order_progress: Vec<OrderProgressResponse>,
    pub workstation_status: Vec<WorkstationStatusResponse>,
    pub quality_trend: Vec<QualityTrendResponse>,
    pub equipment_status: Vec<EquipmentStatusResponse>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct OrderProgressResponse {
    pub order_id: String,
    pub order_number: String,
    pub product_name: String,
    pub planned_quantity: f64,
    pub completed_quantity: f64,
    pub progress: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkstationStatusResponse {
    pub work_station_id: String,
    pub work_station_name: String,
    pub status: String,
    pub current_order: Option<String>,
    pub current_product: Option<String>,
    pub output_today: Option<f64>,
    pub operator: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct QualityTrendResponse {
    pub date: String,
    pub pass_rate: f64,
    pub total_quantity: f64,
    pub good_quantity: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EquipmentStatusResponse {
    pub equipment_id: String,
    pub equipment_name: String,
    pub equipment_code: String,
    pub status: String,
    pub oee: Option<f64>,
}

// ==================== Helper Functions ====================

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

fn opt_big_decimal_to_f64(bd: Option<BigDecimal>) -> Option<f64> {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
}

// ==================== Handlers ====================

/// GET /api/mes/kanban/dashboard
///
/// 看板总览：聚合返回 summary、订单进度、工位状态、质量趋势、设备状态。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/kanban/dashboard",
    tag = "ProductionKanban",
    responses(
        (status = 200, description = "看板总览", body = ApiResponse<DashboardResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DashboardResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    // 1. Summary: 订单统计 + 今日产量 + 合格率 + OEE
    let order_stats = sqlx::query!(
        r#"
        SELECT
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_orders,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
            COALESCE(SUM(completed_quantity), 0) as total_output
        FROM production_orders
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let order_stats = match order_stats {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch order stats: {}", e);
            return Json(ApiResponse::error(500, "获取看板总览失败"));
        }
    };

    // 今日产量
    let today_output = sqlx::query!(
        r#"
        SELECT COALESCE(SUM(completed_quantity), 0) as today_output
        FROM production_records
        WHERE start_time::date = CURRENT_DATE
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let today_output_val = match today_output {
        Ok(r) => r.today_output.unwrap_or_default() as f64,
        Err(e) => {
            tracing::error!("Failed to fetch today output: {}", e);
            0.0
        }
    };

    // 质量合格率
    let quality_stats = sqlx::query!(
        r#"
        SELECT
            COALESCE(SUM(quantity), 0) as total_quantity,
            COALESCE(SUM(qualified_quantity), 0) as good_quantity
        FROM quality_records
        WHERE quality_status IN ('qualified', 'rejected')
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let quality_stats = match quality_stats {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality stats: {}", e);
            return Json(ApiResponse::error(500, "获取看板总览失败"));
        }
    };

    let total_qty = big_decimal_to_f64(quality_stats.total_quantity);
    let good_qty = big_decimal_to_f64(quality_stats.good_quantity);
    let pass_rate = if total_qty > 0.0 {
        (good_qty / total_qty) * 100.0
    } else {
        0.0
    };

    // 设备 OEE 平均值
    let oee_stats = sqlx::query!(
        r#"
        SELECT COALESCE(AVG(oee), 0) as avg_oee
        FROM (
            SELECT DISTINCT ON (equipment_id) oee
            FROM equipment_oee
            ORDER BY equipment_id, record_date DESC
        ) latest
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let oee_avg = match oee_stats {
        Ok(r) => big_decimal_to_f64(r.avg_oee) * 100.0,
        Err(e) => {
            tracing::error!("Failed to fetch equipment OEE: {}", e);
            0.0
        }
    };

    let summary = KanbanSummary {
        total_orders: order_stats.total_orders.unwrap_or(0),
        in_progress_orders: order_stats.in_progress_orders.unwrap_or(0),
        completed_orders: order_stats.completed_orders.unwrap_or(0),
        today_output: today_output_val,
        pass_rate,
        oee: oee_avg,
    };

    // 2. 订单进度
    let orders = sqlx::query!(
        r#"
        SELECT
            id, order_number AS order_no, product_name, quantity, completed_quantity, status
        FROM production_orders
        ORDER BY created_at DESC
        LIMIT 10
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let order_progress: Vec<OrderProgressResponse> = match orders {
        Ok(rows) => rows
            .into_iter()
            .map(|r| {
                let planned = r.quantity as f64;
                let completed = r.completed_quantity.unwrap_or_default() as f64;
                let progress = if planned > 0.0 {
                    (completed / planned) * 100.0
                } else {
                    0.0
                };
                OrderProgressResponse {
                    order_id: r.id.to_string(),
                    order_number: r.order_no,
                    product_name: r.product_name,
                    planned_quantity: planned,
                    completed_quantity: completed,
                    progress,
                    status: r.status,
                }
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch order progress: {}", e);
            vec![]
        }
    };

    // 3. 工位状态
    let ws_rows = sqlx::query(
        r#"
        SELECT
            ws.id           AS work_station_id,
            ws.station_name         AS work_station_name,
            ws.status       AS status,
            po.order_number     AS current_order,
            po.product_name AS current_product,
            today_stats.output_today AS output_today,
            pr.operator_id  AS operator
        FROM work_stations ws
        LEFT JOIN LATERAL (
            SELECT order_id, operator_id
            FROM production_records
            WHERE work_station_id = ws.id AND status = 'in_progress'
            ORDER BY start_time DESC
            LIMIT 1
        ) pr ON true
        LEFT JOIN production_orders po ON pr.order_id = po.id
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(completed_quantity), 0) AS output_today
            FROM production_records
            WHERE work_station_id = ws.id
              AND start_time::date = CURRENT_DATE
        ) today_stats ON true
        ORDER BY ws.station_name
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let workstation_status: Vec<WorkstationStatusResponse> = match ws_rows {
        Ok(rows) => rows
            .into_iter()
            .map(|r| WorkstationStatusResponse {
                work_station_id: r
                    .try_get::<Uuid, _>("work_station_id")
                    .unwrap_or_default()
                    .to_string(),
                work_station_name: r
                    .try_get::<String, _>("work_station_name")
                    .unwrap_or_default(),
                status: r
                    .try_get::<Option<String>, _>("status")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "active".to_string()),
                current_order: r
                    .try_get::<Option<String>, _>("current_order")
                    .ok()
                    .flatten(),
                current_product: r
                    .try_get::<Option<String>, _>("current_product")
                    .ok()
                    .flatten(),
                output_today: opt_big_decimal_to_f64(
                    r.try_get::<Option<BigDecimal>, _>("output_today")
                        .ok()
                        .flatten(),
                ),
                operator: r
                    .try_get::<Option<Uuid>, _>("operator")
                    .ok()
                    .flatten()
                    .map(|u| u.to_string()),
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch workstation status: {}", e);
            vec![]
        }
    };

    // 4. 质量趋势（近7天）
    let qt_rows = sqlx::query(
        r#"
        SELECT
            DATE(created_at) AS date,
            COALESCE(SUM(quantity), 0) AS total_quantity,
            COALESCE(SUM(qualified_quantity), 0) AS good_quantity
        FROM quality_records
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let quality_trend: Vec<QualityTrendResponse> = match qt_rows {
        Ok(rows) => rows
            .into_iter()
            .map(|r| {
                let date = r
                    .try_get::<Option<NaiveDate>, _>("date")
                    .ok()
                    .flatten()
                    .map(|d| d.format("%Y-%m-%d").to_string())
                    .unwrap_or_default();
                let total = big_decimal_to_f64(
                    r.try_get::<Option<BigDecimal>, _>("total_quantity")
                        .ok()
                        .flatten(),
                );
                let good = big_decimal_to_f64(
                    r.try_get::<Option<BigDecimal>, _>("good_quantity")
                        .ok()
                        .flatten(),
                );
                let pass_rate = if total > 0.0 {
                    (good / total) * 100.0
                } else {
                    0.0
                };
                QualityTrendResponse {
                    date,
                    pass_rate,
                    total_quantity: total,
                    good_quantity: good,
                }
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch quality trend: {}", e);
            vec![]
        }
    };

    // 5. 设备状态
    let eq_rows = sqlx::query(
        r#"
        SELECT
            e.id            AS equipment_id,
            e.equipment_name AS equipment_name,
            e.equipment_no   AS equipment_code,
            e.status        AS status,
            latest_oee.oee  AS oee
        FROM equipment e
        LEFT JOIN LATERAL (
            SELECT oee
            FROM equipment_oee
            WHERE equipment_id = e.id
            ORDER BY record_date DESC
            LIMIT 1
        ) latest_oee ON true
        ORDER BY e.equipment_name
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let equipment_status: Vec<EquipmentStatusResponse> = match eq_rows {
        Ok(rows) => rows
            .into_iter()
            .map(|r| EquipmentStatusResponse {
                equipment_id: r
                    .try_get::<Uuid, _>("equipment_id")
                    .unwrap_or_default()
                    .to_string(),
                equipment_name: r.try_get::<String, _>("equipment_name").unwrap_or_default(),
                equipment_code: r.try_get::<String, _>("equipment_code").unwrap_or_default(),
                status: r
                    .try_get::<Option<String>, _>("status")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "normal".to_string()),
                oee: opt_big_decimal_to_f64(
                    r.try_get::<Option<BigDecimal>, _>("oee").ok().flatten(),
                ),
            })
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch equipment status: {}", e);
            vec![]
        }
    };

    Json(ApiResponse::success(
        DashboardResponse {
            summary,
            order_progress,
            workstation_status,
            quality_trend,
            equipment_status,
        },
        "获取看板总览成功",
    ))
}

/// GET /api/mes/kanban/order-progress
///
/// 订单进度列表：progress = completed_quantity / quantity * 100
#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/kanban/order-progress",
    tag = "ProductionKanban",
    responses(
        (status = 200, description = "订单进度", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_order_progress(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<OrderProgressResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT
            id, order_number AS order_no, product_name, quantity, completed_quantity, status
        FROM production_orders
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let orders = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch order progress: {}", e);
            return Json(ApiResponse::error(500, "获取订单进度失败"));
        }
    };

    let list: Vec<OrderProgressResponse> = orders
        .into_iter()
        .map(|r| {
            let planned = r.quantity as f64;
            let completed = r.completed_quantity.unwrap_or_default() as f64;
            let progress = if planned > 0.0 {
                (completed / planned) * 100.0
            } else {
                0.0
            };
            OrderProgressResponse {
                order_id: r.id.to_string(),
                order_number: r.order_no,
                product_name: r.product_name,
                planned_quantity: planned,
                completed_quantity: completed,
                progress,
                status: r.status,
            }
        })
        .collect();

    Json(ApiResponse::success(list, "获取订单进度成功"))
}

/// GET /api/mes/kanban/workstation-status
///
/// 工位状态：每台工位关联当前在制生产记录及当日产出。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/kanban/workstation-status",
    tag = "ProductionKanban",
    responses(
        (status = 200, description = "工位状态", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_workstation_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<WorkstationStatusResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query(
        r#"
        SELECT
            ws.id           AS work_station_id,
            ws.station_name         AS work_station_name,
            ws.status       AS status,
            po.order_number     AS current_order,
            po.product_name AS current_product,
            today_stats.output_today AS output_today,
            pr.operator_id  AS operator
        FROM work_stations ws
        LEFT JOIN LATERAL (
            SELECT order_id, operator_id
            FROM production_records
            WHERE work_station_id = ws.id AND status = 'in_progress'
            ORDER BY start_time DESC
            LIMIT 1
        ) pr ON true
        LEFT JOIN production_orders po ON pr.order_id = po.id
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(completed_quantity), 0) AS output_today
            FROM production_records
            WHERE work_station_id = ws.id
              AND start_time::date = CURRENT_DATE
        ) today_stats ON true
        ORDER BY ws.station_name
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let rows = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch workstation status: {}", e);
            return Json(ApiResponse::error(500, "获取工位状态失败"));
        }
    };

    let list: Vec<WorkstationStatusResponse> = rows
        .into_iter()
        .map(|r| WorkstationStatusResponse {
            work_station_id: r
                .try_get::<Uuid, _>("work_station_id")
                .unwrap_or_default()
                .to_string(),
            work_station_name: r
                .try_get::<String, _>("work_station_name")
                .unwrap_or_default(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            current_order: r
                .try_get::<Option<String>, _>("current_order")
                .ok()
                .flatten(),
            current_product: r
                .try_get::<Option<String>, _>("current_product")
                .ok()
                .flatten(),
            output_today: opt_big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("output_today")
                    .ok()
                    .flatten(),
            ),
            operator: r
                .try_get::<Option<Uuid>, _>("operator")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
        })
        .collect();

    Json(ApiResponse::success(list, "获取工位状态成功"))
}

/// GET /api/mes/kanban/quality-trend
///
/// 质量趋势：按天聚合 quality_records，计算合格率与数量。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/kanban/quality-trend",
    tag = "ProductionKanban",
    responses(
        (status = 200, description = "质量趋势", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_quality_trend(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<QualityTrendResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query(
        r#"
        SELECT
            DATE(created_at) AS date,
            COALESCE(SUM(quantity), 0) AS total_quantity,
            COALESCE(SUM(qualified_quantity), 0) AS good_quantity
        FROM quality_records
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let rows = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality trend: {}", e);
            return Json(ApiResponse::error(500, "获取质量趋势失败"));
        }
    };

    let list: Vec<QualityTrendResponse> = rows
        .into_iter()
        .map(|r| {
            let date = r
                .try_get::<Option<NaiveDate>, _>("date")
                .ok()
                .flatten()
                .map(|d| d.format("%Y-%m-%d").to_string())
                .unwrap_or_default();
            let total = big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("total_quantity")
                    .ok()
                    .flatten(),
            );
            let good = big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("good_quantity")
                    .ok()
                    .flatten(),
            );
            let pass_rate = if total > 0.0 {
                (good / total) * 100.0
            } else {
                0.0
            };
            QualityTrendResponse {
                date,
                pass_rate,
                total_quantity: total,
                good_quantity: good,
            }
        })
        .collect();

    Json(ApiResponse::success(list, "获取质量趋势成功"))
}

/// GET /api/mes/kanban/equipment-status
///
/// 设备状态：每台设备关联最新 OEE 记录。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/kanban/equipment-status",
    tag = "ProductionKanban",
    responses(
        (status = 200, description = "设备状态", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_equipment_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<EquipmentStatusResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query(
        r#"
        SELECT
            e.id            AS equipment_id,
            e.equipment_name AS equipment_name,
            e.equipment_no   AS equipment_code,
            e.status        AS status,
            latest_oee.oee  AS oee
        FROM equipment e
        LEFT JOIN LATERAL (
            SELECT oee
            FROM equipment_oee
            WHERE equipment_id = e.id
            ORDER BY record_date DESC
            LIMIT 1
        ) latest_oee ON true
        ORDER BY e.equipment_name
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    let rows = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch equipment status: {}", e);
            return Json(ApiResponse::error(500, "获取设备状态失败"));
        }
    };

    let list: Vec<EquipmentStatusResponse> = rows
        .into_iter()
        .map(|r| EquipmentStatusResponse {
            equipment_id: r
                .try_get::<Uuid, _>("equipment_id")
                .unwrap_or_default()
                .to_string(),
            equipment_name: r.try_get::<String, _>("equipment_name").unwrap_or_default(),
            equipment_code: r.try_get::<String, _>("equipment_code").unwrap_or_default(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "normal".to_string()),
            oee: opt_big_decimal_to_f64(r.try_get::<Option<BigDecimal>, _>("oee").ok().flatten()),
        })
        .collect();

    Json(ApiResponse::success(list, "获取设备状态成功"))
}
