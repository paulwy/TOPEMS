#![allow(dead_code)]

use crate::db::repository::FileRepository;
use crate::models::{FileMetadata, Permission};
use uuid::Uuid;

pub struct FileService {
    repository: FileRepository,
}

impl FileService {
    pub fn new(repository: FileRepository) -> Self {
        Self { repository }
    }

    pub async fn create_file(
        &self,
        metadata: FileMetadata,
    ) -> Result<FileMetadata, Box<dyn std::error::Error>> {
        tracing::info!("Creating file: {}", metadata.name);
        let file = self.repository.create(metadata).await?;
        Ok(file)
    }

    pub async fn get_file(
        &self,
        id: Uuid,
    ) -> Result<Option<FileMetadata>, Box<dyn std::error::Error>> {
        tracing::debug!("Getting file: {}", id);
        let file = self.repository.find_by_id(id).await?;
        Ok(file)
    }

    pub async fn list_files(
        &self,
        folder_id: Option<Uuid>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<FileMetadata>, u64), Box<dyn std::error::Error>> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let files = self.repository.list(folder_id, limit, offset).await?;
        let total = files.len() as u64;

        Ok((files, total))
    }

    pub async fn delete_file(&self, id: Uuid) -> Result<bool, Box<dyn std::error::Error>> {
        tracing::info!("Deleting file: {}", id);
        let result = self.repository.delete(id).await?;
        Ok(result)
    }

    pub async fn check_permission(
        &self,
        file_id: Uuid,
        user_id: Uuid,
        required: Permission,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        tracing::debug!(
            "Checking permission for file {} user {} required {:?}",
            file_id,
            user_id,
            required
        );
        Ok(true)
    }
}
