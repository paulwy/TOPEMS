use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Opportunity {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub customer_id: Option<Uuid>,
    pub value: Option<Decimal>,
    pub stage: String,
    pub probability: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateOpportunityRequest {
    pub name: String,
    pub customer_id: Option<Uuid>,
    pub value: Option<Decimal>,
    pub probability: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateOpportunityRequest {
    pub name: Option<String>,
    pub customer_id: Option<Uuid>,
    pub value: Option<Decimal>,
    pub stage: Option<String>,
    pub probability: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}
