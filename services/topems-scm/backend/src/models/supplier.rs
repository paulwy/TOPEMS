use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Supplier {
    pub id: Uuid,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub tax_number: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierRequest {
    pub name: String,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub tax_number: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierRequest {
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub tax_number: Option<String>,
    pub status: Option<String>,
}
