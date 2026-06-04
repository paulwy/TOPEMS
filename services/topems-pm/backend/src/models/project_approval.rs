use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectApproval {
    pub id: Uuid,
    pub project_id: Uuid,
    pub status: String,
    pub current_step: i32,
    pub total_steps: i32,
    pub approvals: serde_json::Value,
    pub comments: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub project_id: Uuid,
    pub action: String,
    pub comment: Option<String>,
    pub approver_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApprovalStep {
    pub step: i32,
    pub role: String,
    pub approver_id: Option<String>,
    pub approved: bool,
    pub comment: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApprovalHistory {
    pub step: i32,
    pub action: String,
    pub approver_id: String,
    pub comment: Option<String>,
    pub timestamp: DateTime<Utc>,
}
