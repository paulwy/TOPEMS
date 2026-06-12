use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AcceptancePlan {
    pub id: Uuid,
    pub project_id: Uuid,
    pub plan_code: Option<String>,
    pub plan_name: String,
    pub acceptance_type: String,
    pub milestone_id: Option<Uuid>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
    pub expected_date: Option<DateTime<Utc>>,
    pub status: String,
    pub participants: Option<serde_json::Value>,
    pub documents_required: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAcceptancePlanRequest {
    pub plan_code: Option<String>,
    pub plan_name: String,
    pub acceptance_type: String,
    pub milestone_id: Option<Uuid>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
    pub expected_date: Option<String>,
    pub participants: Option<serde_json::Value>,
    pub documents_required: Option<serde_json::Value>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAcceptancePlanRequest {
    pub plan_name: Option<String>,
    pub acceptance_type: Option<String>,
    pub acceptance_criteria: Option<String>,
    pub expected_date: Option<String>,
    pub status: Option<String>,
    pub participants: Option<serde_json::Value>,
    pub documents_required: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AcceptanceRecord {
    pub id: Uuid,
    pub project_id: Uuid,
    pub plan_id: Uuid,
    pub acceptance_date: DateTime<Utc>,
    pub status: String,
    pub conclusion: Option<String>,
    pub score: Option<f64>,
    pub accepted_by: Option<String>,
    pub attendees: Option<serde_json::Value>,
    pub findings: Option<serde_json::Value>,
    pub recommendations: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAcceptanceRecordRequest {
    pub plan_id: Uuid,
    pub acceptance_date: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub score: Option<f64>,
    pub accepted_by: Option<String>,
    pub attendees: Option<serde_json::Value>,
    pub findings: Option<serde_json::Value>,
    pub recommendations: Option<serde_json::Value>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAcceptanceRecordRequest {
    pub status: Option<String>,
    pub conclusion: Option<String>,
    pub score: Option<f64>,
    pub attendees: Option<serde_json::Value>,
    pub findings: Option<serde_json::Value>,
    pub recommendations: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AcceptanceItem {
    pub id: Uuid,
    pub plan_id: Uuid,
    pub item_code: Option<String>,
    pub item_name: String,
    pub item_description: Option<String>,
    pub required_standard: Option<String>,
    pub actual_result: Option<String>,
    pub is_passed: Option<bool>,
    pub comments: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAcceptanceItemRequest {
    pub item_code: Option<String>,
    pub item_name: String,
    pub item_description: Option<String>,
    pub required_standard: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAcceptanceItemRequest {
    pub actual_result: Option<String>,
    pub is_passed: Option<bool>,
    pub comments: Option<String>,
}
