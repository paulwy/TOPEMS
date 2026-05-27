use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Sample {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub project_id: Option<Uuid>,
    pub received_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSampleRequest {
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSampleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
}
