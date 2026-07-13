use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Employee {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub employee_no: String,
    pub name: String,
    pub gender: Option<String>,
    pub birth_date: Option<NaiveDate>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub hire_date: Option<NaiveDate>,
    pub leave_date: Option<NaiveDate>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmployeeRequest {
    pub employee_no: String,
    pub name: String,
    pub gender: Option<String>,
    pub birth_date: Option<NaiveDate>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub hire_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub employee_no: Option<String>,
    pub name: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<NaiveDate>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub hire_date: Option<NaiveDate>,
    pub leave_date: Option<NaiveDate>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub department_id: Option<Uuid>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeListResponse {
    pub items: Vec<Employee>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
