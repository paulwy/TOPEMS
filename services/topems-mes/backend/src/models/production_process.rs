use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ProductionProcess {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sequence: i32,
    pub standard_time: Option<i32>,
    pub work_station_id: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProductionProcessRequest {
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sequence: i32,
    pub standard_time: Option<i32>,
    pub work_station_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProductionProcessRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sequence: Option<i32>,
    pub standard_time: Option<i32>,
    pub work_station_id: Option<Uuid>,
    pub status: Option<String>,
}
