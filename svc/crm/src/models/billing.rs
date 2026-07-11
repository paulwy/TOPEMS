use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct BillingRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub invoice_no: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub due_date: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
    pub items: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BillingItem {
    pub id: Option<Uuid>,
    pub name: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateBillingRequest {
    pub customer_id: Uuid,
    pub invoice_no: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub due_date: DateTime<Utc>,
    pub items: Vec<BillingItem>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateBillingRequest {
    pub customer_id: Option<Uuid>,
    pub invoice_no: Option<String>,
    pub amount: Option<f64>,
    pub currency: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub items: Option<Vec<BillingItem>>,
}

#[derive(Debug, Deserialize)]
pub struct BillingQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub customer_id: Option<Uuid>,
    pub status: Option<String>,
}
