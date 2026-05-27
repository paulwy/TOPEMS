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
    mut stream: Multipart,
) -> Result<(StatusCode, Json<FileMetadata>), StatusCode> {
    tracing::debug!("Uploading file...");

    let mut file_name = "uploaded_file.txt".to_string();
    let mut file_size: i64 = 0;
    let mut content_type = "text/plain".to_string();

    // Read the multipart stream with proper error handling
    while let Ok(Some(field)) = stream.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        tracing::debug!("Multipart field name: {}", name);
        
        if name == "file" {
            let fname = field.file_name();
            tracing::debug!("File name from field: {:?}", fname);
            
            file_name = fname.unwrap_or("uploaded_file.txt").to_string();
            
            let ctype = field.content_type();
            tracing::debug!("Content type from field: {:?}", ctype);
            content_type = ctype.unwrap_or("text/plain").to_string();
            
            if let Ok(bytes) = field.bytes().await {
                file_size = bytes.len() as i64;
                tracing::debug!("File size: {}", file_size);
            }
        } else if name == "folder_id" {
            // We'll handle folder_id later
        }
    }
    
    tracing::debug!("Final file name: {}", file_name);

    let file = FileMetadata {
        id: Uuid::new_v4(),
        name: file_name,
        folder_id: None,
        size: file_size,
        content_type,
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
