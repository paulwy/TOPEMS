use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactoryMap {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub map_type: String,
    pub file_url: Option<String>,
    pub bounds: serde_json::Value,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceLocation {
    pub id: Uuid,
    pub map_id: Uuid,
    pub device_name: String,
    pub device_code: String,
    pub device_type: String,
    pub position: serde_json::Value,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pipeline {
    pub id: Uuid,
    pub map_id: Uuid,
    pub name: String,
    pub code: String,
    pub pipeline_type: String,
    pub path: serde_json::Value,
    pub properties: serde_json::Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WarehouseLocation {
    pub id: Uuid,
    pub map_id: Uuid,
    pub warehouse_name: String,
    pub zone: String,
    pub position: serde_json::Value,
    pub capacity: Option<i32>,
    pub usage_rate: Option<i32>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
