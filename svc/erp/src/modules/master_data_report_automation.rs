//! 治理报告自动化模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块（V48.0 AC-20 Part 2）。
//! 提供主数据治理报告的模板管理、自动生成、调度和统计功能。
//!
//! 功能：
//! - 报告模板 CRUD
//! - 6 种报告类型（质量/成熟度/合规/数据管家/数据资产/高管摘要）
//! - 5 种报告格式（PDF/Excel/HTML/JSON/Markdown）
//! - 报告自动生成（各章节数据聚合）
//! - 报告调度（每日/每周/每月/每季度/每年/按需）
//! - 已生成报告管理
//! - 报告自动化统计

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared::ApiResponse;

// ==================== 报告类型 ====================

/// 报告类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ReportType {
    QualityReport,
    MaturityReport,
    ComplianceReport,
    StewardshipReport,
    DataAssetReport,
    ExecutiveSummary,
}

impl ReportType {
    fn label(&self) -> &'static str {
        match self {
            ReportType::QualityReport => "数据质量报告",
            ReportType::MaturityReport => "治理成熟度报告",
            ReportType::ComplianceReport => "合规报告",
            ReportType::StewardshipReport => "数据管家报告",
            ReportType::DataAssetReport => "数据资产报告",
            ReportType::ExecutiveSummary => "高管摘要",
        }
    }
}

/// 报告频率
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReportFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Yearly,
    OnDemand,
}

impl ReportFrequency {
    fn label(&self) -> &'static str {
        match self {
            ReportFrequency::Daily => "每日",
            ReportFrequency::Weekly => "每周",
            ReportFrequency::Monthly => "每月",
            ReportFrequency::Quarterly => "每季度",
            ReportFrequency::Yearly => "每年",
            ReportFrequency::OnDemand => "按需",
        }
    }
}

/// 报告格式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReportFormat {
    PDF,
    Excel,
    HTML,
    JSON,
    Markdown,
}

impl ReportFormat {
    fn label(&self) -> &'static str {
        match self {
            ReportFormat::PDF => "PDF",
            ReportFormat::Excel => "Excel",
            ReportFormat::HTML => "HTML",
            ReportFormat::JSON => "JSON",
            ReportFormat::Markdown => "Markdown",
        }
    }

    fn extension(&self) -> &'static str {
        match self {
            ReportFormat::PDF => "pdf",
            ReportFormat::Excel => "xlsx",
            ReportFormat::HTML => "html",
            ReportFormat::JSON => "json",
            ReportFormat::Markdown => "md",
        }
    }
}

/// 报告状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReportStatus {
    Pending,
    Generating,
    Completed,
    Failed,
    Delivered,
}

impl ReportStatus {
    fn label(&self) -> &'static str {
        match self {
            ReportStatus::Pending => "待生成",
            ReportStatus::Generating => "生成中",
            ReportStatus::Completed => "已完成",
            ReportStatus::Failed => "失败",
            ReportStatus::Delivered => "已交付",
        }
    }
}

/// 报告调度计划
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportSchedule {
    pub frequency: ReportFrequency,
    pub day_of_week: Option<i32>,
    pub day_of_month: Option<i32>,
    pub time: String,
    pub timezone: String,
    pub next_run_at: String,
}

/// 报告章节
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportSection {
    pub section_id: String,
    pub title: String,
    pub data_source: String,
    pub chart_type: Option<String>,
    pub config: serde_json::Value,
}

/// 报告模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportTemplate {
    pub template_id: String,
    pub name: String,
    pub description: String,
    pub report_type: ReportType,
    pub schedule: Option<ReportSchedule>,
    pub sections: Vec<ReportSection>,
    pub recipients: Vec<String>,
    pub format: ReportFormat,
    pub created_at: String,
}

/// 已生成报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedReport {
    pub report_id: String,
    pub template_id: String,
    pub generated_at: String,
    pub period: String,
    pub status: ReportStatus,
    pub sections_data: HashMap<String, serde_json::Value>,
    pub summary: String,
    pub file_url: Option<String>,
}

