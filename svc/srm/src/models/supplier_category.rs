use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierCategory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub category_no: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub level: i32,
    pub is_active: bool,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierCategoryRequest {
    pub category_no: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub level: i32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierCategoryRequest {
    pub category_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub level: Option<i32>,
    pub is_active: Option<bool>,
}
