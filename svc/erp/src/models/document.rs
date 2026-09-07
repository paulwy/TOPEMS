use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Document {
    pub id: Uuid,
    pub title: String,
    pub doc_type: String,
    pub status: String,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub uploader: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub doc_type: Option<String>,
    pub status: Option<String>,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub uploader: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDocumentRequest {
    pub title: Option<String>,
    pub doc_type: Option<String>,
    pub status: Option<String>,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub uploader: Option<String>,
}
