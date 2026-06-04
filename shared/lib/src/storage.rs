use async_trait::async_trait;
use std::path::Path;
use crate::Result;
use crate::error::TopemsError;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone)]
pub struct StorageConfig {
    pub provider: String,
    pub local_path: String,
    pub s3_bucket: Option<String>,
    pub s3_region: Option<String>,
    pub max_file_size: u64,
    pub allowed_types: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub content_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub etag: Option<String>,
    pub metadata: std::collections::HashMap<String, String>,
}

impl Default for FileMetadata {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            filename: String::new(),
            path: String::new(),
            size: 0,
            content_type: "application/octet-stream".to_string(),
            created_at: chrono::Utc::now(),
            etag: None,
            metadata: std::collections::HashMap::new(),
        }
    }
}

#[async_trait]
pub trait StorageService {
    async fn upload(&self, path: &Path, content: &[u8], content_type: &str) -> Result<FileMetadata>;
    async fn download(&self, path: &str) -> Result<Vec<u8>>;
    async fn delete(&self, path: &str) -> Result<()>;
    async fn exists(&self, path: &str) -> Result<bool>;
    async fn list(&self, prefix: &str) -> Result<Vec<FileMetadata>>;
    async fn get_metadata(&self, path: &str) -> Result<Option<FileMetadata>>;
    async fn copy(&self, source_path: &str, destination_path: &str) -> Result<FileMetadata>;
    async fn move_file(&self, source_path: &str, destination_path: &str) -> Result<FileMetadata>;
}

pub struct LocalStorage {
    base_path: String,
    max_file_size: u64,
    allowed_types: Vec<String>,
}

impl LocalStorage {
    pub fn new(config: &StorageConfig) -> Result<Self> {
        std::fs::create_dir_all(&config.local_path)
            .map_err(|e| TopemsError::Io(e))?;
        
        Ok(Self {
            base_path: config.local_path.clone(),
            max_file_size: config.max_file_size,
            allowed_types: config.allowed_types.clone(),
        })
    }

    pub fn new_with_path(base_path: &str) -> Result<Self> {
        std::fs::create_dir_all(base_path)
            .map_err(|e| TopemsError::Io(e))?;
        
        Ok(Self {
            base_path: base_path.to_string(),
            max_file_size: 100 * 1024 * 1024,
            allowed_types: Vec::new(),
        })
    }

    fn validate_file(&self, content: &[u8], content_type: &str) -> Result<()> {
        if content.len() as u64 > self.max_file_size {
            return Err(TopemsError::Validation(format!(
                "File size exceeds maximum allowed size of {} bytes",
                self.max_file_size
            )));
        }
        
        if !self.allowed_types.is_empty() && !self.allowed_types.contains(&content_type.to_string()) {
            return Err(TopemsError::Validation(format!(
                "File type '{}' is not allowed",
                content_type
            )));
        }
        
        Ok(())
    }

    fn get_full_path(&self, path: &str) -> std::path::PathBuf {
        Path::new(&self.base_path).join(path)
    }
}

