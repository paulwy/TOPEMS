use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub fn as_str(&self) -> &'static str {
        match self {
            ReportType::RsProjectProgress => "rs_project_progress",
            ReportType::RsExperimentRecord => "rs_experiment_record",
            ReportType::LimsInspectionStats => "lims_inspection_stats",
            ReportType::LimsSampleSummary => "lims_sample_summary",
            ReportType::QmsQualityAnalysis => "qms_quality_analysis",
            ReportType::QmsDefectStats => "qms_defect_stats",
            ReportType::EhsSafetyCheck => "ehs_safety_check",
            ReportType::EhsRiskAssessment => "ehs_risk_assessment",
            ReportType::SrmSupplierEval => "srm_supplier_eval",
            ReportType::SrmPurchaseStats => "srm_purchase_stats",
            ReportType::PdmProductionStats => "pdm_production_stats",
            ReportType::PdmProcessSummary => "pdm_process_summary",
        }
    }

    pub fn module(&self) -> &'static str {
        match self {
            ReportType::RsProjectProgress | ReportType::RsExperimentRecord => "rs",
            ReportType::LimsInspectionStats | ReportType::LimsSampleSummary => "lims",
            ReportType::QmsQualityAnalysis | ReportType::QmsDefectStats => "qms",
            ReportType::EhsSafetyCheck | ReportType::EhsRiskAssessment => "ehs",
            ReportType::SrmSupplierEval | ReportType::SrmPurchaseStats => "srm",
            ReportType::PdmProductionStats | ReportType::PdmProcessSummary => "pdm",
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            ReportType::RsProjectProgress => "研发项目进度报表",
            ReportType::RsExperimentRecord => "实验记录报表",
            ReportType::LimsInspectionStats => "检验统计报表",
            ReportType::LimsSampleSummary => "样品汇总报表",
            ReportType::QmsQualityAnalysis => "质量分析报表",
            ReportType::QmsDefectStats => "缺陷统计报表",
            ReportType::EhsSafetyCheck => "安全检查报表",
            ReportType::EhsRiskAssessment => "风险评估报表",
            ReportType::SrmSupplierEval => "供应商评估报表",
            ReportType::SrmPurchaseStats => "采购统计报表",
            ReportType::PdmProductionStats => "生产统计报表",
            ReportType::PdmProcessSummary => "工艺汇总报表",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Excel,
    Pdf,
    Csv,
}

impl ExportFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            ExportFormat::Excel => "excel",
            ExportFormat::Pdf => "pdf",
            ExportFormat::Csv => "csv",
        }
    }

    pub fn content_type(&self) -> &'static str {
        match self {
            ExportFormat::Excel => {
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
            ExportFormat::Pdf => "application/pdf",
            ExportFormat::Csv => "text/csv",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportConfig {
    pub report_type: String,
    pub format: String,
    pub title: String,
    pub description: Option<String>,
    pub columns: Vec<String>,
    pub date_range: Option<DateRange>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReportTemplate {
    pub id: Uuid,
    pub name: String,
    pub report_type: String,
    pub columns: serde_json::Value,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Report {
    pub id: Uuid,
    pub config: serde_json::Value,
    pub template_id: Option<Uuid>,
    pub data: Option<serde_json::Value>,
    pub row_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReportRequest {
    pub config: ReportConfig,
    pub use_template: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportReportRequest {
    pub format: String,
    pub custom_filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub filename: String,
    pub format: String,
    pub content_type: String,
    pub row_count: i32,
    pub report_type: String,
    pub download_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportTypeInfo {
    #[serde(rename = "type")]
    pub type_: String,
    pub name: String,
    pub module: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_users: i64,
    pub active_users: i64,
    pub total_roles: i64,
    pub total_permissions: i64,
    pub total_companies: i64,
    pub total_departments: i64,
    pub total_employees: i64,
    pub recent_activities: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserGrowthDataPoint {
    pub month: String,
    pub 新增用户: i64,
    pub 活跃用户: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleDistributionDataPoint {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityTypeDataPoint {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportsCenterStats {
    pub dashboard: DashboardStats,
    pub user_growth: Vec<UserGrowthDataPoint>,
    pub role_distribution: Vec<RoleDistributionDataPoint>,
    pub activity_types: Vec<ActivityTypeDataPoint>,
}