/// 报告自动化统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportAutomationStats {
    pub total_templates: usize,
    pub total_generated: usize,
    pub templates_by_type: HashMap<String, usize>,
    pub generated_by_status: HashMap<String, usize>,
    pub scheduled_count: usize,
    pub last_generated: Option<String>,
}

/// 报告模板创建请求
#[derive(Debug, Deserialize)]
pub struct ReportTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub report_type: String,
    pub sections: Vec<ReportSectionRequest>,
    pub recipients: Option<Vec<String>>,
    pub format: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReportSectionRequest {
    pub title: String,
    pub data_source: String,
    pub chart_type: Option<String>,
    pub config: Option<serde_json::Value>,
}

/// 报告生成请求
#[derive(Debug, Deserialize)]
pub struct GenerateReportRequest {
    pub template_id: String,
    pub period: Option<String>,
}

/// 报告调度请求
#[derive(Debug, Deserialize)]
pub struct ScheduleReportRequest {
    pub template_id: String,
    pub frequency: String,
    pub day_of_week: Option<i32>,
    pub day_of_month: Option<i32>,
    pub time: String,
    pub timezone: Option<String>,
}

/// 报告列表查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ReportListQuery {
    pub report_type: Option<String>,
}

/// 已生成报告查询参数
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GeneratedReportQuery {
    pub template_id: Option<String>,
    pub status: Option<String>,
}

fn parse_report_type(s: &str) -> Option<ReportType> {
    match s.to_lowercase().as_str() {
        "quality_report" | "qualityreport" => Some(ReportType::QualityReport),
        "maturity_report" | "maturityreport" => Some(ReportType::MaturityReport),
        "compliance_report" | "compliancereport" => Some(ReportType::ComplianceReport),
        "stewardship_report" | "stewardshipreport" => Some(ReportType::StewardshipReport),
        "data_asset_report" | "dataassetreport" => Some(ReportType::DataAssetReport),
        "executive_summary" | "executivesummary" => Some(ReportType::ExecutiveSummary),
        _ => None,
    }
}

fn parse_report_frequency(s: &str) -> Option<ReportFrequency> {
    match s.to_lowercase().as_str() {
        "daily" => Some(ReportFrequency::Daily),
        "weekly" => Some(ReportFrequency::Weekly),
        "monthly" => Some(ReportFrequency::Monthly),
        "quarterly" => Some(ReportFrequency::Quarterly),
        "yearly" => Some(ReportFrequency::Yearly),
        "on_demand" | "ondemand" => Some(ReportFrequency::OnDemand),
        _ => None,
    }
}

fn parse_report_format(s: &str) -> Option<ReportFormat> {
    match s.to_uppercase().as_str() {
        "PDF" => Some(ReportFormat::PDF),
        "EXCEL" => Some(ReportFormat::Excel),
        "HTML" => Some(ReportFormat::HTML),
        "JSON" => Some(ReportFormat::JSON),
        "MARKDOWN" => Some(ReportFormat::Markdown),
        _ => None,
    }
}

fn calculate_next_run(frequency: &ReportFrequency) -> chrono::DateTime<chrono::Utc> {
    let now = chrono::Utc::now();
    match frequency {
        ReportFrequency::Daily => now + chrono::Duration::days(1),
        ReportFrequency::Weekly => now + chrono::Duration::days(7),
        ReportFrequency::Monthly => now + chrono::Duration::days(30),
        ReportFrequency::Quarterly => now + chrono::Duration::days(90),
        ReportFrequency::Yearly => now + chrono::Duration::days(365),
        ReportFrequency::OnDemand => now,
    }
}

// ==================== 报告自动化存储 ====================

struct ReportAutomationStore {
    templates: tokio::sync::Mutex<Vec<ReportTemplate>>,
    generated: tokio::sync::Mutex<Vec<GeneratedReport>>,
    initialized: tokio::sync::Mutex<bool>,
}

