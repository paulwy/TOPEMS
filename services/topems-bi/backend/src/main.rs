use axum::{
    extract::{Extension, FromRef, Path, State},
    routing::{delete, get, post, put},
    Json,
    Router,
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::env;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde_json::json;
use reqwest::Client;

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, Claims, init_logging,
    ServiceHealth, build_health_response, create_api_info_router,
};
use crate::services::permission::{check_permission, BIPermission};

mod services;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SampleStats {
    pub total_samples: i64,
    pub pending_samples: i64,
    pub completed_samples: i64,
    pub rejected_samples: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestStats {
    pub total_tests: i64,
    pub completed_tests: i64,
    pub pending_tests: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstrumentStats {
    pub total_instruments: i64,
    pub active_instruments: i64,
    pub maintenance_instruments: i64,
    pub avg_usage_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LIMSDataSummary {
    pub sample_stats: SampleStats,
    pub test_stats: TestStats,
    pub instrument_stats: InstrumentStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSQualityStats {
    pub total_inspections: i64,
    pub passed_inspections: i64,
    pub failed_inspections: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSIssueStats {
    pub total_issues: i64,
    pub open_issues: i64,
    pub resolved_issues: i64,
    pub overdue_issues: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSActionStats {
    pub total_actions: i64,
    pub completed_actions: i64,
    pub pending_actions: i64,
    pub overdue_actions: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSDataSummary {
    pub quality_stats: QMSQualityStats,
    pub issue_stats: QMSIssueStats,
    pub action_stats: QMSActionStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSRiskStats {
    pub total_risks: i64,
    pub high_risks: i64,
    pub medium_risks: i64,
    pub low_risks: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSInspectionStats {
    pub total_inspections: i64,
    pub passed_inspections: i64,
    pub failed_inspections: i64,
    pub pending_inspections: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSIncidentStats {
    pub total_incidents: i64,
    pub minor_incidents: i64,
    pub major_incidents: i64,
    pub critical_incidents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSDataSummary {
    pub risk_stats: EHSRiskStats,
    pub inspection_stats: EHSInspectionStats,
    pub incident_stats: EHSIncidentStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SRMSupplierStats {
    pub total_suppliers: i64,
    pub active_suppliers: i64,
    pub qualified_suppliers: i64,
    pub avg_rating: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SRMOrderStats {
    pub total_orders: i64,
    pub pending_orders: i64,
    pub completed_orders: i64,
    pub overdue_orders: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SRMDataSummary {
    pub supplier_stats: SRMSupplierStats,
    pub order_stats: SRMOrderStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDMBatchStats {
    pub total_batches: i64,
    pub completed_batches: i64,
    pub in_progress_batches: i64,
    pub cancelled_batches: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDMPerformanceStats {
    pub total_output: f64,
    pub reject_quantity: f64,
    pub pass_rate: f64,
    pub avg_cycle_time: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDMDataSummary {
    pub batch_stats: PDMBatchStats,
    pub performance_stats: PDMPerformanceStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dashboard {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDashboard {
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub report_type: String,
    pub config: serde_json::Value,
    pub data_source: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReport {
    pub name: String,
    pub description: Option<String>,
    pub report_type: String,
    pub config: serde_json::Value,
    pub data_source: Option<String>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStats {
    pub total_projects: i64,
    pub active_projects: i64,
    pub completed_projects: i64,
    pub avg_project_duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentStats {
    pub total_experiments: i64,
    pub completed_experiments: i64,
    pub failed_experiments: i64,
    pub success_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulaStats {
    pub total_formulas: i64,
    pub active_formulas: i64,
    pub deprecated_formulas: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSDataSummary {
    pub project_stats: ProjectStats,
    pub experiment_stats: ExperimentStats,
    pub formula_stats: FormulaStats,
    pub generated_at: String,
}

#[derive(Clone)]
struct AppState {
    dashboards: Arc<Mutex<Vec<Dashboard>>>,
    reports: Arc<Mutex<Vec<Report>>>,
    auth_state: AuthState,
    http_client: Client,
    rs_service_url: String,
    lims_service_url: String,
    qms_service_url: String,
    ehs_service_url: String,
    srm_service_url: String,
    pdm_service_url: String,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    fn new(auth_state: AuthState) -> Self {
        AppState {
            dashboards: Arc::new(Mutex::new(Vec::new())),
            reports: Arc::new(Mutex::new(Vec::new())),
            auth_state,
            http_client: Client::new(),
            rs_service_url: env::var("RS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8020".to_string()),
            lims_service_url: env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8021".to_string()),
            qms_service_url: env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8031".to_string()),
            ehs_service_url: env::var("EHS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8032".to_string()),
            srm_service_url: env::var("SRM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8041".to_string()),
            pdm_service_url: env::var("PDM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8023".to_string()),
        }
    }
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-bi", true)
}

async fn list_dashboards(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let dashboards = state.dashboards.lock().unwrap();
    Json(ApiResponse::success(json!({
        "dashboards": dashboards.clone(),
        "total": dashboards.len()
    }), "获取仪表板列表成功"))
}

async fn create_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateDashboard>,
) -> Json<ApiResponse<Dashboard>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let mut dashboards = state.dashboards.lock().unwrap();

    let dashboard = Dashboard {
        id: Uuid::new_v4(),
        name: payload.name,
        description: payload.description,
        layout: payload.layout,
        created_by: payload.created_by,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    dashboards.push(dashboard.clone());
    Json(ApiResponse::success(dashboard, "创建仪表板成功"))
}

async fn get_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Dashboard>> {
    match check_permission(&claims, &BIPermission::DashboardRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let dashboards = state.dashboards.lock().unwrap();
    if let Some(dashboard) = dashboards.iter().find(|d| d.id == id) {
        Json(ApiResponse::success(dashboard.clone(), "获取仪表板成功"))
    } else {
        Json(ApiResponse::error(404, "仪表板不存在"))
    }
}

async fn update_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateDashboard>,
) -> Json<ApiResponse<Dashboard>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let mut dashboards = state.dashboards.lock().unwrap();
    if let Some(dashboard) = dashboards.iter_mut().find(|d| d.id == id) {
        dashboard.name = payload.name;
        dashboard.description = payload.description;
        dashboard.layout = payload.layout;
        dashboard.updated_at = Utc::now();
        Json(ApiResponse::success(dashboard.clone(), "更新仪表板成功"))
    } else {
        Json(ApiResponse::error(404, "仪表板不存在"))
    }
}

async fn delete_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let mut dashboards = state.dashboards.lock().unwrap();
    let initial_len = dashboards.len();
    dashboards.retain(|d| d.id != id);
    if dashboards.len() < initial_len {
        Json(ApiResponse::success("删除成功".to_string(), "删除仪表板成功"))
    } else {
        Json(ApiResponse::error(404, "仪表板不存在"))
    }
}

async fn list_reports(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::ReportRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let reports = state.reports.lock().unwrap();
    Json(ApiResponse::success(json!({
        "reports": reports.clone(),
        "total": reports.len()
    }), "获取报表列表成功"))
}

async fn create_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateReport>,
) -> Json<ApiResponse<Report>> {
    match check_permission(&claims, &BIPermission::ReportWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let mut reports = state.reports.lock().unwrap();

    let report = Report {
        id: Uuid::new_v4(),
        name: payload.name,
        description: payload.description,
        report_type: payload.report_type,
        config: payload.config,
        data_source: payload.data_source,
        created_by: payload.created_by,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    reports.push(report.clone());
    Json(ApiResponse::success(report, "创建报表成功"))
}

async fn get_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Report>> {
    match check_permission(&claims, &BIPermission::ReportRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let reports = state.reports.lock().unwrap();
    if let Some(report) = reports.iter().find(|r| r.id == id) {
        Json(ApiResponse::success(report.clone(), "获取报表成功"))
    } else {
        Json(ApiResponse::error(404, "报表不存在"))
    }
}

async fn update_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateReport>,
) -> Json<ApiResponse<Report>> {
    match check_permission(&claims, &BIPermission::ReportWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let mut reports = state.reports.lock().unwrap();
    if let Some(report) = reports.iter_mut().find(|r| r.id == id) {
        report.name = payload.name;
        report.description = payload.description;
        report.report_type = payload.report_type;
        report.config = payload.config;
        report.data_source = payload.data_source;
        report.updated_at = Utc::now();
        Json(ApiResponse::success(report.clone(), "更新报表成功"))
    } else {
        Json(ApiResponse::error(404, "报表不存在"))
    }
}

async fn delete_report(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&claims, &BIPermission::ReportWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let mut reports = state.reports.lock().unwrap();
    let initial_len = reports.len();
    reports.retain(|r| r.id != id);
    if reports.len() < initial_len {
        Json(ApiResponse::success("删除成功".to_string(), "删除报表成功"))
    } else {
        Json(ApiResponse::error(404, "报表不存在"))
    }
}

async fn get_analytics_summary(
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    Json(ApiResponse::success(json!({
        "key_metrics": [
            { "title": "生产效率", "value": 85.5, "unit": "%", "change": 2.3, "change_type": "increase", "icon": "📈" },
            { "title": "质量合格率", "value": 98.2, "unit": "%", "change": 0.8, "change_type": "increase", "icon": "✅" },
            { "title": "设备稼动率", "value": 92.3, "unit": "%", "change": -1.2, "change_type": "decrease", "icon": "⚙️" }
        ],
        "recent_activities": [
            { "id": 1, "type": "production", "title": "完成生产订单 PO-2024-001", "time": "10分钟前" },
            { "id": 2, "type": "quality", "title": "质量检验完成，批次 B-001", "time": "25分钟前" }
        ],
        "generated_at": Utc::now().to_rfc3339()
    }), "获取分析摘要成功"))
}

async fn fetch_rs_project_stats(state: &AppState) -> Result<ProjectStats, reqwest::Error> {
    let url = format!("{}/api/v1/projects/stats", state.rs_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(ProjectStats {
            total_projects: data["total_projects"].as_i64().unwrap_or(0),
            active_projects: data["active_projects"].as_i64().unwrap_or(0),
            completed_projects: data["completed_projects"].as_i64().unwrap_or(0),
            avg_project_duration: data["avg_project_duration"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(ProjectStats {
            total_projects: 120,
            active_projects: 45,
            completed_projects: 75,
            avg_project_duration: 45.5,
        })
    }
}

async fn fetch_rs_experiment_stats(state: &AppState) -> Result<ExperimentStats, reqwest::Error> {
    let url = format!("{}/api/v1/experiments/stats", state.rs_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(ExperimentStats {
            total_experiments: data["total_experiments"].as_i64().unwrap_or(0),
            completed_experiments: data["completed_experiments"].as_i64().unwrap_or(0),
            failed_experiments: data["failed_experiments"].as_i64().unwrap_or(0),
            success_rate: data["success_rate"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(ExperimentStats {
            total_experiments: 580,
            completed_experiments: 520,
            failed_experiments: 60,
            success_rate: 89.7,
        })
    }
}

async fn fetch_rs_formula_stats(state: &AppState) -> Result<FormulaStats, reqwest::Error> {
    let url = format!("{}/api/v1/formulas/stats", state.rs_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(FormulaStats {
            total_formulas: data["total_formulas"].as_i64().unwrap_or(0),
            active_formulas: data["active_formulas"].as_i64().unwrap_or(0),
            deprecated_formulas: data["deprecated_formulas"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(FormulaStats {
            total_formulas: 240,
            active_formulas: 180,
            deprecated_formulas: 60,
        })
    }
}

async fn get_rs_data_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<RSDataSummary>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let project_stats = fetch_rs_project_stats(&state).await.unwrap_or(ProjectStats {
        total_projects: 120,
        active_projects: 45,
        completed_projects: 75,
        avg_project_duration: 45.5,
    });

    let experiment_stats = fetch_rs_experiment_stats(&state).await.unwrap_or(ExperimentStats {
        total_experiments: 580,
        completed_experiments: 520,
        failed_experiments: 60,
        success_rate: 89.7,
    });

    let formula_stats = fetch_rs_formula_stats(&state).await.unwrap_or(FormulaStats {
        total_formulas: 240,
        active_formulas: 180,
        deprecated_formulas: 60,
    });

    let summary = RSDataSummary {
        project_stats,
        experiment_stats,
        formula_stats,
        generated_at: Utc::now().to_rfc3339(),
    };

    Json(ApiResponse::success(summary, "获取RS数据摘要成功"))
}

async fn get_rs_project_timeline(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let timeline_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "新项目数",
                "data": [25, 30, 28, 35, 42, 38],
                "borderColor": "#3B82F6",
                "backgroundColor": "rgba(59, 130, 246, 0.1)"
            },
            {
                "label": "完成项目数",
                "data": [20, 25, 22, 30, 35, 32],
                "borderColor": "#10B981",
                "backgroundColor": "rgba(16, 185, 129, 0.1)"
            }
        ]
    });

    Json(ApiResponse::success(timeline_data, "获取项目时间线数据成功"))
}

async fn get_rs_experiment_success_rate(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let chart_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "试验成功率",
                "data": [85.2, 87.5, 89.1, 88.3, 90.5, 89.7],
                "borderColor": "#8B5CF6",
                "backgroundColor": "rgba(139, 92, 246, 0.1)",
                "tension": 0.4
            }
        ]
    });

    Json(ApiResponse::success(chart_data, "获取试验成功率数据成功"))
}

async fn get_rs_material_usage(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let usage_data = json!({
        "labels": ["原材料A", "原材料B", "原材料C", "原材料D", "原材料E"],
        "datasets": [
            {
                "label": "使用量(吨)",
                "data": [1250, 890, 670, 540, 420],
                "backgroundColor": [
                    "rgba(59, 130, 246, 0.8)",
                    "rgba(16, 185, 129, 0.8)",
                    "rgba(245, 158, 11, 0.8)",
                    "rgba(239, 68, 68, 0.8)",
                    "rgba(139, 92, 246, 0.8)"
                ]
            }
        ]
    });

    Json(ApiResponse::success(usage_data, "获取原材料使用数据成功"))
}

async fn get_rs_project_ranking(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let ranking_data = json!({
        "projects": [
            { "id": 1, "name": "新型材料研发项目", "progress": 95, "status": "completed", "team": "研发一组" },
            { "id": 2, "name": "工艺优化项目", "progress": 88, "status": "active", "team": "工艺组" },
            { "id": 3, "name": "质量改进项目", "progress": 72, "status": "active", "team": "质量组" },
            { "id": 4, "name": "设备升级项目", "progress": 65, "status": "active", "team": "设备组" },
            { "id": 5, "name": "环保改造项目", "progress": 45, "status": "active", "team": "EHS组" }
        ]
    });

    Json(ApiResponse::success(ranking_data, "获取项目排行榜数据成功"))
}

async fn fetch_lims_sample_stats(state: &AppState) -> Result<SampleStats, reqwest::Error> {
    let url = format!("{}/api/v1/samples/stats", state.lims_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(SampleStats {
            total_samples: data["total_samples"].as_i64().unwrap_or(0),
            pending_samples: data["pending_samples"].as_i64().unwrap_or(0),
            completed_samples: data["completed_samples"].as_i64().unwrap_or(0),
            rejected_samples: data["rejected_samples"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(SampleStats {
            total_samples: 2450,
            pending_samples: 180,
            completed_samples: 2150,
            rejected_samples: 120,
        })
    }
}

async fn fetch_lims_test_stats(state: &AppState) -> Result<TestStats, reqwest::Error> {
    let url = format!("{}/api/v1/tests/stats", state.lims_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(TestStats {
            total_tests: data["total_tests"].as_i64().unwrap_or(0),
            completed_tests: data["completed_tests"].as_i64().unwrap_or(0),
            pending_tests: data["pending_tests"].as_i64().unwrap_or(0),
            pass_rate: data["pass_rate"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(TestStats {
            total_tests: 8920,
            completed_tests: 8560,
            pending_tests: 360,
            pass_rate: 98.5,
        })
    }
}

async fn fetch_lims_instrument_stats(state: &AppState) -> Result<InstrumentStats, reqwest::Error> {
    let url = format!("{}/api/v1/instruments/stats", state.lims_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(InstrumentStats {
            total_instruments: data["total_instruments"].as_i64().unwrap_or(0),
            active_instruments: data["active_instruments"].as_i64().unwrap_or(0),
            maintenance_instruments: data["maintenance_instruments"].as_i64().unwrap_or(0),
            avg_usage_rate: data["avg_usage_rate"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(InstrumentStats {
            total_instruments: 45,
            active_instruments: 42,
            maintenance_instruments: 3,
            avg_usage_rate: 87.5,
        })
    }
}

async fn get_lims_data_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<LIMSDataSummary>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let sample_stats = fetch_lims_sample_stats(&state).await.unwrap_or(SampleStats {
        total_samples: 2450,
        pending_samples: 180,
        completed_samples: 2150,
        rejected_samples: 120,
    });

    let test_stats = fetch_lims_test_stats(&state).await.unwrap_or(TestStats {
        total_tests: 8920,
        completed_tests: 8560,
        pending_tests: 360,
        pass_rate: 98.5,
    });

    let instrument_stats = fetch_lims_instrument_stats(&state).await.unwrap_or(InstrumentStats {
        total_instruments: 45,
        active_instruments: 42,
        maintenance_instruments: 3,
        avg_usage_rate: 87.5,
    });

    let summary = LIMSDataSummary {
        sample_stats,
        test_stats,
        instrument_stats,
        generated_at: Utc::now().to_rfc3339(),
    };

    Json(ApiResponse::success(summary, "获取LIMS数据摘要成功"))
}

async fn get_lims_sample_timeline(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let timeline_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "接收样品数",
                "data": [420, 380, 450, 520, 480, 550],
                "borderColor": "#3B82F6",
                "backgroundColor": "rgba(59, 130, 246, 0.1)"
            },
            {
                "label": "完成检验数",
                "data": [390, 360, 420, 490, 450, 520],
                "borderColor": "#10B981",
                "backgroundColor": "rgba(16, 185, 129, 0.1)"
            }
        ]
    });

    Json(ApiResponse::success(timeline_data, "获取样品时间线数据成功"))
}

async fn get_lims_test_pass_rate(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let chart_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "检验合格率",
                "data": [97.2, 97.8, 98.1, 98.5, 98.3, 98.7],
                "borderColor": "#10B981",
                "backgroundColor": "rgba(16, 185, 129, 0.1)",
                "tension": 0.4
            }
        ]
    });

    Json(ApiResponse::success(chart_data, "获取检验合格率数据成功"))
}

async fn get_lims_instrument_usage(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let usage_data = json!({
        "labels": ["高效液相色谱仪", "气相色谱仪", "质谱仪", "紫外分光光度计", "原子吸收光谱仪"],
        "datasets": [
            {
                "label": "使用率(%)",
                "data": [92, 88, 85, 78, 82],
                "backgroundColor": [
                    "rgba(59, 130, 246, 0.8)",
                    "rgba(16, 185, 129, 0.8)",
                    "rgba(245, 158, 11, 0.8)",
                    "rgba(239, 68, 68, 0.8)",
                    "rgba(139, 92, 246, 0.8)"
                ]
            }
        ]
    });

    Json(ApiResponse::success(usage_data, "获取仪器使用率数据成功"))
}

async fn get_lims_sample_status_distribution(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let distribution_data = json!({
        "labels": ["待检验", "检验中", "已完成", "不合格"],
        "datasets": [
            {
                "data": [180, 220, 2150, 120],
                "backgroundColor": [
                    "rgba(245, 158, 11, 0.8)",
                    "rgba(59, 130, 246, 0.8)",
                    "rgba(16, 185, 129, 0.8)",
                    "rgba(239, 68, 68, 0.8)"
                ]
            }
        ]
    });

    Json(ApiResponse::success(distribution_data, "获取样品状态分布数据成功"))
}

async fn fetch_qms_quality_stats(state: &AppState) -> Result<QMSQualityStats, reqwest::Error> {
    let url = format!("{}/api/v1/quality/stats", state.qms_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(QMSQualityStats {
            total_inspections: data["total_inspections"].as_i64().unwrap_or(0),
            passed_inspections: data["passed_inspections"].as_i64().unwrap_or(0),
            failed_inspections: data["failed_inspections"].as_i64().unwrap_or(0),
            pass_rate: data["pass_rate"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(QMSQualityStats {
            total_inspections: 3250,
            passed_inspections: 3180,
            failed_inspections: 70,
            pass_rate: 97.8,
        })
    }
}

async fn fetch_qms_issue_stats(state: &AppState) -> Result<QMSIssueStats, reqwest::Error> {
    let url = format!("{}/api/v1/issues/stats", state.qms_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(QMSIssueStats {
            total_issues: data["total_issues"].as_i64().unwrap_or(0),
            open_issues: data["open_issues"].as_i64().unwrap_or(0),
            resolved_issues: data["resolved_issues"].as_i64().unwrap_or(0),
            overdue_issues: data["overdue_issues"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(QMSIssueStats {
            total_issues: 185,
            open_issues: 25,
            resolved_issues: 160,
            overdue_issues: 5,
        })
    }
}

async fn fetch_qms_action_stats(state: &AppState) -> Result<QMSActionStats, reqwest::Error> {
    let url = format!("{}/api/v1/actions/stats", state.qms_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(QMSActionStats {
            total_actions: data["total_actions"].as_i64().unwrap_or(0),
            completed_actions: data["completed_actions"].as_i64().unwrap_or(0),
            pending_actions: data["pending_actions"].as_i64().unwrap_or(0),
            overdue_actions: data["overdue_actions"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(QMSActionStats {
            total_actions: 156,
            completed_actions: 138,
            pending_actions: 18,
            overdue_actions: 3,
        })
    }
}

async fn get_qms_data_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<QMSDataSummary>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let quality_stats = fetch_qms_quality_stats(&state).await.unwrap_or(QMSQualityStats {
        total_inspections: 3250,
        passed_inspections: 3180,
        failed_inspections: 70,
        pass_rate: 97.8,
    });

    let issue_stats = fetch_qms_issue_stats(&state).await.unwrap_or(QMSIssueStats {
        total_issues: 185,
        open_issues: 25,
        resolved_issues: 160,
        overdue_issues: 5,
    });

    let action_stats = fetch_qms_action_stats(&state).await.unwrap_or(QMSActionStats {
        total_actions: 156,
        completed_actions: 138,
        pending_actions: 18,
        overdue_actions: 3,
    });

    let summary = QMSDataSummary {
        quality_stats,
        issue_stats,
        action_stats,
        generated_at: Utc::now().to_rfc3339(),
    };

    Json(ApiResponse::success(summary, "获取QMS数据摘要成功"))
}

async fn get_qms_quality_trend(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let trend_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "合格率(%)",
                "data": [96.5, 97.2, 97.8, 98.1, 97.6, 97.8],
                "borderColor": "#10B981",
                "backgroundColor": "rgba(16, 185, 129, 0.1)",
                "tension": 0.4
            }
        ]
    });

    Json(ApiResponse::success(trend_data, "获取质量趋势数据成功"))
}

async fn get_qms_issue_distribution(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let distribution_data = json!({
        "labels": ["原材料", "工艺", "设备", "人员", "环境"],
        "datasets": [
            {
                "label": "问题数量",
                "data": [45, 58, 32, 28, 22],
                "backgroundColor": [
                    "rgba(59, 130, 246, 0.8)",
                    "rgba(245, 158, 11, 0.8)",
                    "rgba(239, 68, 68, 0.8)",
                    "rgba(139, 92, 246, 0.8)",
                    "rgba(16, 185, 129, 0.8)"
                ]
            }
        ]
    });

    Json(ApiResponse::success(distribution_data, "获取质量问题分布数据成功"))
}

async fn fetch_ehs_risk_stats(state: &AppState) -> Result<EHSRiskStats, reqwest::Error> {
    let url = format!("{}/api/v1/risks/stats", state.ehs_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(EHSRiskStats {
            total_risks: data["total_risks"].as_i64().unwrap_or(0),
            high_risks: data["high_risks"].as_i64().unwrap_or(0),
            medium_risks: data["medium_risks"].as_i64().unwrap_or(0),
            low_risks: data["low_risks"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(EHSRiskStats {
            total_risks: 125,
            high_risks: 15,
            medium_risks: 45,
            low_risks: 65,
        })
    }
}

async fn fetch_ehs_inspection_stats(state: &AppState) -> Result<EHSInspectionStats, reqwest::Error> {
    let url = format!("{}/api/v1/inspections/stats", state.ehs_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(EHSInspectionStats {
            total_inspections: data["total_inspections"].as_i64().unwrap_or(0),
            passed_inspections: data["passed_inspections"].as_i64().unwrap_or(0),
            failed_inspections: data["failed_inspections"].as_i64().unwrap_or(0),
            pending_inspections: data["pending_inspections"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(EHSInspectionStats {
            total_inspections: 280,
            passed_inspections: 245,
            failed_inspections: 25,
            pending_inspections: 10,
        })
    }
}

async fn fetch_ehs_incident_stats(state: &AppState) -> Result<EHSIncidentStats, reqwest::Error> {
    let url = format!("{}/api/v1/incidents/stats", state.ehs_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(EHSIncidentStats {
            total_incidents: data["total_incidents"].as_i64().unwrap_or(0),
            minor_incidents: data["minor_incidents"].as_i64().unwrap_or(0),
            major_incidents: data["major_incidents"].as_i64().unwrap_or(0),
            critical_incidents: data["critical_incidents"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(EHSIncidentStats {
            total_incidents: 18,
            minor_incidents: 12,
            major_incidents: 4,
            critical_incidents: 2,
        })
    }
}

async fn get_ehs_data_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<EHSDataSummary>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let risk_stats = fetch_ehs_risk_stats(&state).await.unwrap_or(EHSRiskStats {
        total_risks: 125,
        high_risks: 15,
        medium_risks: 45,
        low_risks: 65,
    });

    let inspection_stats = fetch_ehs_inspection_stats(&state).await.unwrap_or(EHSInspectionStats {
        total_inspections: 280,
        passed_inspections: 245,
        failed_inspections: 25,
        pending_inspections: 10,
    });

    let incident_stats = fetch_ehs_incident_stats(&state).await.unwrap_or(EHSIncidentStats {
        total_incidents: 18,
        minor_incidents: 12,
        major_incidents: 4,
        critical_incidents: 2,
    });

    let summary = EHSDataSummary {
        risk_stats,
        inspection_stats,
        incident_stats,
        generated_at: Utc::now().to_rfc3339(),
    };

    Json(ApiResponse::success(summary, "获取EHS数据摘要成功"))
}

async fn get_ehs_risk_distribution(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let distribution_data = json!({
        "labels": ["高风险", "中风险", "低风险"],
        "datasets": [
            {
                "data": [15, 45, 65],
                "backgroundColor": [
                    "rgba(239, 68, 68, 0.8)",
                    "rgba(245, 158, 11, 0.8)",
                    "rgba(16, 185, 129, 0.8)"
                ]
            }
        ]
    });

    Json(ApiResponse::success(distribution_data, "获取风险等级分布数据成功"))
}

async fn get_ehs_incident_trend(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let trend_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "事故数",
                "data": [5, 4, 3, 2, 3, 1],
                "borderColor": "#EF4444",
                "backgroundColor": "rgba(239, 68, 68, 0.1)"
            }
        ]
    });

    Json(ApiResponse::success(trend_data, "获取事故趋势数据成功"))
}

async fn fetch_srm_supplier_stats(state: &AppState) -> Result<SRMSupplierStats, reqwest::Error> {
    let url = format!("{}/api/v1/suppliers/stats", state.srm_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(SRMSupplierStats {
            total_suppliers: data["total_suppliers"].as_i64().unwrap_or(0),
            active_suppliers: data["active_suppliers"].as_i64().unwrap_or(0),
            qualified_suppliers: data["qualified_suppliers"].as_i64().unwrap_or(0),
            avg_rating: data["avg_rating"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(SRMSupplierStats {
            total_suppliers: 280,
            active_suppliers: 245,
            qualified_suppliers: 220,
            avg_rating: 4.5,
        })
    }
}

async fn fetch_srm_order_stats(state: &AppState) -> Result<SRMOrderStats, reqwest::Error> {
    let url = format!("{}/api/v1/orders/stats", state.srm_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(SRMOrderStats {
            total_orders: data["total_orders"].as_i64().unwrap_or(0),
            pending_orders: data["pending_orders"].as_i64().unwrap_or(0),
            completed_orders: data["completed_orders"].as_i64().unwrap_or(0),
            overdue_orders: data["overdue_orders"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(SRMOrderStats {
            total_orders: 1250,
            pending_orders: 85,
            completed_orders: 1120,
            overdue_orders: 45,
        })
    }
}

async fn get_srm_data_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<SRMDataSummary>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let supplier_stats = fetch_srm_supplier_stats(&state).await.unwrap_or(SRMSupplierStats {
        total_suppliers: 280,
        active_suppliers: 245,
        qualified_suppliers: 220,
        avg_rating: 4.5,
    });

    let order_stats = fetch_srm_order_stats(&state).await.unwrap_or(SRMOrderStats {
        total_orders: 1250,
        pending_orders: 85,
        completed_orders: 1120,
        overdue_orders: 45,
    });

    let summary = SRMDataSummary {
        supplier_stats,
        order_stats,
        generated_at: Utc::now().to_rfc3339(),
    };

    Json(ApiResponse::success(summary, "获取SRM数据摘要成功"))
}

async fn get_srm_supplier_ranking(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let ranking_data = json!({
        "suppliers": [
            { "id": 1, "name": "鑫源材料科技", "rating": 4.9, "delivery_rate": 99.5, "quality_rate": 99.8 },
            { "id": 2, "name": "恒信化工", "rating": 4.8, "delivery_rate": 98.8, "quality_rate": 99.2 },
            { "id": 3, "name": "鼎盛原料", "rating": 4.7, "delivery_rate": 97.5, "quality_rate": 98.5 },
            { "id": 4, "name": "宏图贸易", "rating": 4.6, "delivery_rate": 96.8, "quality_rate": 98.2 },
            { "id": 5, "name": "伟业物资", "rating": 4.5, "delivery_rate": 95.5, "quality_rate": 97.8 }
        ]
    });

    Json(ApiResponse::success(ranking_data, "获取供应商排行榜数据成功"))
}

async fn get_srm_order_timeline(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let timeline_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "采购订单数",
                "data": [180, 220, 200, 250, 230, 270],
                "borderColor": "#3B82F6",
                "backgroundColor": "rgba(59, 130, 246, 0.1)"
            },
            {
                "label": "完成订单数",
                "data": [165, 205, 185, 235, 215, 255],
                "borderColor": "#10B981",
                "backgroundColor": "rgba(16, 185, 129, 0.1)"
            }
        ]
    });

    Json(ApiResponse::success(timeline_data, "获取采购订单时间线数据成功"))
}

async fn fetch_pdm_batch_stats(state: &AppState) -> Result<PDMBatchStats, reqwest::Error> {
    let url = format!("{}/api/v1/batches/stats", state.pdm_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(PDMBatchStats {
            total_batches: data["total_batches"].as_i64().unwrap_or(0),
            completed_batches: data["completed_batches"].as_i64().unwrap_or(0),
            in_progress_batches: data["in_progress_batches"].as_i64().unwrap_or(0),
            cancelled_batches: data["cancelled_batches"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(PDMBatchStats {
            total_batches: 450,
            completed_batches: 415,
            in_progress_batches: 28,
            cancelled_batches: 7,
        })
    }
}

async fn fetch_pdm_performance_stats(state: &AppState) -> Result<PDMPerformanceStats, reqwest::Error> {
    let url = format!("{}/api/v1/performance/stats", state.pdm_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(PDMPerformanceStats {
            total_output: data["total_output"].as_f64().unwrap_or(0.0),
            reject_quantity: data["reject_quantity"].as_f64().unwrap_or(0.0),
            pass_rate: data["pass_rate"].as_f64().unwrap_or(0.0),
            avg_cycle_time: data["avg_cycle_time"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(PDMPerformanceStats {
            total_output: 12500.0,
            reject_quantity: 185.0,
            pass_rate: 98.5,
            avg_cycle_time: 4.2,
        })
    }
}

async fn get_pdm_data_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<PDMDataSummary>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let batch_stats = fetch_pdm_batch_stats(&state).await.unwrap_or(PDMBatchStats {
        total_batches: 450,
        completed_batches: 415,
        in_progress_batches: 28,
        cancelled_batches: 7,
    });

    let performance_stats = fetch_pdm_performance_stats(&state).await.unwrap_or(PDMPerformanceStats {
        total_output: 12500.0,
        reject_quantity: 185.0,
        pass_rate: 98.5,
        avg_cycle_time: 4.2,
    });

    let summary = PDMDataSummary {
        batch_stats,
        performance_stats,
        generated_at: Utc::now().to_rfc3339(),
    };

    Json(ApiResponse::success(summary, "获取PDM数据摘要成功"))
}

async fn get_pdm_production_trend(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let trend_data = json!({
        "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
        "datasets": [
            {
                "label": "产量(吨)",
                "data": [1850, 2100, 1980, 2350, 2200, 2420],
                "borderColor": "#3B82F6",
                "backgroundColor": "rgba(59, 130, 246, 0.1)"
            },
            {
                "label": "合格率(%)",
                "data": [97.8, 98.2, 98.5, 98.1, 98.6, 98.8],
                "borderColor": "#10B981",
                "backgroundColor": "rgba(16, 185, 129, 0.1)"
            }
        ]
    });

    Json(ApiResponse::success(trend_data, "获取生产趋势数据成功"))
}

async fn get_pdm_batch_status_distribution(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let distribution_data = json!({
        "labels": ["已完成", "进行中", "已取消"],
        "datasets": [
            {
                "data": [415, 28, 7],
                "backgroundColor": [
                    "rgba(16, 185, 129, 0.8)",
                    "rgba(59, 130, 246, 0.8)",
                    "rgba(239, 68, 68, 0.8)"
                ]
            }
        ]
    });

    Json(ApiResponse::success(distribution_data, "获取批次状态分布数据成功"))
}

async fn get_development_analytics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    let rs_data = fetch_rs_project_stats(&state).await.unwrap_or(ProjectStats {
        total_projects: 120,
        active_projects: 45,
        completed_projects: 75,
        avg_project_duration: 45.5,
    });
    
    let analytics = json!({
        "total_projects": rs_data.total_projects,
        "active_projects": rs_data.active_projects,
        "completed_projects": rs_data.completed_projects,
        "project_status_distribution": {
            "in_progress": rs_data.active_projects,
            "pending_approval": 12,
            "completed": rs_data.completed_projects,
            "cancelled": 8
        },
        "monthly_new_projects": [
            { "month": "1月", "count": 18 },
            { "month": "2月", "count": 22 },
            { "month": "3月", "count": 20 },
            { "month": "4月", "count": 25 },
            { "month": "5月", "count": 23 },
            { "month": "6月", "count": 27 }
        ],
        "project_type_distribution": {
            "research": 45,
            "development": 52,
            "improvement": 23
        },
        "generated_at": Utc::now().to_rfc3339()
    });
    
    Json(ApiResponse::success(analytics, "获取研发分析数据成功"))
}

async fn get_quality_analytics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    let qms_data = fetch_qms_quality_stats(&state).await.unwrap_or(QMSQualityStats {
        total_inspections: 3250,
        passed_inspections: 3180,
        failed_inspections: 70,
        pass_rate: 97.8,
    });
    
    let analytics = json!({
        "total_inspections": qms_data.total_inspections,
        "passed_inspections": qms_data.passed_inspections,
        "failed_inspections": qms_data.failed_inspections,
        "pass_rate": qms_data.pass_rate,
        "quality_trend": [
            { "month": "1月", "pass_rate": 96.5 },
            { "month": "2月", "pass_rate": 97.2 },
            { "month": "3月", "pass_rate": 97.8 },
            { "month": "4月", "pass_rate": 98.1 },
            { "month": "5月", "pass_rate": 97.6 },
            { "month": "6月", "pass_rate": 97.8 }
        ],
        "defect_types": {
            "material": 45,
            "process": 58,
            "equipment": 32,
            "other": 22
        },
        "generated_at": Utc::now().to_rfc3339()
    });
    
    Json(ApiResponse::success(analytics, "获取质量分析数据成功"))
}

async fn get_production_analytics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    let pdm_batch_data = fetch_pdm_batch_stats(&state).await.unwrap_or(PDMBatchStats {
        total_batches: 450,
        completed_batches: 415,
        in_progress_batches: 28,
        cancelled_batches: 7,
    });
    
    let pdm_perf_data = fetch_pdm_performance_stats(&state).await.unwrap_or(PDMPerformanceStats {
        total_output: 12500.0,
        reject_quantity: 185.0,
        pass_rate: 98.5,
        avg_cycle_time: 4.2,
    });
    
    let analytics = json!({
        "total_production_batches": pdm_batch_data.total_batches,
        "completed_batches": pdm_batch_data.completed_batches,
        "in_progress_batches": pdm_batch_data.in_progress_batches,
        "production_efficiency": pdm_perf_data.pass_rate,
        "daily_output": [
            { "date": "10-01", "output": 1850 },
            { "date": "10-02", "output": 2100 },
            { "date": "10-03", "output": 1980 },
            { "date": "10-04", "output": 2350 },
            { "date": "10-05", "output": 2200 },
            { "date": "10-06", "output": 2420 },
            { "date": "10-07", "output": 2150 }
        ],
        "product_line_usage": {
            "line_a": 85,
            "line_b": 92,
            "line_c": 78
        },
        "generated_at": Utc::now().to_rfc3339()
    });
    
    Json(ApiResponse::success(analytics, "获取生产分析数据成功"))
}

async fn get_laboratory_analytics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    let lims_sample_data = fetch_lims_sample_stats(&state).await.unwrap_or(SampleStats {
        total_samples: 2450,
        pending_samples: 180,
        completed_samples: 2150,
        rejected_samples: 120,
    });
    
    let lims_test_data = fetch_lims_test_stats(&state).await.unwrap_or(TestStats {
        total_tests: 8920,
        completed_tests: 8560,
        pending_tests: 360,
        pass_rate: 98.5,
    });
    
    let lims_inst_data = fetch_lims_instrument_stats(&state).await.unwrap_or(InstrumentStats {
        total_instruments: 45,
        active_instruments: 42,
        maintenance_instruments: 3,
        avg_usage_rate: 87.5,
    });
    
    let analytics = json!({
        "total_samples": lims_sample_data.total_samples,
        "completed_tests": lims_test_data.completed_tests,
        "pending_tests": lims_test_data.pending_tests,
        "instrument_usage_rate": lims_inst_data.avg_usage_rate,
        "test_type_distribution": {
            "chemical": 3800,
            "physical": 2500,
            "microbiological": 1200,
            "other": 1420
        },
        "turnaround_time": {
            "avg_hours": 24,
            "max_hours": 72,
            "min_hours": 4
        },
        "generated_at": Utc::now().to_rfc3339()
    });
    
    Json(ApiResponse::success(analytics, "获取实验室分析数据成功"))
}

async fn get_analytics_overview(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    let rs_data = fetch_rs_project_stats(&state).await.unwrap_or(ProjectStats {
        total_projects: 120,
        active_projects: 45,
        completed_projects: 75,
        avg_project_duration: 45.5,
    });
    
    let lims_sample_data = fetch_lims_sample_stats(&state).await.unwrap_or(SampleStats {
        total_samples: 2450,
        pending_samples: 180,
        completed_samples: 2150,
        rejected_samples: 120,
    });
    
    let qms_data = fetch_qms_quality_stats(&state).await.unwrap_or(QMSQualityStats {
        total_inspections: 3250,
        passed_inspections: 3180,
        failed_inspections: 70,
        pass_rate: 97.8,
    });
    
    let pdm_batch_data = fetch_pdm_batch_stats(&state).await.unwrap_or(PDMBatchStats {
        total_batches: 450,
        completed_batches: 415,
        in_progress_batches: 28,
        cancelled_batches: 7,
    });
    
    let overview = json!({
        "modules": {
            "rs": {
                "name": "研发管理",
                "total_projects": rs_data.total_projects,
                "active_projects": rs_data.active_projects,
                "completion_rate": ((rs_data.completed_projects as f64 / rs_data.total_projects as f64) * 100.0).round()
            },
            "lims": {
                "name": "实验室管理",
                "total_samples": lims_sample_data.total_samples,
                "pending_samples": lims_sample_data.pending_samples,
                "pass_rate": 98.5
            },
            "qms": {
                "name": "质量管理",
                "total_inspections": qms_data.total_inspections,
                "passed_inspections": qms_data.passed_inspections,
                "pass_rate": qms_data.pass_rate
            },
            "ehs": {
                "name": "安全环保",
                "total_risks": 125,
                "high_risks": 15,
                "incidents": 18
            },
            "srm": {
                "name": "供应链管理",
                "total_suppliers": 280,
                "active_suppliers": 245,
                "avg_rating": 4.5
            },
            "pdm": {
                "name": "生产数据",
                "total_batches": pdm_batch_data.total_batches,
                "completed_batches": pdm_batch_data.completed_batches,
                "efficiency": 98.5
            }
        },
        "key_metrics": [
            { "title": "研发项目数", "value": rs_data.total_projects, "unit": "个", "change": 12, "change_type": "increase", "icon": "📊" },
            { "title": "样品检验数", "value": lims_sample_data.total_samples, "unit": "份", "change": 8, "change_type": "increase", "icon": "🧪" },
            { "title": "生产批次", "value": pdm_batch_data.total_batches, "unit": "批", "change": 5, "change_type": "increase", "icon": "🏭" },
            { "title": "质量合格率", "value": qms_data.pass_rate, "unit": "%", "change": 0.3, "change_type": "increase", "icon": "✅" }
        ],
        "generated_at": Utc::now().to_rfc3339()
    });
    
    Json(ApiResponse::success(overview, "获取分析概览数据成功"))
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-bi");

    let app_state = AppState::new(AuthState::from_env());

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check));

    let protected_routes = Router::new()
        .route("/api/v1/dashboards", get(list_dashboards).post(create_dashboard))
        .route("/api/v1/dashboards/{id}", get(get_dashboard).put(update_dashboard).delete(delete_dashboard))
        .route("/api/v1/reports", get(list_reports).post(create_report))
        .route("/api/v1/reports/{id}", get(get_report).put(update_report).delete(delete_report))
        .route("/api/v1/analytics/summary", get(get_analytics_summary))
        .route("/api/v1/analytics/overview", get(get_analytics_overview))
        .route("/api/v1/analytics/development", get(get_development_analytics))
        .route("/api/v1/analytics/quality", get(get_quality_analytics))
        .route("/api/v1/analytics/production", get(get_production_analytics))
        .route("/api/v1/analytics/laboratory", get(get_laboratory_analytics))
        .route("/api/v1/bi/rs/summary", get(get_rs_data_summary))
        .route("/api/v1/bi/rs/project-timeline", get(get_rs_project_timeline))
        .route("/api/v1/bi/rs/experiment-success-rate", get(get_rs_experiment_success_rate))
        .route("/api/v1/bi/rs/material-usage", get(get_rs_material_usage))
        .route("/api/v1/bi/rs/project-ranking", get(get_rs_project_ranking))
        .route("/api/v1/bi/lims/summary", get(get_lims_data_summary))
        .route("/api/v1/bi/lims/sample-timeline", get(get_lims_sample_timeline))
        .route("/api/v1/bi/lims/test-pass-rate", get(get_lims_test_pass_rate))
        .route("/api/v1/bi/lims/instrument-usage", get(get_lims_instrument_usage))
        .route("/api/v1/bi/lims/sample-status-distribution", get(get_lims_sample_status_distribution))
        .route("/api/v1/bi/qms/summary", get(get_qms_data_summary))
        .route("/api/v1/bi/qms/quality-trend", get(get_qms_quality_trend))
        .route("/api/v1/bi/qms/issue-distribution", get(get_qms_issue_distribution))
        .route("/api/v1/bi/ehs/summary", get(get_ehs_data_summary))
        .route("/api/v1/bi/ehs/risk-distribution", get(get_ehs_risk_distribution))
        .route("/api/v1/bi/ehs/incident-trend", get(get_ehs_incident_trend))
        .route("/api/v1/bi/srm/summary", get(get_srm_data_summary))
        .route("/api/v1/bi/srm/supplier-ranking", get(get_srm_supplier_ranking))
        .route("/api/v1/bi/srm/order-timeline", get(get_srm_order_timeline))
        .route("/api/v1/bi/pdm/summary", get(get_pdm_data_summary))
        .route("/api/v1/bi/pdm/production-trend", get(get_pdm_production_trend))
        .route("/api/v1/bi/pdm/batch-status-distribution", get(get_pdm_batch_status_distribution))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-bi"))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8052".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-BI 数据大屏报表中台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("🔗 RS服务地址: {}", app_state.rs_service_url);
    tracing::info!("🔗 LIMS服务地址: {}", app_state.lims_service_url);
    tracing::info!("🔗 QMS服务地址: {}", app_state.qms_service_url);
    tracing::info!("🔗 EHS服务地址: {}", app_state.ehs_service_url);
    tracing::info!("🔗 SRM服务地址: {}", app_state.srm_service_url);
    tracing::info!("🔗 PDM服务地址: {}", app_state.pdm_service_url);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}