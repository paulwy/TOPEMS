use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct QualityInspection {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub inspection_type: String,
    pub standard_id: Option<Uuid>,
    pub inspector: String,
    pub status: String,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub inspected_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateQualityInspectionRequest {
    pub title: String,
    pub description: Option<String>,
    pub inspection_type: String,
    pub standard_id: Option<Uuid>,
    pub inspector: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateQualityInspectionRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub inspected_at: Option<DateTime<Utc>>,
}
