use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseItemRequest {
    pub order_id: Uuid,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePurchaseItemRequest {
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
}
