use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sqlx::FromRow;

/// 报表类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "report_type", rename_all = "lowercase")]
pub enum ReportType {
    Table,
    Chart,
    Dashboard,
    Pdf,
    Excel,
    Custom,
}

/// 报表状态
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "report_status", rename_all = "lowercase")]
pub enum ReportStatus {
    Draft,
    Published,
    Archived,
}

/// 报表模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Report {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub report_type: ReportType,
    pub status: ReportStatus,
    pub template_id: Option<Uuid>,
    pub data_source_id: Option<Uuid>,
    pub config: serde_json::Value,
    pub layout: Option<serde_json::Value>,
    pub schedule_config: Option<serde_json::Value>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_generated_at: Option<DateTime<Utc>>,
    pub is_active: bool,
}

/// 报表数据模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReportData {
    pub id: Uuid,
    pub report_id: Uuid,
    pub data: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
    pub generated_at: DateTime<Utc>,
    pub generated_by: Option<Uuid>,
    pub version: i32,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub format: Option<String>,
}

/// 报表模板模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReportTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub template_type: ReportType,
    pub template_content: serde_json::Value,
    pub default_config: Option<serde_json::Value>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
}

/// 报表定时任务模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReportSchedule {
    pub id: Uuid,
    pub report_id: Uuid,
    pub schedule_type: ScheduleType,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub next_run_at: Option<DateTime<Utc>>,
    pub last_run_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 定时任务类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "schedule_type", rename_all = "lowercase")]
pub enum ScheduleType {
    Cron,
    Interval,
    Once,
}

/// 创建报表请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReport {
    pub name: String,
    pub description: Option<String>,
    pub report_type: ReportType,
    pub template_id: Option<Uuid>,
    pub data_source_id: Option<Uuid>,
    pub config: serde_json::Value,
    pub layout: Option<serde_json::Value>,
    pub created_by: Option<Uuid>,
}

/// 更新报表请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateReport {
    pub name: Option<String>,
    pub description: Option<String>,
    pub report_type: Option<ReportType>,
    pub status: Option<ReportStatus>,
    pub template_id: Option<Uuid>,
    pub data_source_id: Option<Uuid>,
    pub config: Option<serde_json::Value>,
    pub layout: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

/// 生成报表请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateReport {
    pub report_id: Uuid,
    pub parameters: Option<serde_json::Value>,
    pub format: Option<String>,
    pub save_result: Option<bool>,
}

/// 导出报表请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportReport {
    pub report_id: Uuid,
    pub format: ExportFormat,
    pub parameters: Option<serde_json::Value>,
}

/// 导出格式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Pdf,
    Excel,
    Csv,
    Json,
    Html,
}

/// 设置报表定时任务请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetReportSchedule {
    pub report_id: Uuid,
    pub schedule_type: ScheduleType,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub is_active: Option<bool>,
}