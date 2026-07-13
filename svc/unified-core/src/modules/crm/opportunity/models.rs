use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Opportunity {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub customer_id: Option<Uuid>,
    pub title: String,
    pub amount: Option<Decimal>,
    pub stage: String,
    pub expected_close_date: Option<NaiveDate>,
    pub probability: Option<i32>,
    pub owner_id: Option<Uuid>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOpportunityRequest {
    pub customer_id: Option<Uuid>,
    pub title: String,
    pub amount: Option<Decimal>,
    pub stage: Option<String>,
    pub expected_close_date: Option<NaiveDate>,
    pub probability: Option<i32>,
    pub owner_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOpportunityRequest {
    pub customer_id: Option<Uuid>,
    pub title: Option<String>,
    pub amount: Option<Decimal>,
    pub stage: Option<String>,
    pub expected_close_date: Option<NaiveDate>,
    pub probability: Option<i32>,
    pub owner_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityQuery {
    pub customer_id: Option<Uuid>,
    pub stage: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityListResponse {
    pub items: Vec<Opportunity>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStageRequest {
    pub stage: String,
    pub probability: Option<i32>,
}
