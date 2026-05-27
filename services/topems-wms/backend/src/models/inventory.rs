use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct InventoryItem {
    pub id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub location_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub min_quantity: Option<f64>,
    pub max_quantity: Option<f64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInventoryItemRequest {
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub location_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub min_quantity: Option<f64>,
    pub max_quantity: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInventoryItemRequest {
    pub sku: Option<String>,
    pub name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub location_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub min_quantity: Option<f64>,
    pub max_quantity: Option<f64>,
    pub status: Option<String>,
}
