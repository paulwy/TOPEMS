use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Inventory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub material_id: Option<Uuid>,
    pub warehouse_code: Option<String>,
    pub quantity: Option<Decimal>,
    pub unit: Option<String>,
    pub batch_number: Option<String>,
    pub location: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryQuery {
    pub material_id: Option<Uuid>,
    pub warehouse_code: Option<String>,
    pub batch_number: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryListResponse {
    pub items: Vec<Inventory>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdjustQuantityRequest {
    pub quantity: Decimal,
}
