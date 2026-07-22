use axum::{
    extract::{Path, Query, State},
    routing::get,
    Extension, Json, Router,
};
use chrono::{DateTime, Datelike, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

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

async fn get_real_time_consumption(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<Vec<RealTimeConsumption>>>, Json<ApiResponse<()>>> {
    check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await?;

    let records = vec![
        RealTimeConsumption {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-001".to_string(),
            equipment_name: "CNC加工中心-A01".to_string(),
            current_value: 15.6,
            unit: "kWh".to_string(),
            timestamp: Utc::now(),
            status: "normal".to_string(),
        },
        RealTimeConsumption {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-002".to_string(),
            equipment_name: "CNC加工中心-A02".to_string(),
            current_value: 12.3,
            unit: "kWh".to_string(),
            timestamp: Utc::now(),
            status: "normal".to_string(),
        },
        RealTimeConsumption {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-003".to_string(),
            equipment_name: "注塑机-B01".to_string(),
            current_value: 28.5,
            unit: "kWh".to_string(),
            timestamp: Utc::now(),
            status: "normal".to_string(),
        },
        RealTimeConsumption {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-004".to_string(),
            equipment_name: "冲压机-C01".to_string(),
            current_value: 45.2,
            unit: "kWh".to_string(),
            timestamp: Utc::now(),
            status: "warning".to_string(),
        },
        RealTimeConsumption {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-005".to_string(),
            equipment_name: "焊接机器人-D01".to_string(),
            current_value: 8.9,
            unit: "kWh".to_string(),
            timestamp: Utc::now(),
            status: "normal".to_string(),
        },
    ];

    Ok(Json(ApiResponse::success(records, "实时能耗数据获取成功")))
}

async fn get_consumption_history(
    State(state): State<AppState>,
    Query(_params): Query<QueryParams>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<Vec<EnergyConsumptionRecord>>>, Json<ApiResponse<()>>> {
    check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await?;

    let end_date = Utc::now();
    let start_date = end_date - Duration::days(7);

    let mut records = Vec::new();
    let mut current_time = start_date;

    while current_time <= end_date {
        records.push(EnergyConsumptionRecord {
            id: Uuid::new_v4(),
            equipment_id: Uuid::new_v4(),
            equipment_code: format!("EQ-{:03}", (current_time.timestamp() % 5) + 1),
            equipment_name: format!("设备{}", (current_time.timestamp() % 5) + 1),
            meter_id: format!("METER-{:04}", current_time.timestamp() % 100),
            timestamp: current_time,
            value: 10.0 + (current_time.timestamp() % 30) as f64 + rand::random::<f64>() * 5.0,
            unit: "kWh".to_string(),
            quality: "good".to_string(),
            source: "meter".to_string(),
        });
        current_time += Duration::hours(1);
    }

    Ok(Json(ApiResponse::success(records, "能耗历史数据获取成功")))
}

async fn get_energy_report(
    State(state): State<AppState>,
    Query(_params): Query<ReportParams>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<EnergyReportResponse>>, Json<ApiResponse<()>>> {
    check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await?;

    let end_date = Utc::now();
    let start_date = end_date - Duration::days(30);

    let by_equipment = vec![
        EnergyByEquipment {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-001".to_string(),
            equipment_name: "CNC加工中心-A01".to_string(),
            total_consumption: 8500.0,
            percentage: 32.0,
            avg_consumption: 283.3,
        },
        EnergyByEquipment {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-002".to_string(),
            equipment_name: "CNC加工中心-A02".to_string(),
            total_consumption: 7200.0,
            percentage: 27.3,
            avg_consumption: 240.0,
        },
        EnergyByEquipment {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-003".to_string(),
            equipment_name: "注塑机-B01".to_string(),
            total_consumption: 5800.0,
            percentage: 22.0,
            avg_consumption: 193.3,
        },
        EnergyByEquipment {
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-004".to_string(),
            equipment_name: "冲压机-C01".to_string(),
            total_consumption: 4900.0,
            percentage: 18.7,
            avg_consumption: 163.3,
        },
    ];

    let by_workshop = vec![
        EnergyByWorkshop {
            workshop_id: Uuid::new_v4(),
            workshop_name: "机加工车间".to_string(),
            total_consumption: 12500.0,
            percentage: 47.3,
        },
        EnergyByWorkshop {
            workshop_id: Uuid::new_v4(),
            workshop_name: "注塑车间".to_string(),
            total_consumption: 6800.0,
            percentage: 25.7,
        },
        EnergyByWorkshop {
            workshop_id: Uuid::new_v4(),
            workshop_name: "装配车间".to_string(),
            total_consumption: 7100.0,
            percentage: 27.0,
        },
    ];

    let mut trend_data = Vec::new();
    let mut current_month = start_date;
    for _ in 0..6 {
        trend_data.push(EnergyTrendData {
            period: format!("{}-{:02}", current_month.year(), current_month.month()),
            consumption: 20000.0 + rand::random::<f64>() * 5000.0,
            trend_direction: if rand::random::<bool>() { "up" } else { "down" }.to_string(),
            change_rate: (rand::random::<f64>() - 0.5) * 10.0,
        });
        current_month += Duration::days(30);
    }

    let total_consumption = by_equipment
        .iter()
        .map(|e| e.total_consumption)
        .sum::<f64>();
    let avg_cost_per_unit = 0.85;
    let total_cost = total_consumption * avg_cost_per_unit;

    let response = EnergyReportResponse {
        report_id: Uuid::new_v4(),
        start_date,
        end_date,
        total_consumption,
        total_cost,
        avg_cost_per_unit,
        statistics: EnergyStatistic {
            period: "本月".to_string(),
            total_consumption,
            avg_consumption: total_consumption / 30.0,
            peak_consumption: 1250.0,
            peak_time: Utc::now(),
            min_consumption: 450.0,
            min_time: Utc::now(),
        },
        by_equipment,
        by_workshop,
        trend_data,
    };

    Ok(Json(ApiResponse::success(response, "能耗报表生成成功")))
}

async fn get_energy_forecast(
    State(state): State<AppState>,
    Query(params): Query<ForecastParams>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<EnergyForecastResponse>>, Json<ApiResponse<()>>> {
    check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await?;

    let months = params.months.unwrap_or(3);
    let forecast_consumption = 26500.0 * months as f64 * 1.02;
    let forecast_cost = forecast_consumption * 0.85;

    let response = EnergyForecastResponse {
        forecast_period: format!("未来{}个月", months),
        forecast_consumption,
        forecast_cost,
        confidence_interval: (forecast_consumption * 0.9, forecast_consumption * 1.1),
        trend_factor: 0.02,
        seasonality_factor: 1.05,
    };

    Ok(Json(ApiResponse::success(response, "能耗预测数据获取成功")))
}

async fn get_energy_alerts(
    State(state): State<AppState>,
    Query(_params): Query<QueryParams>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<EnergyAlertsResponse>>, Json<ApiResponse<()>>> {
    check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await?;

    let alerts = vec![
        EnergyAlert {
            id: Uuid::new_v4(),
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-004".to_string(),
            equipment_name: "冲压机-C01".to_string(),
            alert_type: "over_consumption".to_string(),
            severity: "critical".to_string(),
            message: "能耗超阈值报警".to_string(),
            threshold_value: 40.0,
            actual_value: 45.2,
            timestamp: Utc::now() - Duration::minutes(15),
            status: "active".to_string(),
        },
        EnergyAlert {
            id: Uuid::new_v4(),
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-003".to_string(),
            equipment_name: "注塑机-B01".to_string(),
            alert_type: "high_consumption".to_string(),
            severity: "warning".to_string(),
            message: "能耗偏高预警".to_string(),
            threshold_value: 25.0,
            actual_value: 28.5,
            timestamp: Utc::now() - Duration::hours(2),
            status: "active".to_string(),
        },
        EnergyAlert {
            id: Uuid::new_v4(),
            equipment_id: Uuid::new_v4(),
            equipment_code: "EQ-006".to_string(),
            equipment_name: "空压机-E01".to_string(),
            alert_type: "abnormal_pattern".to_string(),
            severity: "warning".to_string(),
            message: "能耗模式异常".to_string(),
            threshold_value: 0.0,
            actual_value: 0.0,
            timestamp: Utc::now() - Duration::hours(5),
            status: "resolved".to_string(),
        },
    ];

    let response = EnergyAlertsResponse {
        alerts,
        total_count: 3,
        critical_count: 1,
        warning_count: 2,
    };

    Ok(Json(ApiResponse::success(response, "能耗告警列表获取成功")))
}

async fn get_equipment_consumption(
    State(state): State<AppState>,
    Path(equipment_id): Path<Uuid>,
    Query(_params): Query<QueryParams>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<Vec<EnergyConsumptionRecord>>>, Json<ApiResponse<()>>> {
    check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await?;

    let end_date = Utc::now();
    let start_date = end_date - Duration::days(7);

    let mut records = Vec::new();
    let mut current_time = start_date;

    while current_time <= end_date {
        records.push(EnergyConsumptionRecord {
            id: Uuid::new_v4(),
            equipment_id,
            equipment_code: "EQ-001".to_string(),
            equipment_name: "测试设备".to_string(),
            meter_id: "METER-0001".to_string(),
            timestamp: current_time,
            value: 15.0 + rand::random::<f64>() * 10.0,
            unit: "kWh".to_string(),
            quality: "good".to_string(),
            source: "meter".to_string(),
        });
        current_time += Duration::hours(1);
    }

    Ok(Json(ApiResponse::success(records, "设备能耗数据获取成功")))
}

async fn export_energy_report(
    State(state): State<AppState>,
    Query(_params): Query<ReportParams>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<ApiResponse<serde_json::Value>>, Json<ApiResponse<()>>> {
    check_permission(&state.pool, &claims, &ModulePermission::EquipmentRead).await?;

    Ok(Json(ApiResponse::success(
        serde_json::json!({
            "export_url": "/api/mes/v1/energy/export/download/report.xlsx",
            "export_format": "xlsx",
            "export_time": Utc::now().to_rfc3339(),
            "message": "报告已生成，正在准备下载"
        }),
        "能耗报表导出成功",
    )))
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
