use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub title: String,
    pub folder_id: Option<Uuid>,
    pub template_id: Option<Uuid>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub status: Option<String>,
    pub version: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub file_name: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub published_by: Option<String>,
    pub archived_at: Option<DateTime<Utc>>,
    pub archived_by: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Template {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub is_enabled: Option<bool>,
    pub is_default: Option<bool>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Folder {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_enabled: Option<bool>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub folder_id: Option<Uuid>,
    pub template_id: Option<Uuid>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDocumentRequest {
    pub title: Option<String>,
    pub folder_id: Option<Uuid>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub content: String,
    pub content_type: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub is_enabled: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub is_enabled: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_enabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFolderRequest {
    pub name: Option<String>,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_enabled: Option<bool>,
}
