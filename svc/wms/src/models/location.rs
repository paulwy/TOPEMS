use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Location {
    pub id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub code: String,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub capacity: Option<f64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateLocationRequest {
    pub warehouse_id: Option<Uuid>,
    pub code: String,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub capacity: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateLocationRequest {
    pub warehouse_id: Option<Uuid>,
    pub code: Option<String>,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub capacity: Option<f64>,
    pub status: Option<String>,
}
