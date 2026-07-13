use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Department {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub sort_order: Option<i32>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDepartmentRequest {
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDepartmentRequest {
    pub name: Option<String>,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepartmentQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub parent_id: Option<Uuid>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepartmentListResponse {
    pub items: Vec<Department>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
