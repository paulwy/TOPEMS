use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct InboundOrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub total_price: Option<f64>,
    pub received_quantity: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateInboundOrderItemRequest {
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateInboundOrderItemRequest {
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub received_quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct OutboundOrderItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub order_id: Uuid,
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub total_price: Option<f64>,
    pub shipped_quantity: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateOutboundOrderItemRequest {
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateOutboundOrderItemRequest {
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub shipped_quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}
