use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DictType {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateDictTypeRequest {
    pub code: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateDictTypeRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DictItem {
    pub id: Uuid,
    pub dict_type_id: Uuid,
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: i32,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateDictItemRequest {
    pub dict_type_id: Uuid,
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateDictItemRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
    pub status: Option<String>,
}
