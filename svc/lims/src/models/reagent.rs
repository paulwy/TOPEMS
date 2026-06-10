use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Reagent {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub quantity: f64,
    pub unit: String,
    pub location: Option<String>,
    pub storage_condition: Option<String>,
    pub expiration_date: Option<DateTime<Utc>>,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReagentRequest {
    pub name: String,
    pub code: String,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub quantity: f64,
    pub unit: String,
    pub location: Option<String>,
    pub storage_condition: Option<String>,
    pub expiration_date: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateReagentRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub location: Option<String>,
    pub storage_condition: Option<String>,
    pub expiration_date: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReagentUsageRequest {
    pub quantity: f64,
    pub usage_date: String,
    pub purpose: String,
    pub used_by: String,
}
