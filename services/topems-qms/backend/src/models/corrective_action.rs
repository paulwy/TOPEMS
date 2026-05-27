use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct CorrectiveAction {
    pub id: Uuid,
    pub issue_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub assigned_to: String,
    pub status: String,
    pub implementation_date: Option<DateTime<Utc>>,
    pub verification_result: Option<String>,
    pub verified_by: Option<String>,
    pub verified_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCorrectiveActionRequest {
    pub issue_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub assigned_to: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateCorrectiveActionRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub assigned_to: Option<String>,
    pub status: Option<String>,
    pub implementation_date: Option<DateTime<Utc>>,
    pub verification_result: Option<String>,
    pub verified_by: Option<String>,
    pub verified_at: Option<DateTime<Utc>>,
}
