use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::uuid_helpers::option_uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Department {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateDepartmentRequest {
    pub name: String,
    pub code: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub parent_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub company_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateDepartmentRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub parent_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub company_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}
