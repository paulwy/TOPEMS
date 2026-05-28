use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Asset {
    pub id: Uuid,
    pub asset_number: String,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    pub responsible_id: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateAssetRequest {
    pub asset_number: String,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    pub responsible_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateAssetRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub purchase_amount: Option<f64>,
    pub location: Option<String>,
    pub responsible_id: Option<Uuid>,
    pub status: Option<String>,
}
