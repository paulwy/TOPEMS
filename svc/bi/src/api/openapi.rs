#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RsSummary {
    pub total_projects: i64,
    pub active_projects: i64,
    pub completed_projects: i64,
    pub avg_duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RsProjectTimeline {
    pub month: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RsExperimentSuccessRate {
    pub month: String,
    pub rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RsModuleData {
    pub summary: RsSummary,
    pub timeline: Vec<RsProjectTimeline>,
    pub success_rate: Vec<RsExperimentSuccessRate>,
    pub distribution: Vec<DistributionItem>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LimsSummary {
    pub total_samples: i64,
    pub completed_tests: i64,
    pub pending_tests: i64,
    pub avg_turnaround: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LimsSampleTimeline {
    pub month: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LimsTestPassRate {
    pub month: String,
    pub rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LimsModuleData {
    pub summary: LimsSummary,
    pub timeline: Vec<LimsSampleTimeline>,
    pub pass_rate: Vec<LimsTestPassRate>,
    pub distribution: Vec<DistributionItem>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QmsSummary {
    pub total_inspections: i64,
    pub passed: i64,
    pub failed: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QmsQualityTrend {
    pub month: String,
    pub rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QmsIssueDistribution {
    pub name: String,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QmsModuleData {
    pub summary: QmsSummary,
    pub quality_trend: Vec<QmsQualityTrend>,
    pub issue_distribution: Vec<QmsIssueDistribution>,
    pub distribution: Vec<DistributionItem>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EhsSummary {
    pub total_risks: i64,
    pub high_risks: i64,
    pub incidents: i64,
    pub resolved: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EhsRiskDistribution {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EhsIncidentTrend {
    pub month: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EhsModuleData {
    pub summary: EhsSummary,
    pub risk_distribution: Vec<EhsRiskDistribution>,
    pub incident_trend: Vec<EhsIncidentTrend>,
    pub distribution: Vec<DistributionItem>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SrmSummary {
    pub total_suppliers: i64,
    pub qualified: i64,
    pub avg_rating: f64,
    pub pending_orders: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SrmSupplierRanking {
    pub name: String,
    pub rating: f64,
    pub orders: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SrmOrderTimeline {
    pub month: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SrmModuleData {
    pub summary: SrmSummary,
    pub supplier_ranking: Vec<SrmSupplierRanking>,
    pub order_timeline: Vec<SrmOrderTimeline>,
    pub distribution: Vec<DistributionItem>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PdmSummary {
    pub total_batches: i64,
    pub completed: i64,
    pub in_progress: i64,
    pub efficiency: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PdmProductionTrend {
    pub month: String,
    pub output: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PdmBatchStatusDistribution {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PdmModuleData {
    pub summary: PdmSummary,
    pub production_trend: Vec<PdmProductionTrend>,
    pub batch_status_distribution: Vec<PdmBatchStatusDistribution>,
    pub distribution: Vec<DistributionItem>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DistributionItem {
    pub name: String,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AnalyticsSummary {
    pub key_metrics: Vec<KeyMetric>,
    pub recent_activities: Vec<Activity>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct KeyMetric {
    pub title: String,
    pub value: f64,
    pub unit: String,
    pub change: f64,
    pub change_type: String,
    pub icon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Activity {
    pub id: i64,
    #[serde(rename = "type")]
    pub activity_type: String,
    pub title: String,
    pub time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BiOverview {
    pub modules: ModuleOverview,
    pub key_metrics: Vec<KeyMetric>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ModuleOverview {
    pub rs: RsOverview,
    pub lims: LimsOverview,
    pub qms: QmsOverview,
    pub ehs: EhsOverview,
    pub srm: SrmOverview,
    pub pdm: PdmOverview,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RsOverview {
    pub name: String,
    pub total_projects: i64,
    pub active_projects: i64,
    pub completion_rate: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LimsOverview {
    pub name: String,
    pub total_samples: i64,
    pub pending_samples: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QmsOverview {
    pub name: String,
    pub total_inspections: i64,
    pub passed_inspections: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EhsOverview {
    pub name: String,
    pub total_risks: i64,
    pub high_risks: i64,
    pub incidents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SrmOverview {
    pub name: String,
    pub total_suppliers: i64,
    pub active_suppliers: i64,
    pub avg_rating: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PdmOverview {
    pub name: String,
    pub total_batches: i64,
    pub completed_batches: i64,
    pub efficiency: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS BI API",
        version = "1.0.0",
        description = "TOPEMS 数据大屏报表中台 API - 提供研发、实验室、质量、安全、供应链、生产等模块的数据分析功能"
    ),
    components(
        schemas(
            RsSummary,
            RsProjectTimeline,
            RsExperimentSuccessRate,
            RsModuleData,
            LimsSummary,
            LimsSampleTimeline,
            LimsTestPassRate,
            LimsModuleData,
            QmsSummary,
            QmsQualityTrend,
            QmsIssueDistribution,
            QmsModuleData,
            EhsSummary,
            EhsRiskDistribution,
            EhsIncidentTrend,
            EhsModuleData,
            SrmSummary,
            SrmSupplierRanking,
            SrmOrderTimeline,
            SrmModuleData,
            PdmSummary,
            PdmProductionTrend,
            PdmBatchStatusDistribution,
            PdmModuleData,
            DistributionItem,
            AnalyticsSummary,
            KeyMetric,
            Activity,
            BiOverview,
            ModuleOverview,
            RsOverview,
            LimsOverview,
            QmsOverview,
            EhsOverview,
            SrmOverview,
            PdmOverview,
        ),
    ),
    tags(
        (name = "analytics", description = "分析概览 API"),
        (name = "rs", description = "研发管理模块数据 API"),
        (name = "lims", description = "实验室管理模块数据 API"),
        (name = "qms", description = "质量管理模块数据 API"),
        (name = "ehs", description = "安全环保模块数据 API"),
        (name = "srm", description = "供应链管理模块数据 API"),
        (name = "pdm", description = "生产数据模块数据 API"),
    ),
)]
pub struct BiApiDoc;
