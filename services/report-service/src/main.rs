use axum::{
    extract::State,
    routing::{delete, get, post},
    Json, Router,
};
use tower_http::cors::{Any, CorsLayer};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use chrono::{Utc, DateTime};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportConfig {
    pub report_type: ReportType,
    pub format: ExportFormat,
    pub title: String,
    pub description: Option<String>,
    pub columns: Vec<String>,
    pub date_range: Option<DateRange>,
    pub filters: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReportType {
    RsProjectProgress,
    RsExperimentRecord,
    LimsInspectionStats,
    LimsSampleSummary,
    QmsQualityAnalysis,
    QmsDefectStats,
    EhsSafetyCheck,
    EhsRiskAssessment,
    SrmSupplierEval,
    SrmPurchaseStats,
    PdmProductionStats,
    PdmProcessSummary,
}

impl ReportType {
    pub fn to_string(&self) -> String {
        match self {
            ReportType::RsProjectProgress => "项目进度报表".to_string(),
            ReportType::RsExperimentRecord => "试验记录报表".to_string(),
            ReportType::LimsInspectionStats => "检验统计报表".to_string(),
            ReportType::LimsSampleSummary => "样品汇总报表".to_string(),
            ReportType::QmsQualityAnalysis => "质量分析报表".to_string(),
            ReportType::QmsDefectStats => "不良品统计".to_string(),
            ReportType::EhsSafetyCheck => "安全检查报表".to_string(),
            ReportType::EhsRiskAssessment => "风险评估报表".to_string(),
            ReportType::SrmSupplierEval => "供应商评估报表".to_string(),
            ReportType::SrmPurchaseStats => "采购统计".to_string(),
            ReportType::PdmProductionStats => "生产统计报表".to_string(),
            ReportType::PdmProcessSummary => "工序汇总报表".to_string(),
        }
    }

    pub fn module(&self) -> String {
        match self {
            ReportType::RsProjectProgress | ReportType::RsExperimentRecord => "RS".to_string(),
            ReportType::LimsInspectionStats | ReportType::LimsSampleSummary => "LIMS".to_string(),
            ReportType::QmsQualityAnalysis | ReportType::QmsDefectStats => "QMS".to_string(),
            ReportType::EhsSafetyCheck | ReportType::EhsRiskAssessment => "EHS".to_string(),
            ReportType::SrmSupplierEval | ReportType::SrmPurchaseStats => "SRM".to_string(),
            ReportType::PdmProductionStats | ReportType::PdmProcessSummary => "PDM".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Excel,
    Pdf,
    Csv,
}

impl ExportFormat {
    pub fn extension(&self) -> String {
        match self {
            ExportFormat::Excel => "xlsx".to_string(),
            ExportFormat::Pdf => "pdf".to_string(),
            ExportFormat::Csv => "csv".to_string(),
        }
    }

    pub fn content_type(&self) -> String {
        match self {
            ExportFormat::Excel => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
            ExportFormat::Pdf => "application/pdf".to_string(),
            ExportFormat::Csv => "text/csv; charset=utf-8".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportTemplate {
    pub id: Uuid,
    pub name: String,
    pub report_type: ReportType,
    pub columns: Vec<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportData {
    pub id: Uuid,
    pub config: ReportConfig,
    pub template: Option<ReportTemplate>,
    pub data: Vec<HashMap<String, serde_json::Value>>,
    pub row_count: usize,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReportRequest {
    pub config: ReportConfig,
    pub use_template: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportReportRequest {
    pub format: ExportFormat,
    pub custom_filename: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: String) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(message: String) -> Self {
        ApiResponse {
            code: 500,
            success: false,
            data: None,
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn not_found(message: String) -> Self {
        ApiResponse {
            code: 404,
            success: false,
            data: None,
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Clone)]
struct AppState {
    reports: Arc<Mutex<Vec<ReportData>>>,
    templates: Arc<Mutex<Vec<ReportTemplate>>>,
}

fn generate_sample_data(report_type: &ReportType) -> Vec<HashMap<String, serde_json::Value>> {
    let mut data = Vec::new();
    
    match report_type {
        ReportType::RsProjectProgress => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("项目编号".to_string(), serde_json::json!(format!("RS-{:03}", i)));
                row.insert("项目名称".to_string(), serde_json::json!(format!("研发项目{}", i)));
                row.insert("负责人".to_string(), serde_json::json!(format!("张{}", ['A', 'B', 'C', 'D', 'E'][i-1])));
                row.insert("开始日期".to_string(), serde_json::json!("2026-01-01"));
                row.insert("完成进度".to_string(), serde_json::json!(format!("{}%", 20 * i)));
                row.insert("状态".to_string(), serde_json::json!(if i % 2 == 0 { "进行中" } else { "已完成" }));
                data.push(row);
            }
        },
        ReportType::RsExperimentRecord => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("试验编号".to_string(), serde_json::json!(format!("EXP-{:03}", i)));
                row.insert("试验标题".to_string(), serde_json::json!(format!("试验项目{}", i)));
                row.insert("试验类型".to_string(), serde_json::json!(["小试", "中试", "量产"][i % 3]));
                row.insert("试验日期".to_string(), serde_json::json!("2026-01-15"));
                row.insert("试验员".to_string(), serde_json::json!(format!("李{}", ['A', 'B', 'C', 'D', 'E'][i-1])));
                row.insert("结果".to_string(), serde_json::json!(if i % 2 == 0 { "合格" } else { "待复检" }));
                data.push(row);
            }
        },
        ReportType::LimsInspectionStats => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("检验编号".to_string(), serde_json::json!(format!("LIMS-{:03}", i)));
                row.insert("检验项目".to_string(), serde_json::json!(format!("检验项目{}", i)));
                row.insert("样品数量".to_string(), serde_json::json!(i * 10));
                row.insert("合格数量".to_string(), serde_json::json!(i * 9));
                row.insert("合格率".to_string(), serde_json::json!("90%"));
                row.insert("检验日期".to_string(), serde_json::json!("2026-02-01"));
                data.push(row);
            }
        },
        ReportType::LimsSampleSummary => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("样品编号".to_string(), serde_json::json!(format!("SMP-{:03}", i)));
                row.insert("样品名称".to_string(), serde_json::json!(format!("样品{}", i)));
                row.insert("批次号".to_string(), serde_json::json!(format!("BATCH-2026-{:02}", i)));
                row.insert("接收日期".to_string(), serde_json::json!("2026-02-05"));
                row.insert("检验状态".to_string(), serde_json::json!(["已完成", "进行中", "待检"][i % 3]));
                row.insert("备注".to_string(), serde_json::json!(format!("备注{}", i)));
                data.push(row);
            }
        },
        ReportType::QmsQualityAnalysis => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("分析编号".to_string(), serde_json::json!(format!("QA-{:03}", i)));
                row.insert("产品名称".to_string(), serde_json::json!(format!("产品{}", i)));
                row.insert("批次号".to_string(), serde_json::json!(format!("BATCH-{:03}", i)));
                row.insert("合格率".to_string(), serde_json::json!(format!("{}%", 90 + i)));
                row.insert("不良率".to_string(), serde_json::json!(format!("{}%", 10 - i)));
                row.insert("分析日期".to_string(), serde_json::json!("2026-03-01"));
                data.push(row);
            }
        },
        ReportType::QmsDefectStats => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("不良编号".to_string(), serde_json::json!(format!("DEF-{:03}", i)));
                row.insert("不良类型".to_string(), serde_json::json!(["外观不良", "尺寸不良", "功能不良"][i % 3]));
                row.insert("数量".to_string(), serde_json::json!(i * 5));
                row.insert("占比".to_string(), serde_json::json!(format!("{}%", 10 + i * 5)));
                row.insert("原因分析".to_string(), serde_json::json!(format!("原因{}", i)));
                row.insert("处理措施".to_string(), serde_json::json!(format!("措施{}", i)));
                data.push(row);
            }
        },
        ReportType::EhsSafetyCheck => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("检查编号".to_string(), serde_json::json!(format!("SC-{:03}", i)));
                row.insert("检查项目".to_string(), serde_json::json!(format!("安全检查项{}", i)));
                row.insert("检查区域".to_string(), serde_json::json!(format!("区域{}", ['A', 'B', 'C', 'D', 'E'][i-1])));
                row.insert("检查日期".to_string(), serde_json::json!("2026-03-10"));
                row.insert("检查人".to_string(), serde_json::json!(format!("安全员{}", i)));
                row.insert("检查结果".to_string(), serde_json::json!(if i % 2 == 0 { "合格" } else { "不合格" }));
                data.push(row);
            }
        },
        ReportType::EhsRiskAssessment => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("评估编号".to_string(), serde_json::json!(format!("RA-{:03}", i)));
                row.insert("风险点".to_string(), serde_json::json!(format!("风险点{}", i)));
                row.insert("风险等级".to_string(), serde_json::json!(["低", "中", "高", "极高"][i % 4]));
                row.insert("可能性".to_string(), serde_json::json!(i % 5 + 1));
                row.insert("严重性".to_string(), serde_json::json!(i % 5 + 1));
                row.insert("控制措施".to_string(), serde_json::json!(format!("措施{}", i)));
                data.push(row);
            }
        },
        ReportType::SrmSupplierEval => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("供应商编号".to_string(), serde_json::json!(format!("SUP-{:03}", i)));
                row.insert("供应商名称".to_string(), serde_json::json!(format!("供应商{}", i)));
                row.insert("评估项目".to_string(), serde_json::json!(format!("质量评估{}", i)));
                row.insert("综合评分".to_string(), serde_json::json!(80 + i * 3));
                row.insert("合作等级".to_string(), serde_json::json!(["A级", "B级", "C级"][i % 3]));
                row.insert("评估日期".to_string(), serde_json::json!("2026-03-15"));
                data.push(row);
            }
        },
        ReportType::SrmPurchaseStats => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("采购单号".to_string(), serde_json::json!(format!("PO-{:03}", i)));
                row.insert("供应商".to_string(), serde_json::json!(format!("供应商{}", i)));
                row.insert("物料名称".to_string(), serde_json::json!(format!("物料{}", i)));
                row.insert("采购数量".to_string(), serde_json::json!(i * 100));
                row.insert("采购金额".to_string(), serde_json::json!(format!("¥{}", i * 10000)));
                row.insert("采购日期".to_string(), serde_json::json!("2026-03-20"));
                data.push(row);
            }
        },
        ReportType::PdmProductionStats => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("生产单号".to_string(), serde_json::json!(format!("PRD-{:03}", i)));
                row.insert("产品名称".to_string(), serde_json::json!(format!("产品{}", i)));
                row.insert("计划数量".to_string(), serde_json::json!(i * 1000));
                row.insert("完成数量".to_string(), serde_json::json!(i * 950));
                row.insert("完成率".to_string(), serde_json::json!("95%"));
                row.insert("生产日期".to_string(), serde_json::json!("2026-04-01"));
                data.push(row);
            }
        },
        ReportType::PdmProcessSummary => {
            for i in 1..=5 {
                let mut row = HashMap::new();
                row.insert("工序编号".to_string(), serde_json::json!(format!("PROC-{:03}", i)));
                row.insert("工序名称".to_string(), serde_json::json!(format!("工序{}", i)));
                row.insert("负责人".to_string(), serde_json::json!(format!("工序负责人{}", i)));
                row.insert("加工数量".to_string(), serde_json::json!(i * 200));
                row.insert("合格数量".to_string(), serde_json::json!(i * 190));
                row.insert("合格率".to_string(), serde_json::json!("95%"));
                data.push(row);
            }
        },
    }
    
    data
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_report=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS Report Service starting...");

    let initial_templates = vec![
        ReportTemplate {
            id: Uuid::new_v4(),
            name: "项目进度报表模板".to_string(),
            report_type: ReportType::RsProjectProgress,
            columns: vec![
                "项目编号".to_string(),
                "项目名称".to_string(),
                "负责人".to_string(),
                "开始日期".to_string(),
                "完成进度".to_string(),
                "状态".to_string(),
            ],
            description: Some("用于跟踪研发项目进度".to_string()),
            created_at: Utc::now(),
        },
        ReportTemplate {
            id: Uuid::new_v4(),
            name: "试验记录报表模板".to_string(),
            report_type: ReportType::RsExperimentRecord,
            columns: vec![
                "试验编号".to_string(),
                "试验标题".to_string(),
                "试验类型".to_string(),
                "试验日期".to_string(),
                "试验员".to_string(),
                "结果".to_string(),
            ],
            description: Some("记录试验数据和结果".to_string()),
            created_at: Utc::now(),
        },
    ];

    let state = AppState {
        reports: Arc::new(Mutex::new(Vec::new())),
        templates: Arc::new(Mutex::new(initial_templates)),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/reports", post(create_report))
        .route("/api/v1/reports", get(list_reports))
        .route("/api/v1/reports/:id", get(get_report))
        .route("/api/v1/reports/:id", delete(delete_report))
        .route("/api/v1/reports/:id/export", post(export_report))
        .route("/api/v1/templates", get(list_templates))
        .route("/api/v1/templates", post(create_template))
        .route("/api/v1/report-types", get(list_report_types))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8010".to_string())
        .parse()
        .unwrap_or(8010);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS Report Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS Report Service API\n\nMulti-format report generation and export\n\nCheck out the API at /health"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "TOPEMS Report Service is running!".to_string(),
        "OK".to_string(),
    ))
}

