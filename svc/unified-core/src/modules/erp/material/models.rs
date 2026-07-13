use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Material {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub price: Option<Decimal>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMaterialRequest {
    pub code: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub price: Option<Decimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMaterialRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub price: Option<Decimal>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialListResponse {
    pub items: Vec<Material>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
