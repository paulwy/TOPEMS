use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MemberRole {
    ProjectManager,
    TechLead,
    Developer,
    Designer,
    Tester,
    Analyst,
    Consultant,
    Client,
    #[default]
    Other,
}

impl std::fmt::Display for MemberRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemberRole::ProjectManager => write!(f, "PROJECT_MANAGER"),
            MemberRole::TechLead => write!(f, "TECH_LEAD"),
            MemberRole::Developer => write!(f, "DEVELOPER"),
            MemberRole::Designer => write!(f, "DESIGNER"),
            MemberRole::Tester => write!(f, "TESTER"),
            MemberRole::Analyst => write!(f, "ANALYST"),
            MemberRole::Consultant => write!(f, "CONSULTANT"),
            MemberRole::Client => write!(f, "CLIENT"),
            MemberRole::Other => write!(f, "OTHER"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MemberStatus {
    #[default]
    Active,
    Inactive,
}

impl std::fmt::Display for MemberStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemberStatus::Active => write!(f, "ACTIVE"),
            MemberStatus::Inactive => write!(f, "INACTIVE"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectMember {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_id: Uuid,
    pub employee_id: Uuid,
    pub role: String,
    pub responsibility: Option<String>,
    pub allocation: f32,
    pub join_date: DateTime<Utc>,
    pub leave_date: Option<DateTime<Utc>>,
    pub status: String,
    pub hourly_rate: Option<f64>,
    pub cost_rate: Option<f64>,
    pub budgeted_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMemberRequest {
    pub project_id: Uuid,
    pub employee_id: Uuid,
    pub role: MemberRole,
    pub responsibility: Option<String>,
    pub allocation: Option<f32>,
    pub join_date: DateTime<Utc>,
    pub hourly_rate: Option<f64>,
    pub cost_rate: Option<f64>,
    pub budgeted_hours: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMemberRequest {
    pub role: Option<MemberRole>,
    pub responsibility: Option<String>,
    pub allocation: Option<f32>,
    pub leave_date: Option<DateTime<Utc>>,
    pub status: Option<MemberStatus>,
    pub hourly_rate: Option<f64>,
    pub cost_rate: Option<f64>,
    pub budgeted_hours: Option<f64>,
    pub actual_hours: Option<f64>,
}
