use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Email {
    pub id: Uuid,
    pub subject: String,
    pub from_address: String,
    pub to_addresses: serde_json::Value,
    pub cc_addresses: Option<serde_json::Value>,
    pub bcc_addresses: Option<serde_json::Value>,
    pub body: String,
    pub body_html: Option<String>,
    pub status: String,
    pub priority: String,
    pub sent_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    pub template_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SendEmailRequest {
    pub subject: String,
    pub to_addresses: Vec<String>,
    pub cc_addresses: Option<Vec<String>>,
    pub bcc_addresses: Option<Vec<String>>,
    pub body: String,
    pub body_html: Option<String>,
    pub priority: Option<String>,
    pub template_id: Option<Uuid>,
    pub template_data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SendEmailWithTemplateRequest {
    pub template_code: String,
    pub to_addresses: Vec<String>,
    pub cc_addresses: Option<Vec<String>>,
    pub bcc_addresses: Option<Vec<String>>,
    pub template_data: serde_json::Value,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EmailListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}
