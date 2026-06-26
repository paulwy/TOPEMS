use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierContract {
    pub id: Uuid,
    pub contract_no: String,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub title: String,
    pub contract_type: String,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub sign_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierContractRequest {
    pub contract_no: String,
    pub supplier_id: String,
    pub supplier_name: Option<String>,
    pub title: String,
    pub contract_type: String,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub sign_date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierContractRequest {
    pub contract_no: Option<String>,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub title: Option<String>,
    pub contract_type: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub sign_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}
