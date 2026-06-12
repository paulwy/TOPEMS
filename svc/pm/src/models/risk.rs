use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProjectRisk {
    pub id: Uuid,
    pub project_id: Uuid,
    pub risk_code: Option<String>,
    pub risk_name: String,
    pub risk_description: Option<String>,
    pub risk_category: Option<String>,
    pub risk_subcategory: Option<String>,
    pub likelihood: String,
    pub impact: String,
    pub risk_score: i32,
    pub status: String,
    pub mitigation_strategy: Option<String>,
    pub contingency_plan: Option<String>,
    pub trigger_condition: Option<String>,
    pub warning_threshold: i32,
    pub owner: Option<String>,
    pub response_due_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRiskRequest {
    pub risk_code: Option<String>,
    pub risk_name: String,
    pub risk_description: Option<String>,
    pub risk_category: Option<String>,
    pub risk_subcategory: Option<String>,
    pub likelihood: String,
    pub impact: String,
    pub risk_score: i32,
    pub mitigation_strategy: Option<String>,
    pub contingency_plan: Option<String>,
    pub trigger_condition: Option<String>,
    pub warning_threshold: Option<i32>,
    pub owner: Option<String>,
    pub response_due_date: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRiskRequest {
    pub risk_name: Option<String>,
    pub risk_description: Option<String>,
    pub risk_category: Option<String>,
    pub risk_subcategory: Option<String>,
    pub likelihood: Option<String>,
    pub impact: Option<String>,
    pub risk_score: Option<i32>,
    pub status: Option<String>,
    pub mitigation_strategy: Option<String>,
    pub contingency_plan: Option<String>,
    pub trigger_condition: Option<String>,
    pub warning_threshold: Option<i32>,
    pub owner: Option<String>,
    pub response_due_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RiskEvent {
    pub id: Uuid,
    pub risk_id: Uuid,
    pub event_type: String,
    pub event_description: Option<String>,
    pub occurred_at: DateTime<Utc>,
    pub reported_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRiskEventRequest {
    pub event_type: String,
    pub event_description: Option<String>,
    pub reported_by: Option<String>,
}
