use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct OutboundOrder {
    pub id: Uuid,
    pub order_number: String,
    pub warehouse_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub expected_delivery: Option<DateTime<Utc>>,
    pub actual_delivery: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateOutboundOrderRequest {
    pub order_number: String,
    pub warehouse_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub expected_delivery: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateOutboundOrderRequest {
    pub warehouse_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub expected_delivery: Option<DateTime<Utc>>,
    pub actual_delivery: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}
