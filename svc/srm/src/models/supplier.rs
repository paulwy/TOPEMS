use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Supplier {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierRequest {
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierRequest {
    pub supplier_no: Option<String>,
    pub name: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: Option<String>,
}
