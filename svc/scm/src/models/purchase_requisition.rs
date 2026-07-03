use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseRequisition {
    pub id: Uuid,
    pub requisition_no: String,
    pub title: String,
    pub applicant_id: Option<Uuid>,
    pub applicant_name: Option<String>,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub request_date: DateTime<Utc>,
    pub required_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub approval_status: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseRequisitionItem {
    pub id: Uuid,
    pub requisition_id: Uuid,
    pub line_number: i32,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseRequisitionRequest {
    pub requisition_no: String,
    pub title: String,
    pub applicant_id: Option<String>,
    pub department_id: Option<String>,
    pub request_date: String,
    pub required_date: Option<String>,
    pub priority: Option<String>,
    pub supplier_id: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePurchaseRequisitionRequest {
    pub title: Option<String>,
    pub required_date: Option<String>,
    pub priority: Option<String>,
    pub supplier_id: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PurchaseRequisitionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub applicant_id: Option<String>,
    pub department_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}