fn get_report_store() -> &'static ReportAutomationStore {
    static STORE: LazyLock<ReportAutomationStore> = LazyLock::new(|| ReportAutomationStore {
        templates: tokio::sync::Mutex::new(Vec::new()),
        generated: tokio::sync::Mutex::new(Vec::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_report_initialized() {
    let store = get_report_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    let now = chrono::Utc::now();
    let rfc = |days_ago: i64| (now - chrono::Duration::days(days_ago)).to_rfc3339();

    // 预置报告模板
    let quality_template = ReportTemplate {
        template_id: "template-001".to_string(),
        name: "月度数据质量报告".to_string(),
        description: "汇总各数据域的质量评分、质量问题分布与改进进展".to_string(),
        report_type: ReportType::QualityReport,
        schedule: Some(ReportSchedule {
            frequency: ReportFrequency::Monthly,
            day_of_week: None,
            day_of_month: Some(1),
            time: "09:00".to_string(),
            timezone: "Asia/Shanghai".to_string(),
            next_run_at: (now + chrono::Duration::days(15)).to_rfc3339(),
        }),
        sections: vec![
            ReportSection {
                section_id: "section-001".to_string(),
                title: "质量评分概览".to_string(),
                data_source: "quality_score".to_string(),
                chart_type: Some("gauge".to_string()),
                config: serde_json::json!({ "target": 90.0 }),
            },
            ReportSection {
                section_id: "section-002".to_string(),
                title: "各域质量分布".to_string(),
                data_source: "quality_by_domain".to_string(),
                chart_type: Some("bar_chart".to_string()),
                config: serde_json::json!({}),
            },
            ReportSection {
                section_id: "section-003".to_string(),
                title: "质量趋势".to_string(),
                data_source: "quality_trend".to_string(),
                chart_type: Some("line_chart".to_string()),
                config: serde_json::json!({ "period": "6_months" }),
            },
        ],
        recipients: vec!["data-governance@company.com".to_string()],
        format: ReportFormat::PDF,
        created_at: rfc(60),
    };

    let maturity_template = ReportTemplate {
        template_id: "template-002".to_string(),
        name: "季度治理成熟度报告".to_string(),
        description: "展示数据治理成熟度评估结果与改进进展".to_string(),
        report_type: ReportType::MaturityReport,
        schedule: Some(ReportSchedule {
            frequency: ReportFrequency::Quarterly,
            day_of_week: None,
            day_of_month: Some(1),
            time: "10:00".to_string(),
            timezone: "Asia/Shanghai".to_string(),
            next_run_at: (now + chrono::Duration::days(45)).to_rfc3339(),
        }),
        sections: vec![
            ReportSection {
                section_id: "section-001".to_string(),
                title: "成熟度评分总览".to_string(),
                data_source: "maturity_score".to_string(),
                chart_type: Some("radar_chart".to_string()),
                config: serde_json::json!({}),
            },
            ReportSection {
                section_id: "section-002".to_string(),
                title: "各维度对比".to_string(),
                data_source: "maturity_dimensions".to_string(),
                chart_type: Some("bar_chart".to_string()),
                config: serde_json::json!({}),
            },
        ],
        recipients: vec![
            "cdo@company.com".to_string(),
            "data-governance@company.com".to_string(),
        ],
        format: ReportFormat::Excel,
        created_at: rfc(90),
    };

    let executive_template = ReportTemplate {
        template_id: "template-003".to_string(),
        name: "高管数据治理摘要".to_string(),
        description: "面向高管的数据治理关键指标摘要报告".to_string(),
        report_type: ReportType::ExecutiveSummary,
        schedule: Some(ReportSchedule {
            frequency: ReportFrequency::Weekly,
            day_of_week: Some(1),
            day_of_month: None,
            time: "08:00".to_string(),
            timezone: "Asia/Shanghai".to_string(),
            next_run_at: (now + chrono::Duration::days(3)).to_rfc3339(),
        }),
        sections: vec![
            ReportSection {
                section_id: "section-001".to_string(),
                title: "关键指标".to_string(),
                data_source: "kpi_summary".to_string(),
                chart_type: Some("kpi_card".to_string()),
                config: serde_json::json!({}),
            },
            ReportSection {
                section_id: "section-002".to_string(),
                title: "风险与进展".to_string(),
                data_source: "risk_progress".to_string(),
                chart_type: None,
                config: serde_json::json!({}),
            },
        ],
        recipients: vec!["executive@company.com".to_string()],
        format: ReportFormat::HTML,
        created_at: rfc(30),
    };

    let mut templates = store.templates.lock().await;
    templates.push(quality_template);
    templates.push(maturity_template);
    templates.push(executive_template);

    // 预置已生成报告
    let mut generated = store.generated.lock().await;
    let mut sections_data_1 = HashMap::new();
    sections_data_1.insert(
        "section-001".to_string(),
        serde_json::json!({ "score": 88.5 }),
    );
    sections_data_1.insert(
        "section-002".to_string(),
        serde_json::json!({ "customer": 92.5, "supplier": 85.0, "material": 95.0 }),
    );
    generated.push(GeneratedReport {
        report_id: "report-001".to_string(),
        template_id: "template-001".to_string(),
        generated_at: rfc(1),
        period: "2026-06".to_string(),
        status: ReportStatus::Delivered,
        sections_data: sections_data_1,
        summary: "本月数据质量评分 88.5 分，环比提升 3.3 分，达到目标值 90 分的 98.3%。"
            .to_string(),
        file_url: Some("/reports/2026-06/quality-report.pdf".to_string()),
    });

    let mut sections_data_2 = HashMap::new();
    sections_data_2.insert(
        "section-001".to_string(),
        serde_json::json!({ "total_records": 5780, "quality_score": 88.5 }),
    );
    generated.push(GeneratedReport {
        report_id: "report-002".to_string(),
        template_id: "template-003".to_string(),
        generated_at: rfc(3),
        period: "2026-W28".to_string(),
        status: ReportStatus::Completed,
        sections_data: sections_data_2,
        summary: "本周数据治理运行平稳，质量评分持续提升。".to_string(),
        file_url: Some("/reports/2026-W28/executive-summary.html".to_string()),
    });

    *initialized = true;
}

/// 创建报告模板
async fn create_report_template(req: &ReportTemplateRequest) -> ReportTemplate {
    ensure_report_initialized().await;
    let store = get_report_store();
    let mut templates = store.templates.lock().await;
    let id = format!("template-{:03}", templates.len() + 1);
    let now = chrono::Utc::now().to_rfc3339();
    let sections: Vec<ReportSection> = req
        .sections
        .iter()
        .enumerate()
        .map(|(i, s)| ReportSection {
            section_id: format!("section-{:03}", i + 1),
            title: s.title.clone(),
            data_source: s.data_source.clone(),
            chart_type: s.chart_type.clone(),
            config: s.config.clone().unwrap_or(serde_json::json!({})),
        })
        .collect();
    let template = ReportTemplate {
        template_id: id,
        name: req.name.clone(),
        description: req.description.clone().unwrap_or_default(),
        report_type: parse_report_type(&req.report_type).unwrap_or(ReportType::QualityReport),
        schedule: None,
        sections,
        recipients: req.recipients.clone().unwrap_or_default(),
        format: req
            .format
            .as_deref()
            .and_then(parse_report_format)
            .unwrap_or(ReportFormat::PDF),
        created_at: now,
    };
    templates.push(template.clone());
    template
}

/// 获取报告模板
async fn get_report_template(template_id: &str) -> Option<ReportTemplate> {
    ensure_report_initialized().await;
    let store = get_report_store();
    let templates = store.templates.lock().await;
    templates
        .iter()
        .find(|t| t.template_id == template_id)
        .cloned()
}

/// 列出报告模板
async fn list_report_templates(report_type: Option<&str>) -> Vec<ReportTemplate> {
    ensure_report_initialized().await;
    let store = get_report_store();
    let templates = store.templates.lock().await.clone();
    match report_type {
        Some(rt) => templates
            .into_iter()
            .filter(|t| {
                let t_str = serde_json::to_string(&t.report_type).unwrap_or_default();
                t_str.contains(rt)
            })
            .collect(),
        None => templates,
    }
}

/// 生成报告
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/reports/generate",
    responses(
        (status = 200, description = "generate_report OK")
    ),
    tag = "ERP/master_data_report_automation"
)]
pub async fn generate_report(req: &GenerateReportRequest) -> Option<GeneratedReport> {
    ensure_report_initialized().await;
    let store = get_report_store();
    let template_clone = {
        let templates = store.templates.lock().await;
        templates
            .iter()
            .find(|t| t.template_id == req.template_id)?
            .clone()
    };

    let now = chrono::Utc::now().to_rfc3339();
    let period = req.period.clone().unwrap_or_else(|| now[..7].to_string());

    let mut sections_data: HashMap<String, serde_json::Value> = HashMap::new();
    for section in &template_clone.sections {
        let data = match section.data_source.as_str() {
            "quality_score" => serde_json::json!({
                "score": 88.5,
                "target": 90.0,
                "trend": 3.3
            }),
            "quality_by_domain" => serde_json::json!({
                "customer": 92.5,
                "supplier": 85.0,
                "material": 95.0,
                "product": 90.2
            }),
            "quality_trend" => serde_json::json!({
                "months": ["1月", "2月", "3月", "4月", "5月", "6月"],
                "scores": [82.0, 84.5, 85.2, 86.0, 87.3, 88.5]
            }),
            "maturity_score" => serde_json::json!({
                "overall": 48.0,
                "level": "initial"
            }),
            "maturity_dimensions" => serde_json::json!({
                "dimensions": ["数据质量", "数据安全", "数据架构", "数据集成", "数据管家"],
                "scores": [55, 65, 48, 42, 30]
            }),
            "kpi_summary" => serde_json::json!({
                "total_records": 5780,
                "quality_score": 88.5,
                "active_domains": 8,
                "open_issues": 12
            }),
            "risk_progress" => serde_json::json!({
                "high_risk": 2,
                "medium_risk": 5,
                "low_risk": 12,
                "resolved": 18
            }),
            _ => serde_json::json!({ "message": "数据源未配置" }),
        };
        sections_data.insert(section.section_id.clone(), data);
    }

    let summary = match template_clone.report_type {
        ReportType::QualityReport => "数据质量评分 88.5 分，环比提升 3.3 分。".to_string(),
        ReportType::MaturityReport => "治理成熟度整体评分 48.0 分，处于初始级。".to_string(),
        ReportType::ComplianceReport => "合规检查完成，合规率 85.2%。".to_string(),
        ReportType::StewardshipReport => "数据管家工作进展正常，本周处理工单 15 项。".to_string(),
        ReportType::DataAssetReport => "数据资产共 8 个域，5780 条主数据。".to_string(),
        ReportType::ExecutiveSummary => "数据治理运行平稳，关键指标持续改善。".to_string(),
    };

    let file_url = format!(
        "/reports/{}/{}-{}.{}",
        period,
        template_clone.template_id,
        chrono::Utc::now().timestamp(),
        template_clone.format.extension()
    );

    let report = GeneratedReport {
        report_id: format!("report-{:03}", store.generated.lock().await.len() + 1),
        template_id: template_clone.template_id.clone(),
        generated_at: now,
        period,
        status: ReportStatus::Completed,
        sections_data,
        summary,
        file_url: Some(file_url),
    };

    store.generated.lock().await.push(report.clone());
    Some(report)
}

/// 获取已生成报告
async fn get_generated_report(report_id: &str) -> Option<GeneratedReport> {
    ensure_report_initialized().await;
    let store = get_report_store();
    let generated = store.generated.lock().await;
    generated.iter().find(|r| r.report_id == report_id).cloned()
}

/// 列出已生成报告
async fn list_generated_reports(
    template_id: Option<&str>,
    status: Option<&str>,
) -> Vec<GeneratedReport> {
    ensure_report_initialized().await;
    let store = get_report_store();
    let generated = store.generated.lock().await.clone();
    generated
        .into_iter()
        .filter(|r| {
            if let Some(tid) = template_id {
                if r.template_id != tid {
                    return false;
                }
            }
            if let Some(s) = status {
                let s_str = serde_json::to_string(&r.status).unwrap_or_default();
                if !s_str.contains(s) {
                    return false;
                }
            }
            true
        })
        .collect()
}

/// 调度报告
async fn schedule_report(req: &ScheduleReportRequest) -> Option<ReportTemplate> {
    ensure_report_initialized().await;
    let store = get_report_store();
    let mut templates = store.templates.lock().await;
    let template = templates
        .iter_mut()
        .find(|t| t.template_id == req.template_id)?;
    let frequency = parse_report_frequency(&req.frequency).unwrap_or(ReportFrequency::OnDemand);
    let next_run = calculate_next_run(&frequency);
    template.schedule = Some(ReportSchedule {
        frequency: frequency.clone(),
        day_of_week: req.day_of_week,
        day_of_month: req.day_of_month,
        time: req.time.clone(),
        timezone: req
            .timezone
            .clone()
            .unwrap_or_else(|| "Asia/Shanghai".to_string()),
        next_run_at: next_run.to_rfc3339(),
    });
    Some(template.clone())
}

/// 获取报告调度计划
async fn get_report_schedule(template_id: &str) -> Option<ReportSchedule> {
    ensure_report_initialized().await;
    let store = get_report_store();
    let templates = store.templates.lock().await;
    let template = templates.iter().find(|t| t.template_id == template_id)?;
    template.schedule.clone()
}

/// 获取报告自动化统计
async fn get_report_automation_stats() -> ReportAutomationStats {
    ensure_report_initialized().await;
    let store = get_report_store();
    let templates = store.templates.lock().await.clone();
    let generated = store.generated.lock().await.clone();

    let mut templates_by_type: HashMap<String, usize> = HashMap::new();
    for t in &templates {
        *templates_by_type
            .entry(t.report_type.label().to_string())
            .or_insert(0) += 1;
    }
    let mut generated_by_status: HashMap<String, usize> = HashMap::new();
    for g in &generated {
        *generated_by_status
            .entry(g.status.label().to_string())
            .or_insert(0) += 1;
    }
    let scheduled_count = templates.iter().filter(|t| t.schedule.is_some()).count();
    let last_generated = generated.iter().map(|g| g.generated_at.clone()).max();

    ReportAutomationStats {
        total_templates: templates.len(),
        total_generated: generated.len(),
        templates_by_type,
        generated_by_status,
        scheduled_count,
        last_generated,
    }
}

// ==================== 报告自动化 Handlers ====================

/// GET /reports/templates — 列出报告模板
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/list-report-templates-handler",
    tag = "MasterDataRefs",
    operation_id = "list_report_templates_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_report_templates_handler(
    State(state): State<ApiState>,
    Query(params): Query<ReportListQuery>,
) -> Json<ApiResponse<Vec<ReportTemplate>>> {
    let _ = &state;
    let templates = list_report_templates(params.report_type.as_deref()).await;
    Json(ApiResponse::success(templates, "报告模板列表获取成功"))
}

