use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct QualityIssue {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub status: String,
    pub source: Option<String>,
    pub related_inspection_id: Option<Uuid>,
    pub assigned_to: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQualityIssueRequest {
    pub title: String,
    pub description: String,
    pub severity: String,
    pub source: Option<String>,
    pub related_inspection_id: Option<Uuid>,
    pub assigned_to: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateQualityIssueRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub assigned_to: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
}
