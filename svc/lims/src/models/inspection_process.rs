use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InspectionProcess {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub steps: serde_json::Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectionStep {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub order: i32,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInspectionProcessRequest {
    pub name: String,
    pub description: Option<String>,
    pub steps: Vec<InspectionStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInspectionProcessRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub steps: Option<Vec<InspectionStep>>,
    pub status: Option<String>,
}
