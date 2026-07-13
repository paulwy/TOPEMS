use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DictType {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDictTypeRequest {
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDictTypeRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDictItemRequest {
    pub dict_type_id: Uuid,
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDictItemRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchCreateDictItemsRequest {
    pub dict_type_id: Uuid,
    pub items: Vec<CreateDictItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictTypeQuery {
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictItemQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictTypeListResponse {
    pub items: Vec<DictType>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictItemListResponse {
    pub items: Vec<DictItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
