use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ProductionOrder {
    pub id: Uuid,
    pub order_number: String,
    pub product_name: String,
    pub product_code: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub scheduled_start_date: Option<DateTime<Utc>>,
    pub scheduled_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub priority: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProductionOrderRequest {
    pub order_number: String,
    pub product_name: String,
    pub product_code: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub scheduled_start_date: Option<DateTime<Utc>>,
    pub scheduled_end_date: Option<DateTime<Utc>>,
    pub priority: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProductionOrderRequest {
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub quantity: Option<i32>,
    pub unit: Option<String>,
    pub scheduled_start_date: Option<DateTime<Utc>>,
    pub scheduled_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub priority: Option<String>,
}
