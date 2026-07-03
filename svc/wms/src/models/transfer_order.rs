use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TransferOrder {
    pub id: Uuid,
    pub order_number: String,
    pub transfer_type: String,
    pub from_warehouse_id: String,
    pub from_warehouse_name: Option<String>,
    pub from_location_id: Option<String>,
    pub from_location_code: Option<String>,
    pub to_warehouse_id: String,
    pub to_warehouse_name: Option<String>,
    pub to_location_id: Option<String>,
    pub to_location_code: Option<String>,
    pub status: String,
    pub total_quantity: Option<i64>,
    pub total_amount: Option<f64>,
    pub planned_date: Option<String>,
    pub actual_date: Option<String>,
    pub transporter: Option<String>,
    pub tracking_number: Option<String>,
    pub priority: Option<String>,
    pub remarks: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub shipped_by: Option<String>,
    pub shipped_at: Option<DateTime<Utc>>,
    pub received_by: Option<String>,
    pub received_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TransferOrderItem {
    pub id: Uuid,
    pub transfer_id: Uuid,
    pub line_number: i32,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub batch_number: Option<String>,
    pub unit: String,
    pub planned_quantity: i64,
    pub shipped_quantity: i64,
    pub received_quantity: i64,
    pub unit_price: Option<f64>,
    pub total_amount: Option<f64>,
    pub from_location_id: Option<String>,
    pub to_location_id: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateTransferOrderRequest {
    pub transfer_type: Option<String>,
    pub from_warehouse_id: String,
    pub from_location_id: Option<String>,
    pub to_warehouse_id: String,
    pub to_location_id: Option<String>,
    pub planned_date: Option<String>,
    pub transporter: Option<String>,
    pub priority: Option<String>,
    pub remarks: Option<String>,
    pub items: Vec<CreateTransferOrderItemRequest>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateTransferOrderItemRequest {
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub batch_number: Option<String>,
    pub unit: String,
    pub planned_quantity: i64,
    pub unit_price: Option<f64>,
    pub from_location_id: Option<String>,
    pub to_location_id: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TransferOrderQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub transfer_type: Option<String>,
    pub from_warehouse_id: Option<String>,
    pub to_warehouse_id: Option<String>,
    pub status: Option<String>,
}
