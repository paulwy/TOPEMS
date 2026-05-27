use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Interaction {
    pub id: Uuid,
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub type_: String,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInteractionRequest {
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub type_: String,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInteractionRequest {
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub type_: Option<String>,
    pub subject: Option<String>,
    pub content: Option<String>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub notes: Option<String>,
}
