//! Audit DTOs (AuditPlan, AuditTask, AuditFinding)

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub audit_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditTaskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub plan_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditFindingQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub plan_id: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditPlan {
    pub id: String,
    pub tenant_id: String,
    pub plan_no: String,
    pub title: String,
    pub audit_type: String,
    pub scope: Option<String>,
    pub standard_id: Option<String>,
    pub status: Option<String>,
    pub scheduled_start: Option<String>,
    pub scheduled_end: Option<String>,
    pub actual_start: Option<String>,
    pub actual_end: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditTask {
    pub id: String,
    pub tenant_id: String,
    pub task_no: String,
    pub plan_id: String,
    pub title: String,
    pub description: Option<String>,
    pub auditor: Option<String>,
    pub status: Option<String>,
    pub completed_at: Option<String>,
    pub finding_count: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditFinding {
    pub id: String,
    pub tenant_id: String,
    pub finding_no: String,
    pub task_id: Option<String>,
    pub plan_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub recommendation: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub verified_at: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateAuditPlanRequest {
    pub title: String,
    pub audit_type: String,
    pub scope: Option<String>,
    pub standard_id: Option<String>,
    pub scheduled_start: Option<String>,
    pub scheduled_end: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateAuditTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub auditor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateAuditFindingRequest {
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub category: Option<String>,
    pub recommendation: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub created_by: Option<String>,
}
