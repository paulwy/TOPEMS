use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseContract {
    pub id: Uuid,
    pub contract_no: String,
    pub title: String,
    pub contract_type: String,
    pub supplier_id: String,
    pub supplier_name: Option<String>,
    pub sign_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub payment_terms: Option<String>,
    pub delivery_terms: Option<String>,
    pub status: String,
    pub approval_status: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub signed_by: Option<String>,
    pub contract_file: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseContractItem {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub line_number: i32,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
    pub delivery_date: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseContractRequest {
    pub contract_no: String,
    pub title: String,
    pub contract_type: String,
    pub supplier_id: String,
    pub sign_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub payment_terms: Option<String>,
    pub delivery_terms: Option<String>,
    pub signed_by: Option<String>,
    pub remarks: Option<String>,
    pub items: Option<Vec<CreatePurchaseContractItemRequest>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseContractItemRequest {
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub delivery_date: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePurchaseContractRequest {
    pub title: Option<String>,
    pub contract_type: Option<String>,
    pub supplier_id: Option<String>,
    pub sign_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub payment_terms: Option<String>,
    pub delivery_terms: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
    pub items: Option<Vec<CreatePurchaseContractItemRequest>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PurchaseContractQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
    pub contract_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}
