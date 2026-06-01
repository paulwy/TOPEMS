use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MilestoneStatus {
    Pending,
    Achieved,
    Delayed,
}

impl Default for MilestoneStatus {
    fn default() -> Self {
        MilestoneStatus::Pending
    }
}

impl std::fmt::Display for MilestoneStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MilestoneStatus::Pending => write!(f, "PENDING"),
            MilestoneStatus::Achieved => write!(f, "ACHIEVED"),
            MilestoneStatus::Delayed => write!(f, "DELAYED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectMilestone {
    pub id: Uuid,
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub target_date: DateTime<Utc>,
    pub actual_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMilestoneRequest {
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub target_date: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMilestoneRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub status: Option<MilestoneStatus>,
}
