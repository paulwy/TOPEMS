use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierAdmission {
    pub id: Uuid,
    pub admission_no: String,
    pub supplier_name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub address: Option<String>,
    pub business_license: Option<String>,
    pub tax_registration: Option<String>,
    pub organization_code: Option<String>,
    pub legal_representative: Option<String>,
    pub registered_capital: Option<String>,
    pub established_date: Option<String>,
    pub business_scope: Option<String>,
    pub supplier_category: Option<String>,
    pub risk_level: Option<String>,
    pub status: String,
    pub approval_status: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub applicant: Option<String>,
    pub application_date: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierAdmissionAuditItem {
    pub id: Uuid,
    pub admission_id: Uuid,
    pub audit_item: String,
    pub audit_result: Option<String>,
    pub auditor: Option<String>,
    pub audit_date: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSupplierAdmissionRequest {
    pub admission_no: String,
    pub supplier_name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub address: Option<String>,
    pub business_license: Option<String>,
    pub tax_registration: Option<String>,
    pub organization_code: Option<String>,
    pub legal_representative: Option<String>,
    pub registered_capital: Option<String>,
    pub established_date: Option<String>,
    pub business_scope: Option<String>,
    pub supplier_category: Option<String>,
    pub applicant: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSupplierAdmissionRequest {
    pub supplier_name: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub address: Option<String>,
    pub business_license: Option<String>,
    pub tax_registration: Option<String>,
    pub organization_code: Option<String>,
    pub legal_representative: Option<String>,
    pub registered_capital: Option<String>,
    pub established_date: Option<String>,
    pub business_scope: Option<String>,
    pub supplier_category: Option<String>,
    pub risk_level: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SupplierAdmissionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub approval_status: Option<String>,
    pub supplier_category: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuditRequest {
    pub audit_items: Vec<AuditItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuditItem {
    pub audit_item: String,
    pub audit_result: String,
    pub remarks: Option<String>,
}
