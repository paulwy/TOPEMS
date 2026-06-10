use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InspectionTask {
    pub id: Uuid,
    pub sample_id: Uuid,
    pub process_id: Uuid,
    pub current_step: i32,
    pub status: String,
    pub inspector: String,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInspectionTaskRequest {
    pub sample_id: Uuid,
    pub process_id: Uuid,
    pub inspector: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInspectionTaskRequest {
    pub sample_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub inspector: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteStepRequest {
    pub step_id: Uuid,
    pub step_name: String,
    pub result: String,
    pub conclusion: String,
    pub inspector: String,
}
