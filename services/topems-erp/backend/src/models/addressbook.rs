use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AddressbookEntry {
    pub contact_type: String,
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub department_code: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AddressbookDetail {
    pub contact_type: String,
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub department_code: Option<String>,
    pub status: String,
    pub hire_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DepartmentNode {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub children: Vec<DepartmentNode>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddressbookQueryParams {
    #[serde(default)]
    pub type_: Option<String>,
    pub department_id: Option<Uuid>,
    pub search: Option<String>,
    pub status: Option<String>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_page_size")]
    pub page_size: i64,
    pub fields: Option<String>,
}

fn default_page() -> i64 {
    1
}

fn default_page_size() -> i64 {
    20
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddressbookSearchParams {
    #[serde(rename = "type")]
    pub contact_type: Option<String>,
    pub search: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    pub fields: Option<String>,
}

fn default_limit() -> i64 {
    10
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportParams {
    #[serde(rename = "type")]
    pub contact_type: Option<String>,
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String {
    "csv".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct ContactDetailParams {
    #[serde(rename = "type")]
    pub contact_type: String,
}
