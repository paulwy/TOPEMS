use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectMilestone {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub date: DateTime<Utc>,
    pub status: String,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMilestoneRequest {
    pub name: String,
    pub description: Option<String>,
    pub date: DateTime<Utc>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMilestoneRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
}
