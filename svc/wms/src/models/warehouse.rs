use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Warehouse {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateWarehouseRequest {
    pub name: String,
    pub code: Option<String>,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateWarehouseRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub address: Option<String>,
    pub manager: Option<String>,
    pub phone: Option<String>,
    pub status: Option<String>,
}
