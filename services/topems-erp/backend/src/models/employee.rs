use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Employee {
    pub id: Uuid,
    pub employee_number: String,
    pub name: String,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub hire_date: Option<DateTime<Utc>>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateEmployeeRequest {
    pub employee_number: String,
    pub name: String,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub hire_date: Option<DateTime<Utc>>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateEmployeeRequest {
    pub name: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub hire_date: Option<DateTime<Utc>>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: Option<String>,
}
