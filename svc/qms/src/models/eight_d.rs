//! 8D Report DTOs

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EightDQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub assignee: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListEightDReportsResponse {
    pub reports: Vec<EightDReport>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct EightDReport {
    pub id: String,
    pub tenant_id: String,
    pub report_no: String,
    pub title: String,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub related_issue_id: Option<String>,
    pub d1_team: Option<String>,
    pub d1_leader: Option<String>,
    pub d2_problem_description: Option<String>,
    pub d3_containment_action: Option<String>,
    pub d3_implemented_at: Option<String>,
    pub d4_root_cause: Option<String>,
    pub d4_cause_analysis: Option<String>,
    pub d5_permanent_action: Option<String>,
    pub d6_verification_result: Option<String>,
    pub d6_verified_at: Option<String>,
    pub d7_preventive_action: Option<String>,
    pub d8_congratulations: Option<String>,
    pub d8_closed_at: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateEightDRequest {
    pub title: String,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub related_issue_id: Option<String>,
    pub d2_problem_description: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateEightDRequest {
    pub title: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub d1_team: Option<String>,
    pub d1_leader: Option<String>,
    pub d2_problem_description: Option<String>,
    pub d3_containment_action: Option<String>,
    pub d4_root_cause: Option<String>,
    pub d4_cause_analysis: Option<String>,
    pub d5_permanent_action: Option<String>,
    pub d6_verification_result: Option<String>,
    pub d7_preventive_action: Option<String>,
    pub d8_congratulations: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EightDStepRequest {
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct EightDAuditLog {
    pub id: String,
    pub tenant_id: String,
    pub report_id: String,
    pub action: String,
    pub step: Option<String>,
    pub operator: Option<String>,
    pub comment: Option<String>,
    pub created_at: Option<String>,
}