#[async_trait]
impl StorageService for LocalStorage {
    async fn upload(&self, path: &Path, content: &[u8], content_type: &str) -> Result<FileMetadata> {
        self.validate_file(content, content_type)?;
        
        let full_path = self.get_full_path(&path.to_string_lossy());
        
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| TopemsError::Io(e))?;
        }
        
        std::fs::write(&full_path, content)
            .map_err(|e| TopemsError::Io(e))?;

        let etag = format!("{:x}", md5::compute(content));

        Ok(FileMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            filename: path.file_name().unwrap().to_string_lossy().to_string(),
            path: path.to_string_lossy().to_string(),
            size: content.len() as u64,
            content_type: content_type.to_string(),
            created_at: chrono::Utc::now(),
            etag: Some(etag),
            metadata: std::collections::HashMap::new(),
        })
    }

    async fn download(&self, path: &str) -> Result<Vec<u8>> {
        let full_path = self.get_full_path(path);
        std::fs::read(&full_path)
            .map_err(|e| TopemsError::Io(e))
    }

    async fn delete(&self, path: &str) -> Result<()> {
        let full_path = self.get_full_path(path);
        std::fs::remove_file(&full_path)
            .map_err(|e| TopemsError::Io(e))
    }

    async fn exists(&self, path: &str) -> Result<bool> {
        let full_path = self.get_full_path(path);
        Ok(full_path.exists())
    }

    async fn list(&self, prefix: &str) -> Result<Vec<FileMetadata>> {
        let full_path = self.get_full_path(prefix);
        let mut results = Vec::new();
        
        if full_path.is_dir() {
            for entry in std::fs::read_dir(full_path)
                .map_err(|e| TopemsError::Io(e))?
            {
                let entry = entry.map_err(|e| TopemsError::Io(e))?;
                let path = entry.path();
                
                if path.is_file() {
                    let metadata = entry.metadata().map_err(|e| TopemsError::Io(e))?;
                    let content = std::fs::read(&path).map_err(|e| TopemsError::Io(e))?;
                    let etag = format!("{:x}", md5::compute(&content));
                    
                    results.push(FileMetadata {
                        id: uuid::Uuid::new_v4().to_string(),
                        filename: path.file_name().unwrap().to_string_lossy().to_string(),
                        path: path.strip_prefix(&self.base_path).unwrap_or(&path).to_string_lossy().to_string(),
                        size: metadata.len(),
                        content_type: "application/octet-stream".to_string(),
                        created_at: chrono::DateTime::from(metadata.created().unwrap_or(std::time::SystemTime::now())),
                        etag: Some(etag),
                        metadata: std::collections::HashMap::new(),
                    });
                }
            }
        }
        
        Ok(results)
    }

    async fn get_metadata(&self, path: &str) -> Result<Option<FileMetadata>> {
        let full_path = self.get_full_path(path);
        
        if !full_path.exists() {
            return Ok(None);
        }
        
        let metadata = std::fs::metadata(&full_path)
            .map_err(|e| TopemsError::Io(e))?;
        
        let content = std::fs::read(&full_path).map_err(|e| TopemsError::Io(e))?;
        let etag = format!("{:x}", md5::compute(&content));
        
        Ok(Some(FileMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            filename: full_path.file_name().unwrap().to_string_lossy().to_string(),
            path: path.to_string(),
            size: metadata.len(),
            content_type: "application/octet-stream".to_string(),
            created_at: chrono::DateTime::from(metadata.created().unwrap_or(std::time::SystemTime::now())),
            etag: Some(etag),
            metadata: std::collections::HashMap::new(),
        }))
    }

    async fn copy(&self, source_path: &str, destination_path: &str) -> Result<FileMetadata> {
        let source_full_path = self.get_full_path(source_path);
        let dest_full_path = self.get_full_path(destination_path);
        
        if let Some(parent) = dest_full_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| TopemsError::Io(e))?;
        }
        
        std::fs::copy(&source_full_path, &dest_full_path)
            .map_err(|e| TopemsError::Io(e))?;
        
        self.get_metadata(destination_path).await
            .map(|m| m.ok_or(TopemsError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "File not found after copy"))))?
    }

    async fn move_file(&self, source_path: &str, destination_path: &str) -> Result<FileMetadata> {
        let source_full_path = self.get_full_path(source_path);
        let dest_full_path = self.get_full_path(destination_path);
        
        if let Some(parent) = dest_full_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| TopemsError::Io(e))?;
        }
        
        std::fs::rename(&source_full_path, &dest_full_path)
            .map_err(|e| TopemsError::Io(e))?;
        
        self.get_metadata(destination_path).await
            .map(|m| m.ok_or(TopemsError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "File not found after move"))))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempdir::TempDir;

    #[tokio::test]
    async fn test_local_storage_upload_download() {
        let temp_dir = TempDir::new("storage_test").unwrap();
        let storage = LocalStorage::new_with_path(temp_dir.path().to_str().unwrap()).unwrap();
        
        let content = b"test content";
        let metadata = storage.upload(Path::new("test.txt"), content, "text/plain").await.unwrap();
        
        assert_eq!(metadata.filename, "test.txt");
        assert_eq!(metadata.size, content.len() as u64);
        
        let downloaded = storage.download("test.txt").await.unwrap();
        assert_eq!(downloaded, content);
    }

    #[tokio::test]
    async fn test_local_storage_exists() {
        let temp_dir = TempDir::new("storage_test").unwrap();
        let storage = LocalStorage::new_with_path(temp_dir.path().to_str().unwrap()).unwrap();
        
        assert!(!storage.exists("nonexistent.txt").await.unwrap());
        
        storage.upload(Path::new("exists.txt"), b"content", "text/plain").await.unwrap();
        assert!(storage.exists("exists.txt").await.unwrap());
    }

    #[tokio::test]
    async fn test_local_storage_delete() {
        let temp_dir = TempDir::new("storage_test").unwrap();
        let storage = LocalStorage::new_with_path(temp_dir.path().to_str().unwrap()).unwrap();
        
        storage.upload(Path::new("delete_me.txt"), b"content", "text/plain").await.unwrap();
        assert!(storage.exists("delete_me.txt").await.unwrap());
        
        storage.delete("delete_me.txt").await.unwrap();
        assert!(!storage.exists("delete_me.txt").await.unwrap());
    }

    #[tokio::test]
    async fn test_local_storage_list() {
        let temp_dir = TempDir::new("storage_test").unwrap();
        let storage = LocalStorage::new_with_path(temp_dir.path().to_str().unwrap()).unwrap();
        
        storage.upload(Path::new("file1.txt"), b"content1", "text/plain").await.unwrap();
        storage.upload(Path::new("file2.txt"), b"content2", "text/plain").await.unwrap();
        
        let files = storage.list("").await.unwrap();
        assert_eq!(files.len(), 2);
    }
}