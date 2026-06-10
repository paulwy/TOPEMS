use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WorkStation {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub location: Option<String>,
    pub capacity: Option<i32>,
    pub status: String,
    pub supervisor: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateWorkStationRequest {
    pub name: String,
    pub code: Option<String>,
    pub location: Option<String>,
    pub capacity: Option<i32>,
    pub supervisor: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateWorkStationRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub location: Option<String>,
    pub capacity: Option<i32>,
    pub status: Option<String>,
    pub supervisor: Option<String>,
}
