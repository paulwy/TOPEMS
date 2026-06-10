use chrono::DateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Company {
    pub id: Uuid,
    pub organization_id: Option<Uuid>,
    pub name: String,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<chrono::Utc>,
    pub updated_at: DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCompanyRequest {
    pub organization_id: Option<Uuid>,
    pub name: String,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateCompanyRequest {
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}
