use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct QualityCheck {
    pub id: Uuid,
    pub project_id: Uuid,
    pub check_code: Option<String>,
    pub check_name: String,
    pub check_type: Option<String>,
    pub phase_id: Option<Uuid>,
    pub milestone_id: Option<Uuid>,
    pub check_criteria: Option<String>,
    pub acceptance_standard: Option<String>,
    pub status: String,
    pub check_date: Option<DateTime<Utc>>,
    pub checked_by: Option<String>,
    pub result_details: Option<serde_json::Value>,
    pub nonconformities: Option<serde_json::Value>,
    pub corrective_actions: Option<serde_json::Value>,
    pub follow_up_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateQualityCheckRequest {
    pub check_code: Option<String>,
    pub check_name: String,
    pub check_type: Option<String>,
    pub phase_id: Option<Uuid>,
    pub milestone_id: Option<Uuid>,
    pub check_criteria: Option<String>,
    pub acceptance_standard: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateQualityCheckRequest {
    pub check_name: Option<String>,
    pub check_type: Option<String>,
    pub check_criteria: Option<String>,
    pub acceptance_standard: Option<String>,
    pub status: Option<String>,
    pub check_date: Option<String>,
    pub checked_by: Option<String>,
    pub result_details: Option<serde_json::Value>,
    pub nonconformities: Option<serde_json::Value>,
    pub corrective_actions: Option<serde_json::Value>,
    pub follow_up_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Defect {
    pub id: Uuid,
    pub project_id: Uuid,
    pub check_id: Option<Uuid>,
    pub defect_code: Option<String>,
    pub defect_name: String,
    pub defect_description: Option<String>,
    pub severity: String,
    pub priority: String,
    pub status: String,
    pub assignee: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub resolution: Option<String>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDefectRequest {
    pub defect_code: Option<String>,
    pub defect_name: String,
    pub defect_description: Option<String>,
    pub severity: String,
    pub priority: String,
    pub check_id: Option<Uuid>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDefectRequest {
    pub defect_name: Option<String>,
    pub defect_description: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub resolution: Option<String>,
}
