use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct QualityStandard {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQualityStandardRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateQualityStandardRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}
