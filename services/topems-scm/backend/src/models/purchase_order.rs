use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub order_number: String,
    pub supplier_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub order_number: String,
    pub supplier_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePurchaseOrderRequest {
    pub supplier_id: Option<Uuid>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}
