use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OfficeSupply {
    pub id: Uuid,
    pub name: String,
    pub category: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub location: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOfficeSupplyRequest {
    pub name: String,
    pub category: Option<String>,
    pub quantity: i32,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOfficeSupplyRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub quantity: Option<i32>,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub location: Option<String>,
    pub status: Option<String>,
}
