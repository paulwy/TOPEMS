use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PurchaseInquiry {
    pub id: Uuid,
    pub inquiry_no: String,
    pub title: String,
    pub description: Option<String>,
    pub inquiry_date: DateTime<Utc>,
    pub deadline: Option<DateTime<Utc>>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseInquiryRequest {
    pub title: String,
    pub description: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub items: Vec<CreateInquiryItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInquiryItemRequest {
    pub item_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub target_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierQuote {
    pub id: Uuid,
    pub inquiry_id: Uuid,
    pub supplier_id: Uuid,
    pub quote_no: String,
    pub quote_date: DateTime<Utc>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub delivery_days: Option<i32>,
    pub valid_until: Option<DateTime<Utc>>,
    pub payment_terms: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierQuoteRequest {
    pub supplier_id: Uuid,
    pub delivery_days: Option<i32>,
    pub valid_until: Option<DateTime<Utc>>,
    pub payment_terms: Option<String>,
    pub remarks: Option<String>,
    pub items: Vec<CreateQuoteItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQuoteItemRequest {
    pub inquiry_item_id: Uuid,
    pub unit_price: f64,
    pub lead_time_days: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceComparison {
    pub id: Uuid,
    pub inquiry_id: Uuid,
    pub comparison_no: String,
    pub compared_at: DateTime<Utc>,
    pub recommended_supplier_id: Option<Uuid>,
    pub recommended_quote_id: Option<Uuid>,
    pub total_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub price_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePriceComparisonRequest {
    pub recommended_supplier_id: Uuid,
    pub recommended_quote_id: Uuid,
    pub quality_score: Option<f64>,
    pub price_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub remarks: Option<String>,
    pub supplier_scores: Vec<SupplierScoreItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierScoreItem {
    pub supplier_id: Uuid,
    pub quote_id: Uuid,
    pub quality_score: f64,
    pub price_score: f64,
    pub delivery_score: f64,
    pub service_score: f64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceComparisonResult {
    pub comparison: PriceComparison,
    pub items: Vec<ComparisonItemDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonItemDetail {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub quote_id: Uuid,
    pub quality_score: f64,
    pub price_score: f64,
    pub delivery_score: f64,
    pub service_score: f64,
    pub total_score: f64,
    pub rank: i32,
}
