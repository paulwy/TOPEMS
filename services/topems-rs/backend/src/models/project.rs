use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Encode, FromRow, Postgres, Type};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProjectType {
    RD,
    Production,
    Design,
    Construction,
    Service,
}

impl Default for ProjectType {
    fn default() -> Self {
        ProjectType::RD
    }
}

impl std::fmt::Display for ProjectType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProjectType::RD => write!(f, "R&D"),
            ProjectType::Production => write!(f, "PRODUCTION"),
            ProjectType::Design => write!(f, "DESIGN"),
            ProjectType::Construction => write!(f, "CONSTRUCTION"),
            ProjectType::Service => write!(f, "SERVICE"),
        }
    }
}

impl Type<Postgres> for ProjectType {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        <&str as Type<Postgres>>::type_info()
    }
}

impl<'q> Encode<'q, Postgres> for ProjectType {
    fn encode_by_ref(
        &self,
        buf: &mut <Postgres as sqlx::Database>::ArgumentBuffer<'q>,
    ) -> Result<sqlx::encode::IsNull, Box<dyn std::error::Error + Send + Sync + 'static>> {
        <&str as Encode<'q, Postgres>>::encode_by_ref(&self.to_string().as_str(), buf)
    }
}

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

impl std::fmt::Display for RiskLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RiskLevel::Low => write!(f, "LOW"),
            RiskLevel::Medium => write!(f, "MEDIUM"),
            RiskLevel::High => write!(f, "HIGH"),
            RiskLevel::Critical => write!(f, "CRITICAL"),
        }
    }
}

impl Default for ProjectStatus {
    fn default() -> Self {
        ProjectStatus::Draft
    }
}

impl std::fmt::Display for ProjectStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProjectStatus::Draft => write!(f, "DRAFT"),
            ProjectStatus::PendingApproval => write!(f, "PENDING_APPROVAL"),
            ProjectStatus::Active => write!(f, "ACTIVE"),
            ProjectStatus::Paused => write!(f, "PAUSED"),
            ProjectStatus::Completed => write!(f, "COMPLETED"),
            ProjectStatus::Cancelled => write!(f, "CANCELLED"),
        }
    }
}

impl Type<Postgres> for ProjectStatus {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        <&str as Type<Postgres>>::type_info()
    }
}

impl<'q> Encode<'q, Postgres> for ProjectStatus {
    fn encode_by_ref(
        &self,
        buf: &mut <Postgres as sqlx::Database>::ArgumentBuffer<'q>,
    ) -> Result<sqlx::encode::IsNull, Box<dyn std::error::Error + Send + Sync + 'static>> {
        <&str as Encode<'q, Postgres>>::encode_by_ref(&self.to_string().as_str(), buf)
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
    pub leader: String,
    pub team_members: serde_json::Value,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,
    pub progress: i32,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    
    // 新增字段
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateProjectRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: ProjectType,
    pub leader: String,
    pub team_members: Option<serde_json::Value>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,
    
    // 新增字段
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
    pub status: Option<ProjectStatus>,
    pub leader: Option<String>,
    pub team_members: Option<serde_json::Value>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,
    pub progress: Option<i32>,
    
    // 新增字段
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub project_type: String,
    pub status: String,
    pub leader: String,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<f64>,
    pub actual_cost: Option<f64>,
    pub progress: i32,
    pub contract_count: i64,
    pub receivable_total: f64,
    pub payable_total: f64,
    pub expense_total: f64,
    pub member_count: i64,
    pub phase_count: i64,
}