/// POST /reports/templates — 创建报告模板
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/master-data-refs/reports/templates",
    tag = "Master Data",
    operation_id = "create_report_template_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_report_template_handler(
    State(state): State<ApiState>,
    Json(req): Json<ReportTemplateRequest>,
) -> Json<ApiResponse<ReportTemplate>> {
    let _ = &state;
    let template = create_report_template(&req).await;
    Json(ApiResponse::success(template, "报告模板创建成功"))
}

/// GET /reports/templates/{template_id} — 获取报告模板
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/reports/templates/{template_id}",
    tag = "Master Data",
    operation_id = "get_report_template_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_report_template_handler(
    State(state): State<ApiState>,
    Path(template_id): Path<String>,
) -> Json<ApiResponse<ReportTemplate>> {
    let _ = &state;
    match get_report_template(&template_id).await {
        Some(template) => Json(ApiResponse::success(template, "报告模板获取成功")),
        None => Json(ApiResponse::error(404, "未找到报告模板")),
    }
}

/// POST /reports/generate — 生成报告
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/reports/generate",
    tag = "Master Data",
    operation_id = "generate_report_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn generate_report_handler(
    State(state): State<ApiState>,
    Json(req): Json<GenerateReportRequest>,
) -> Json<ApiResponse<GeneratedReport>> {
    let _ = &state;
    match generate_report(&req).await {
        Some(report) => Json(ApiResponse::success(report, "报告生成成功")),
        None => Json(ApiResponse::error(404, "未找到报告模板")),
    }
}

