use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Opportunity {
    pub id: Uuid,
    pub name: String,
    pub customer_id: Option<Uuid>,
    pub value: Option<f64>,
    pub stage: String,
    pub probability: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateOpportunityRequest {
    pub name: String,
    pub customer_id: Option<Uuid>,
    pub value: Option<f64>,
    pub probability: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateOpportunityRequest {
    pub name: Option<String>,
    pub customer_id: Option<Uuid>,
    pub value: Option<f64>,
    pub stage: Option<String>,
    pub probability: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}
