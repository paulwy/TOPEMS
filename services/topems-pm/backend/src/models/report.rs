use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProjectReport {
    pub id: Uuid,
    pub project_id: Uuid,
    pub report_code: Option<String>,
    pub report_name: String,
    pub report_type: String,
    pub report_period: Option<String>,
    pub status: String,
    pub generated_at: Option<DateTime<Utc>>,
    pub data: Option<serde_json::Value>,
    pub summary: Option<String>,
    pub generated_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReportRequest {
    pub report_code: Option<String>,
    pub report_name: String,
    pub report_type: String,
    pub report_period: Option<String>,
    pub generated_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ReportTemplate {
    pub id: Uuid,
    pub template_code: String,
    pub template_name: String,
    pub report_type: String,
    pub content: serde_json::Value,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReportTemplateRequest {
    pub template_code: String,
    pub template_name: String,
    pub report_type: String,
    pub content: serde_json::Value,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReportData {
    pub project_info: Option<serde_json::Value>,
    pub progress: Option<serde_json::Value>,
    pub budget: Option<serde_json::Value>,
    pub risks: Option<serde_json::Value>,
    pub quality: Option<serde_json::Value>,
    pub resources: Option<serde_json::Value>,
    pub milestones: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressReportData {
    pub overall_progress: f64,
    pub phase_progress: Vec<serde_json::Value>,
    pub milestone_status: Vec<serde_json::Value>,
    pub tasks_completed: i64,
    pub tasks_total: i64,
    pub schedule_variance: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CostReportData {
    pub budget_total: f64,
    pub spent_total: f64,
    pub remaining_total: f64,
    pub budget_variance: f64,
    pub category_breakdown: Vec<serde_json::Value>,
    pub contract_payments: Vec<serde_json::Value>,
}