/// GET /reports/generated — 列出已生成报告
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/list-generated-reports-handler",
    tag = "MasterDataRefs",
    operation_id = "list_generated_reports_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_generated_reports_handler(
    State(state): State<ApiState>,
    Query(params): Query<GeneratedReportQuery>,
) -> Json<ApiResponse<Vec<GeneratedReport>>> {
    let _ = &state;
    let reports =
        list_generated_reports(params.template_id.as_deref(), params.status.as_deref()).await;
    Json(ApiResponse::success(reports, "已生成报告列表获取成功"))
}

/// GET /reports/generated/{report_id} — 获取已生成报告
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/reports/generated/{report_id}",
    tag = "Master Data",
    operation_id = "get_generated_report_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_generated_report_handler(
    State(state): State<ApiState>,
    Path(report_id): Path<String>,
) -> Json<ApiResponse<GeneratedReport>> {
    let _ = &state;
    match get_generated_report(&report_id).await {
        Some(report) => Json(ApiResponse::success(report, "已生成报告获取成功")),
        None => Json(ApiResponse::error(404, "未找到报告")),
    }
}

/// POST /reports/schedule — 调度报告
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/reports/schedule",
    tag = "Master Data",
    operation_id = "schedule_report_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn schedule_report_handler(
    State(state): State<ApiState>,
    Json(req): Json<ScheduleReportRequest>,
) -> Json<ApiResponse<ReportTemplate>> {
    let _ = &state;
    match schedule_report(&req).await {
        Some(template) => Json(ApiResponse::success(template, "报告调度成功")),
        None => Json(ApiResponse::error(404, "未找到报告模板")),
    }
}

/// GET /reports/schedule/{template_id} — 获取报告调度计划
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/reports/schedule/{template_id}",
    tag = "Master Data",
    operation_id = "get_report_schedule_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_report_schedule_handler(
    State(state): State<ApiState>,
    Path(template_id): Path<String>,
) -> Json<ApiResponse<ReportSchedule>> {
    let _ = &state;
    match get_report_schedule(&template_id).await {
        Some(schedule) => Json(ApiResponse::success(schedule, "报告调度计划获取成功")),
        None => Json(ApiResponse::error(404, "未找到报告调度计划")),
    }
}

/// GET /reports/stats — 获取报告自动化统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/reports/stats",
    tag = "Master Data",
    operation_id = "get_report_automation_stats_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_report_automation_stats_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<ReportAutomationStats>> {
    let _ = &state;
    let stats = get_report_automation_stats().await;
    Json(ApiResponse::success(stats, "报告自动化统计获取成功"))
}
