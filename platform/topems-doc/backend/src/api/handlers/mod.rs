use axum::{extract::{Path, Query, Multipart}, Json, http::StatusCode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::models::FileMetadata;

#[derive(Debug, Serialize, Deserialize)]
pub struct ListFilesQuery {
    pub folder_id: Option<Uuid>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct ListFilesResponse {
    pub files: Vec<FileMetadata>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

pub async fn list_files(Query(query): Query<ListFilesQuery>) -> Json<ListFilesResponse> {
    tracing::debug!("Listing files with query: {:?}", query);
    
    let files = vec![
        FileMetadata {
            id: Uuid::new_v4(),
            name: "示例文档.txt".to_string(),
            folder_id: None,
            size: 1024,
            content_type: "text/plain".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            created_by: "admin".to_string(),
        }
    ];

    Json(ListFilesResponse {
        files,
        total: 1,
        page: query.page.unwrap_or(1),
        page_size: query.page_size.unwrap_or(20),
    })
}

pub async fn upload_file(
    Mutipart(stream): Multipart,
) -> Result<(StatusCode, Json<FileMetadata>), StatusCode> {
    tracing::debug!("Uploading file...");
    
    let file = FileMetadata {
        id: Uuid::new_v4(),
        name: "uploaded_file.txt".to_string(),
        folder_id: None,
        size: 0,
        content_type: "text/plain".to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        created_by: "admin".to_string(),
    };

    Ok((StatusCode::CREATED, Json(file)))
}

pub async fn get_file(Path(id): Path<Uuid>) -> Result<Json<FileMetadata>, StatusCode> {
    tracing::debug!("Getting file: {}", id);
    
    let file = FileMetadata {
        id,
        name: "示例文档.txt".to_string(),
        folder_id: None,
        size: 1024,
        content_type: "text/plain".to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        created_by: "admin".to_string(),
    };

    Ok(Json(file))
}

pub async fn delete_file(Path(id): Path<Uuid>) -> StatusCode {
    tracing::debug!("Deleting file: {}", id);
    StatusCode::NO_CONTENT
}