async fn list_report_types() -> Json<ApiResponse<Vec<HashMap<String, String>>>> {
    let report_types = vec![
        HashMap::from([
            ("type".to_string(), "rs_project_progress".to_string()),
            ("name".to_string(), "项目进度报表".to_string()),
            ("module".to_string(), "RS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "rs_experiment_record".to_string()),
            ("name".to_string(), "试验记录报表".to_string()),
            ("module".to_string(), "RS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "lims_inspection_stats".to_string()),
            ("name".to_string(), "检验统计报表".to_string()),
            ("module".to_string(), "LIMS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "lims_sample_summary".to_string()),
            ("name".to_string(), "样品汇总报表".to_string()),
            ("module".to_string(), "LIMS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "qms_quality_analysis".to_string()),
            ("name".to_string(), "质量分析报表".to_string()),
            ("module".to_string(), "QMS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "qms_defect_stats".to_string()),
            ("name".to_string(), "不良品统计".to_string()),
            ("module".to_string(), "QMS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "ehs_safety_check".to_string()),
            ("name".to_string(), "安全检查报表".to_string()),
            ("module".to_string(), "EHS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "ehs_risk_assessment".to_string()),
            ("name".to_string(), "风险评估报表".to_string()),
            ("module".to_string(), "EHS".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "srm_supplier_eval".to_string()),
            ("name".to_string(), "供应商评估报表".to_string()),
            ("module".to_string(), "SRM".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "srm_purchase_stats".to_string()),
            ("name".to_string(), "采购统计".to_string()),
            ("module".to_string(), "SRM".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "pdm_production_stats".to_string()),
            ("name".to_string(), "生产统计报表".to_string()),
            ("module".to_string(), "PDM".to_string()),
        ]),
        HashMap::from([
            ("type".to_string(), "pdm_process_summary".to_string()),
            ("name".to_string(), "工序汇总报表".to_string()),
            ("module".to_string(), "PDM".to_string()),
        ]),
    ];
    
    Json(ApiResponse::success(report_types, "Report types retrieved successfully".to_string()))
}

async fn create_report(
    State(state): State<AppState>,
    Json(req): Json<CreateReportRequest>,
) -> Json<ApiResponse<ReportData>> {
    let template = if let Some(template_id) = req.use_template {
        let templates = state.templates.lock().unwrap();
        templates.iter().find(|t| t.id == template_id).cloned()
    } else {
        None
    };

    let data = generate_sample_data(&req.config.report_type);
    let row_count = data.len();

    let report = ReportData {
        id: Uuid::new_v4(),
        config: req.config.clone(),
        template,
        data,
        row_count,
        created_at: Utc::now(),
    };

    let mut reports = state.reports.lock().unwrap();
    reports.push(report.clone());

    Json(ApiResponse::success(report, "Report created successfully".to_string()))
}

async fn list_reports(State(state): State<AppState>) -> Json<ApiResponse<Vec<ReportData>>> {
    let reports = state.reports.lock().unwrap().clone();
    Json(ApiResponse::success(reports, "Reports retrieved successfully".to_string()))
}

async fn get_report(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<ReportData>> {
    let reports = state.reports.lock().unwrap();
    match reports.iter().find(|r| r.id == id) {
        Some(report) => Json(ApiResponse::success(report.clone(), "Report found".to_string())),
        None => Json(ApiResponse::not_found("Report not found".to_string())),
    }
}

async fn delete_report(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let mut reports = state.reports.lock().unwrap();
    let original_len = reports.len();
    reports.retain(|r| r.id != id);
    if reports.len() < original_len {
        Json(ApiResponse::success(true, "Report deleted successfully".to_string()))
    } else {
        Json(ApiResponse::not_found("Report not found".to_string()))
    }
}

async fn export_report(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<ExportReportRequest>,
) -> Json<ApiResponse<HashMap<String, serde_json::Value>>> {
    let reports = state.reports.lock().unwrap();
    let report = match reports.iter().find(|r| r.id == id) {
        Some(r) => r,
        None => return Json(ApiResponse::not_found("Report not found".to_string())),
    };

    let filename = if let Some(ref custom) = req.custom_filename {
        format!("{}.{}", custom, req.format.extension())
    } else {
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let report_name = report.config.report_type.to_string();
        format!("{}_{}.{}", report_name, timestamp, req.format.extension())
    };

    let mut result = HashMap::new();
    result.insert("filename".to_string(), serde_json::json!(filename));
    result.insert("format".to_string(), serde_json::json!(req.format.extension()));
    result.insert("content_type".to_string(), serde_json::json!(req.format.content_type()));
    result.insert("row_count".to_string(), serde_json::json!(report.row_count));
    result.insert("report_type".to_string(), serde_json::json!(report.config.report_type.to_string()));
    result.insert("download_url".to_string(), serde_json::json!(format!("/api/v1/reports/{}/download/{}", id, filename)));

    Json(ApiResponse::success(result, "Export ready".to_string()))
}

async fn list_templates(State(state): State<AppState>) -> Json<ApiResponse<Vec<ReportTemplate>>> {
    let templates = state.templates.lock().unwrap().clone();
    Json(ApiResponse::success(templates, "Templates retrieved successfully".to_string()))
}

async fn create_template(
    State(state): State<AppState>,
    Json(req): Json<ReportTemplate>,
) -> Json<ApiResponse<ReportTemplate>> {
    let template = ReportTemplate {
        id: Uuid::new_v4(),
        name: req.name,
        report_type: req.report_type,
        columns: req.columns,
        description: req.description,
        created_at: Utc::now(),
    };

    let mut templates = state.templates.lock().unwrap();
    templates.push(template.clone());

    Json(ApiResponse::success(template, "Template created successfully".to_string()))
}
