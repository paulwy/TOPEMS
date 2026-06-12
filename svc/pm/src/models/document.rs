use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProjectDocument {
    pub id: Uuid,
    pub project_id: Uuid,
    pub document_code: Option<String>,
    pub document_name: String,
    pub document_type: String,
    pub file_path: String,
    pub file_size: i64,
    pub file_hash: Option<String>,
    pub version: i32,
    pub status: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub document_code: Option<String>,
    pub document_name: String,
    pub document_type: String,
    pub file_path: String,
    pub file_size: i64,
    pub file_hash: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDocumentRequest {
    pub document_name: Option<String>,
    pub document_type: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DocumentVersion {
    pub id: Uuid,
    pub document_id: Uuid,
    pub version: i32,
    pub file_path: String,
    pub file_hash: Option<String>,
    pub change_note: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentVersionRequest {
    pub file_path: String,
    pub file_hash: Option<String>,
    pub change_note: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DocumentFolder {
    pub id: Uuid,
    pub project_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub folder_name: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFolderRequest {
    pub parent_id: Option<Uuid>,
    pub folder_name: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
}
