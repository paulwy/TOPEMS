use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProjectStatus {
    Draft,
    PendingApproval,
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for RiskLevel {
    fn default() -> Self {
        RiskLevel::Medium
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub status: String,
    pub leader: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub progress: i32,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateProjectRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub leader: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub leader: Option<String>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub progress: Option<i32>,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}
