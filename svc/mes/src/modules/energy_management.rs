use axum::{
    extract::{Path, Query, State},
    routing::get,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// =============================================================================
// 能耗管理模块 —— 数据源缺口声明
// =============================================================================
// 历史问题：本模块 7 个 GET 端点全部返回随机/固定合成能耗值，0 次 sqlx 查询。
// 审计确认 database/migrations 下不存在任何 mes 能耗采集表（无 energy_* /
// meter / consumption 相关表），也无外部采集系统接入。
//
// 收口策略（三选一中的"无数据源诚实降级"）：
//   - 不再返回随机/固定合成值（避免误导业务决策）；
//   - 统一返回 HTTP 501 + 明确 message，标注"数据源未接入 / degraded"；
//   - 保留全部响应结构体与路由签名，待真实采集表/采集系统落地后，
//     仅需把 `energy_source_unavailable(...)` 替换为真实聚合查询即可。
// =============================================================================

/// 无数据源时的统一 501 响应构造。
///
/// `endpoint` 用于在错误消息里指明是哪个接口未接入数据源。
fn energy_source_unavailable<T>(endpoint: &str) -> Json<ApiResponse<T>> {
    Json(ApiResponse::error(
        501,
        &format!(
            "能耗数据源未接入（degraded）：{} 暂无真实采集表/采集系统，返回合成值已被禁用。请等待能耗采集表落地后重试。",
            endpoint
        ),
    ))
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyConsumptionRecord {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub equipment_code: String,
    pub equipment_name: String,
    pub meter_id: String,
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub unit: String,
    pub quality: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyStatistic {
    pub period: String,
    pub total_consumption: f64,
    pub avg_consumption: f64,
    pub peak_consumption: f64,
    pub peak_time: DateTime<Utc>,
    pub min_consumption: f64,
    pub min_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyByEquipment {
    pub equipment_id: Uuid,
    pub equipment_code: String,
    pub equipment_name: String,
    pub total_consumption: f64,
    pub percentage: f64,
    pub avg_consumption: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyByWorkshop {
    pub workshop_id: Uuid,
    pub workshop_name: String,
    pub total_consumption: f64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyTrendData {
    pub period: String,
    pub consumption: f64,
    pub trend_direction: String,
    pub change_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyReportResponse {
    pub report_id: Uuid,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub total_consumption: f64,
    pub total_cost: f64,
    pub avg_cost_per_unit: f64,
    pub statistics: EnergyStatistic,
    pub by_equipment: Vec<EnergyByEquipment>,
    pub by_workshop: Vec<EnergyByWorkshop>,
    pub trend_data: Vec<EnergyTrendData>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyForecastResponse {
    pub forecast_period: String,
    pub forecast_consumption: f64,
    pub forecast_cost: f64,
    pub confidence_interval: (f64, f64),
    pub trend_factor: f64,
    pub seasonality_factor: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyAlertsResponse {
    pub alerts: Vec<EnergyAlert>,
    pub total_count: i64,
    pub critical_count: i64,
    pub warning_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnergyAlert {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub equipment_code: String,
    pub equipment_name: String,
    pub alert_type: String,
    pub severity: String,
    pub message: String,
    pub threshold_value: f64,
    pub actual_value: f64,
    pub timestamp: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealTimeConsumption {
    pub equipment_id: Uuid,
    pub equipment_code: String,
    pub equipment_name: String,
    pub current_value: f64,
    pub unit: String,
    pub timestamp: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub equipment_id: Option<Uuid>,
    pub workshop_id: Option<Uuid>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReportParams {
    pub period_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ForecastParams {
    pub months: Option<i64>,
    pub equipment_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:energy:read"])),
    path = "/energy/realtime",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 501, description = "能耗数据源未接入（degraded）"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Energy"
)]
async fn get_real_time_consumption(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<RealTimeConsumption>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }
    energy_source_unavailable("GET /energy/realtime")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:energy:read"])),
    path = "/energy/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 501, description = "能耗数据源未接入（degraded）"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Energy"
)]
async fn get_consumption_history(
    State(state): State<AppState>,
    Query(_params): Query<QueryParams>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<EnergyConsumptionRecord>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }
    energy_source_unavailable("GET /energy/history")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:energy:read"])),
    path = "/energy/report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 501, description = "能耗数据源未接入（degraded）"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Energy"
)]
async fn get_energy_report(
    State(state): State<AppState>,
    Query(_params): Query<ReportParams>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<EnergyReportResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }
    energy_source_unavailable("GET /energy/report")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:energy:read"])),
    path = "/energy/forecast",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 501, description = "能耗数据源未接入（degraded）"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Energy"
)]
async fn get_energy_forecast(
    State(state): State<AppState>,
    Query(_params): Query<ForecastParams>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<EnergyForecastResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }
    energy_source_unavailable("GET /energy/forecast")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:energy:read"])),
    path = "/energy/alerts",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 501, description = "能耗数据源未接入（degraded）"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Energy"
)]
async fn get_energy_alerts(
    State(state): State<AppState>,
    Query(_params): Query<QueryParams>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<EnergyAlertsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }
    energy_source_unavailable("GET /energy/alerts")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:energy:read"])),
    path = "/energy/equipment/{equipment_id}",
    params(
    ("equipment_id" = String, Path, description = "equipment_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 501, description = "能耗数据源未接入（degraded）"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Energy"
)]
async fn get_equipment_consumption(
    State(state): State<AppState>,
    Path(_equipment_id): Path<Uuid>,
    Query(_params): Query<QueryParams>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<EnergyConsumptionRecord>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }
    energy_source_unavailable("GET /energy/equipment/{equipment_id}")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:energy:read"])),
    path = "/energy/export",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 501, description = "能耗数据源未接入（degraded）"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Energy"
)]
async fn export_energy_report(
    State(state): State<AppState>,
    Query(_params): Query<ReportParams>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await {
        return e;
    }
    energy_source_unavailable("GET /energy/export")
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/energy/realtime", get(get_real_time_consumption))
        .route("/energy/history", get(get_consumption_history))
        .route("/energy/report", get(get_energy_report))
        .route("/energy/forecast", get(get_energy_forecast))
        .route("/energy/alerts", get(get_energy_alerts))
        .route(
            "/energy/equipment/{equipment_id}",
            get(get_equipment_consumption),
        )
        .route("/energy/export", get(export_energy_report))
}
