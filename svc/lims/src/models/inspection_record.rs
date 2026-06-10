use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InspectionRecord {
    pub id: Uuid,
    pub task_id: Uuid,
    pub step_id: Uuid,
    pub step_name: String,
    pub result: String,
    pub conclusion: String,
    pub inspector: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInspectionRecordRequest {
    pub task_id: Uuid,
    pub step_id: Uuid,
    pub step_name: String,
    pub result: String,
    pub conclusion: String,
    pub inspector: String,
}
