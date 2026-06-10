use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct StockTake {
    pub id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub stock_take_number: String,
    pub status: String,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateStockTakeRequest {
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub stock_take_number: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateStockTakeRequest {
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub status: Option<String>,
    pub end_time: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct StockTakeItem {
    pub id: Uuid,
    pub stock_take_id: Uuid,
    pub inventory_item_id: Uuid,
    pub expected_quantity: f64,
    pub actual_quantity: Option<f64>,
    pub variance: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateStockTakeItemRequest {
    pub inventory_item_id: Uuid,
    pub expected_quantity: f64,
    pub actual_quantity: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateStockTakeItemRequest {
    pub actual_quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}