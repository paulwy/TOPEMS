use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectTypeConfig {
    pub id: Uuid,
    pub project_type: String,
    pub service_name: Option<String>,
    pub default_status: Option<String>,
    pub default_phases: Option<serde_json::Value>,
    pub required_fields: Option<Vec<String>>,
    pub custom_fields: Option<serde_json::Value>,
    pub workflow_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
