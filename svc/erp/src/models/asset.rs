use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use super::uuid_helpers::option_uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Asset {
    pub id: Uuid,
    pub asset_number: String,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    pub responsible_id: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // 设备专用字段
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub rated_power: Option<f64>,
    pub rated_voltage: Option<f64>,
    pub rated_current: Option<f64>,
    pub specifications: Option<Value>,
    pub image_url: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateAssetRequest {
    pub asset_number: String,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub responsible_id: Option<Uuid>,
    // 设备专用字段
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub rated_power: Option<f64>,
    pub rated_voltage: Option<f64>,
    pub rated_current: Option<f64>,
    pub specifications: Option<Value>,
    pub image_url: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateAssetRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub responsible_id: Option<Uuid>,
    pub status: Option<String>,
    // 设备专用字段
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub rated_power: Option<f64>,
    pub rated_voltage: Option<f64>,
    pub rated_current: Option<f64>,
    pub specifications: Option<Value>,
    pub image_url: Option<String>,
    pub department: Option<String>,
}
