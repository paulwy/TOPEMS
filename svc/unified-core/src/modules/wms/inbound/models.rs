use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InboundOrder {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub order_number: String,
    pub warehouse_id: Option<Uuid>,
    pub inbound_type: String,
    pub inbound_date: NaiveDate,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInboundOrderRequest {
    pub order_number: String,
    pub warehouse_id: Option<Uuid>,
    pub inbound_type: Option<String>,
    pub inbound_date: NaiveDate,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInboundOrderRequest {
    pub order_number: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub inbound_type: Option<String>,
    pub inbound_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundOrderQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboundOrderListResponse {
    pub items: Vec<InboundOrder>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
