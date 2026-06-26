use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Company {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub organization_id: Option<Uuid>,
    pub code: Option<String>,
    pub name: String,
    pub short_name: Option<String>,
    pub tax_id: Option<String>,
    pub tax_number: Option<String>,
    pub registration_number: Option<String>,
    pub registered_address: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub business_scope: Option<String>,
    pub industry: Option<String>,
    pub description: Option<String>,
    pub scale: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Department {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub company_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub manager_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Position {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub company_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub level: Option<String>,
    pub department_id: Option<Uuid>,
    pub description: Option<String>,
    pub responsibilities: Option<String>,
    pub requirements: Option<String>,
    pub salary_range_min: Option<f64>,
    pub salary_range_max: Option<f64>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Employee {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub company_id: Uuid,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub position: Option<String>,
    pub job_title: Option<String>,
    pub employee_no: String,
    pub employee_number: Option<String>,
    pub name: String,
    pub gender: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub address: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub hire_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IdRecord {
    pub id: String,
    pub id_type: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SystemParam {
    pub id: Uuid,
    pub param_key: String,
    pub param_value: Option<String>,
    pub param_type: String,
    pub description: Option<String>,
    pub module: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompanyRequest {
    pub name: String,
    pub short_name: Option<String>,
    pub tax_id: Option<String>,
    pub registered_address: Option<String>,
    pub business_scope: Option<String>,
    pub industry: Option<String>,
    pub scale: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDepartmentRequest {
    pub company_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePositionRequest {
    pub company_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub level: Option<String>,
    pub department_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmployeeRequest {
    pub company_id: Uuid,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employee_no: String,
    pub name: String,
    pub gender: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub hire_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateIdRequest {
    pub id_type: String,
    pub company_id: Option<Uuid>,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdPrefixConfig {
    pub id_type: String,
    pub prefix: String,
    pub sequence_length: usize,
}