use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Transfer {
    pub id: Uuid,
    pub transfer_number: String,
    pub from_warehouse_id: Option<Uuid>,
    pub from_location_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateTransferRequest {
    pub transfer_number: String,
    pub from_warehouse_id: Option<Uuid>,
    pub from_location_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateTransferRequest {
    pub from_warehouse_id: Option<Uuid>,
    pub from_location_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TransferItem {
    pub id: Uuid,
    pub transfer_id: Uuid,
    pub inventory_item_id: Uuid,
    pub quantity: f64,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateTransferItemRequest {
    pub inventory_item_id: Uuid,
    pub quantity: f64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateTransferItemRequest {
    pub quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}