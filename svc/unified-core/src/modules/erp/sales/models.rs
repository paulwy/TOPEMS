use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SalesOrder {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub order_number: String,
    pub customer_id: Option<Uuid>,
    pub order_date: NaiveDate,
    pub expected_date: Option<NaiveDate>,
    pub total_amount: Option<Decimal>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSalesOrderRequest {
    pub order_number: String,
    pub customer_id: Option<Uuid>,
    pub order_date: NaiveDate,
    pub expected_date: Option<NaiveDate>,
    pub total_amount: Option<Decimal>,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSalesOrderRequest {
    pub order_number: Option<String>,
    pub customer_id: Option<Uuid>,
    pub order_date: Option<NaiveDate>,
    pub expected_date: Option<NaiveDate>,
    pub total_amount: Option<Decimal>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrderQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrderListResponse {
    pub items: Vec<SalesOrder>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
