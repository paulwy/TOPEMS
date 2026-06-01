use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FactoryMap {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub map_type: String,
    pub file_url: String, // Note: In DB it's NOT NULL
    pub bounds: Option<serde_json::Value>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DeviceLocation {
    pub id: Uuid,
    pub map_id: Uuid,
    pub device_name: String,
    pub device_code: String,
    pub device_type: Option<String>,
    pub position: serde_json::Value,
    pub status: String,
    pub description: Option<String>,
    pub last_inspected: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Pipeline {
    pub id: Uuid,
    pub map_id: Uuid,
    pub name: String,
    pub code: String,
    pub pipeline_type: Option<String>,
    pub path: serde_json::Value,
    pub properties: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WarehouseLocation {
    pub id: Uuid,
    pub map_id: Uuid,
    pub warehouse_name: String,
    pub zone: Option<String>,
    pub position: serde_json::Value,
    pub capacity: Option<i32>,
    pub usage_rate: Option<f64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LocationPhoto {
    pub id: Uuid,
    pub map_id: Uuid,
    pub position: serde_json::Value,
    pub photo_url: String,
    pub description: Option<String>,
    pub taken_by: String,
    pub taken_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageLocation {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub location_type: String,
    pub position: serde_json::Value,
    pub capacity: Option<i32>,
    pub current_usage: Option<i32>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceRecord {
    pub id: Uuid,
    pub title: String,
    pub evidence_type: String,
    pub position: serde_json::Value,
    pub file_url: Option<String>,
    pub description: Option<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}
