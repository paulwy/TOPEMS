use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WmsInventory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: Option<String>,
    pub quantity: Option<Decimal>,
    pub unit: Option<String>,
    pub batch_number: Option<String>,
    pub location_code: Option<String>,
    pub locked_quantity: Option<Decimal>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryQuery {
    pub warehouse_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub batch_number: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryListResponse {
    pub items: Vec<WmsInventory>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdjustInventoryRequest {
    pub quantity: Decimal,
}
