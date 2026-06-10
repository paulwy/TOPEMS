use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ProductionRecord {
    pub id: Uuid,
    pub order_id: Uuid,
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub operator: String,
    pub quantity_completed: i32,
    pub quantity_rejected: Option<i32>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateProductionRecordRequest {
    pub order_id: Uuid,
    pub process_id: Option<Uuid>,
    pub work_station_id: Option<Uuid>,
    pub operator: String,
    pub quantity_completed: i32,
    pub quantity_rejected: Option<i32>,
    pub start_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateProductionRecordRequest {
    pub quantity_completed: Option<i32>,
    pub quantity_rejected: Option<i32>,
    pub end_time: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub notes: Option<String>,
}
