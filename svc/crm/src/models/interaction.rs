use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Interaction {
    pub id: Uuid,
    pub tenant_id: Uuid,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub contact_id: Option<Uuid>,
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    pub status: String,
    #[serde(default)]
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Interaction {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            customer_id: None,
            contact_id: None,
            type_: "call".into(),
            subject: None,
            content: None,
            scheduled_at: None,
            completed_at: None,
            status: "scheduled".into(),
            notes: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateInteractionRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub contact_id: Option<Uuid>,
    pub type_: String,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateInteractionRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub contact_id: Option<Uuid>,
    #[serde(default)]
    pub type_: Option<String>,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

impl Default for CreateInteractionRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            contact_id: None,
            type_: "call".into(),
            subject: None,
            content: None,
            scheduled_at: None,
            notes: None,
        }
    }
}

impl Default for UpdateInteractionRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            contact_id: None,
            type_: None,
            subject: None,
            content: None,
            scheduled_at: None,
            completed_at: None,
            status: None,
            notes: None,
        }
    }
}
