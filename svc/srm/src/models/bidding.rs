use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Bidding {
    pub id: Uuid,
    pub bidding_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub bidding_type: Option<String>,
    pub status: String,
    pub budget_amount: Option<f64>,
    pub currency: String,
    pub publish_date: Option<DateTime<Utc>>,
    pub bid_deadline: Option<DateTime<Utc>>,
    pub open_date: Option<DateTime<Utc>>,
    pub winner_supplier_id: Option<Uuid>,
    pub winner_supplier_name: Option<String>,
    pub winner_amount: Option<f64>,
    pub supplier_count: Option<i64>,
    pub creator: Option<String>,
    pub department: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateBiddingRequest {
    pub bidding_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub bidding_type: Option<String>,
    pub budget_amount: Option<f64>,
    pub currency: String,
    pub bid_deadline: Option<String>,
    pub open_date: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateBiddingRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub bidding_type: Option<String>,
    pub budget_amount: Option<f64>,
    pub currency: Option<String>,
    pub bid_deadline: Option<String>,
    pub open_date: Option<String>,
    pub items: Option<serde_json::Value>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AwardBiddingRequest {
    pub supplier_id: String,
}
