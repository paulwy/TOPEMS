use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Quotation {
    pub id: Uuid,
    pub quotation_no: String,
    pub inquiry_id: Uuid,
    pub inquiry_no: Option<String>,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub title: String,
    pub total_amount: f64,
    pub currency: String,
    pub valid_until: Option<DateTime<Utc>>,
    pub delivery_time: Option<String>,
    pub payment_terms: Option<String>,
    pub status: String,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateQuotationRequest {
    pub inquiry_id: String,
    pub supplier_id: String,
    pub title: String,
    pub total_amount: f64,
    pub currency: String,
    pub valid_until: Option<String>,
    pub delivery_time: Option<String>,
    pub payment_terms: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateQuotationRequest {
    pub title: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub valid_until: Option<String>,
    pub delivery_time: Option<String>,
    pub payment_terms: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}
