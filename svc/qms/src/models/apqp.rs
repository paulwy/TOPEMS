//! APQP (Advanced Product Quality Planning) DTOs

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpProjectQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub product_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpProject {
    pub id: String,
    pub tenant_id: String,
    pub project_no: String,
    pub project_name: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub current_phase: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub progress: Option<i32>,
    pub risk_level: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpProjectRequest {
    pub project_name: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub target_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpProjectRequest {
    pub project_name: Option<String>,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub current_phase: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub target_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub progress: Option<i32>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpPhase {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub phase_code: String,
    pub phase_name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub progress: Option<i32>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpPhaseRequest {
    pub project_id: String,
    pub phase_code: String,
    pub phase_name: String,
    pub description: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpPhaseRequest {
    pub phase_name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub actual_start_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub progress: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpTask {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub phase_id: String,
    pub task_name: String,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpTaskQuery {
    pub project_id: Option<String>,
    pub phase_id: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpTaskRequest {
    pub project_id: String,
    pub phase_id: String,
    pub task_name: String,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpTaskRequest {
    pub task_name: Option<String>,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub completed_at: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpRisk {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub risk_name: String,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub rpn: Option<i32>,
    pub status: Option<String>,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpRiskQuery {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub min_rpn: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpRiskRequest {
    pub project_id: String,
    pub risk_name: String,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpRiskRequest {
    pub risk_name: Option<String>,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub status: Option<String>,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpProgressStatistics {
    pub total_phases: i64,
    pub completed_phases: i64,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub overall_progress: f64,
    pub phase_progress: Vec<PhaseProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PhaseProgress {
    pub phase_id: String,
    pub phase_name: String,
    pub phase_code: String,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub progress: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StatusTransitionRequest {
    pub target_status: String,
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpApproval {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub approval_type: String,
    pub status: Option<String>,
    pub applicant: Option<String>,
    pub approver: Option<String>,
    pub comment: Option<String>,
    pub submitted_at: Option<String>,
    pub approved_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpApprovalRequest {
    pub project_id: String,
    pub approval_type: String,
    pub applicant: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProcessApprovalRequest {
    pub approver: String,
    pub approved: bool,
    pub comment: Option<String>,
}
