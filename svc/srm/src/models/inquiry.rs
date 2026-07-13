use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Inquiry {
    pub id: Uuid,
    pub inquiry_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub urgency: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub deadline: Option<DateTime<Utc>>,
    pub creator: Option<String>,
    pub department: Option<String>,
    pub quotation_count: Option<i64>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInquiryRequest {
    pub inquiry_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub urgency: Option<String>,
    pub deadline: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInquiryRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub urgency: Option<String>,
    pub deadline: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}
