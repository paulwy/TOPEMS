use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ServiceIntegration {
    pub id: Uuid,
    pub service_name: String,
    pub api_base_url: Option<String>,
    pub api_key: Option<String>,
    pub sync_enabled: Option<bool>,
    pub sync_config: Option<serde_json::Value>,
    pub is_active: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
