use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MenuGroup {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Menu {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub group_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub code: String,
    pub path: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub status: String,
    pub permissions: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMenuGroupRequest {
    pub name: String,
    pub code: String,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMenuGroupRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMenuRequest {
    pub group_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub name: String,
    pub code: String,
    pub path: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
    pub permissions: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMenuRequest {
    pub group_id: Option<Uuid>,
    pub parent_id: Option<Uuid>,
    pub name: Option<String>,
    pub code: Option<String>,
    pub path: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub permissions: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuGroupQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuQuery {
    pub group_id: Option<Uuid>,
    pub parent_id: Option<Uuid>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuGroupListResponse {
    pub items: Vec<MenuGroup>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuListResponse {
    pub items: Vec<Menu>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
