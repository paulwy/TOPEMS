use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Customer {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}
