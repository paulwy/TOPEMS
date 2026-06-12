use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PhaseStatus {
    #[default]
    NotStarted,
    InProgress,
    Completed,
    Delayed,
}

impl std::fmt::Display for PhaseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PhaseStatus::NotStarted => write!(f, "NOT_STARTED"),
            PhaseStatus::InProgress => write!(f, "IN_PROGRESS"),
            PhaseStatus::Completed => write!(f, "COMPLETED"),
            PhaseStatus::Delayed => write!(f, "DELAYED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectPhase {
    pub id: Uuid,
    pub project_id: Uuid,
    pub phase_number: i32,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub planned_duration_days: Option<i32>,
    pub actual_duration_days: Option<i32>,
    pub status: String,
    pub progress: i32,
    pub weight: i32,
    pub predecessor_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreatePhaseRequest {
    pub project_id: Uuid,
    pub phase_number: i32,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub weight: Option<i32>,
    pub predecessor_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdatePhaseRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<PhaseStatus>,
    pub progress: Option<i32>,
    pub weight: Option<i32>,
    pub predecessor_id: Option<Uuid>,
}
