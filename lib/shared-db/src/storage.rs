use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::Path;
use topems_shared_core::error::Result;
use topems_shared_core::error::TopemsError;

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
    async fn upload(&self, path: &Path, content: &[u8], content_type: &str)
        -> Result<FileMetadata>;
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
        std::fs::create_dir_all(&config.local_path).map_err(TopemsError::Io)?;

        Ok(Self {
            base_path: config.local_path.clone(),
            max_file_size: config.max_file_size,
            allowed_types: config.allowed_types.clone(),
        })
    }

    pub fn new_with_path(base_path: &str) -> Result<Self> {
        std::fs::create_dir_all(base_path).map_err(TopemsError::Io)?;

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

        if !self.allowed_types.is_empty() && !self.allowed_types.contains(&content_type.to_string())
        {
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
    async fn upload(
        &self,
        path: &Path,
        content: &[u8],
        content_type: &str,
    ) -> Result<FileMetadata> {
        self.validate_file(content, content_type)?;

        let full_path = self.get_full_path(&path.to_string_lossy());

        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(TopemsError::Io)?;
        }

        std::fs::write(&full_path, content).map_err(TopemsError::Io)?;

        let etag = format!("{:x}", md5::compute(content));

        Ok(FileMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            filename: path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
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
        std::fs::read(&full_path).map_err(TopemsError::Io)
    }

    async fn delete(&self, path: &str) -> Result<()> {
        let full_path = self.get_full_path(path);
        std::fs::remove_file(&full_path).map_err(TopemsError::Io)
    }

    async fn exists(&self, path: &str) -> Result<bool> {
        let full_path = self.get_full_path(path);
        Ok(full_path.exists())
    }

    async fn list(&self, prefix: &str) -> Result<Vec<FileMetadata>> {
        let full_path = self.get_full_path(prefix);
        let mut results = Vec::new();

        if full_path.is_dir() {
            for entry in std::fs::read_dir(full_path).map_err(TopemsError::Io)? {
                let entry = entry.map_err(TopemsError::Io)?;
                let path = entry.path();

                if path.is_file() {
                    let metadata = entry.metadata().map_err(TopemsError::Io)?;
                    let content = std::fs::read(&path).map_err(TopemsError::Io)?;
                    let etag = format!("{:x}", md5::compute(&content));

                    results.push(FileMetadata {
                        id: uuid::Uuid::new_v4().to_string(),
                        filename: path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        path: path
                            .strip_prefix(&self.base_path)
                            .unwrap_or(&path)
                            .to_string_lossy()
                            .to_string(),
                        size: metadata.len(),
                        content_type: "application/octet-stream".to_string(),
                        created_at: chrono::DateTime::from(
                            metadata.created().unwrap_or(std::time::SystemTime::now()),
                        ),
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

        let metadata = std::fs::metadata(&full_path).map_err(TopemsError::Io)?;

        let content = std::fs::read(&full_path).map_err(TopemsError::Io)?;
        let etag = format!("{:x}", md5::compute(&content));

        Ok(Some(FileMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            filename: full_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            path: path.to_string(),
            size: metadata.len(),
            content_type: "application/octet-stream".to_string(),
            created_at: chrono::DateTime::from(
                metadata.created().unwrap_or(std::time::SystemTime::now()),
            ),
            etag: Some(etag),
            metadata: std::collections::HashMap::new(),
        }))
    }

    async fn copy(&self, source_path: &str, destination_path: &str) -> Result<FileMetadata> {
        let source_full_path = self.get_full_path(source_path);
        let dest_full_path = self.get_full_path(destination_path);

        if let Some(parent) = dest_full_path.parent() {
            std::fs::create_dir_all(parent).map_err(TopemsError::Io)?;
        }

        std::fs::copy(&source_full_path, &dest_full_path).map_err(TopemsError::Io)?;

        self.get_metadata(destination_path).await.map(|m| {
            m.ok_or(TopemsError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "File not found after copy",
            )))
        })?
    }

    async fn move_file(&self, source_path: &str, destination_path: &str) -> Result<FileMetadata> {
        let source_full_path = self.get_full_path(source_path);
        let dest_full_path = self.get_full_path(destination_path);

        if let Some(parent) = dest_full_path.parent() {
            std::fs::create_dir_all(parent).map_err(TopemsError::Io)?;
        }

        std::fs::rename(&source_full_path, &dest_full_path).map_err(TopemsError::Io)?;

        self.get_metadata(destination_path).await.map(|m| {
            m.ok_or(TopemsError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "File not found after move",
            )))
        })?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_local_storage_upload_download() -> Result<()> {
        let temp_dir = TempDir::new()?;
        let storage = LocalStorage::new_with_path(
            temp_dir
                .path()
                .to_str()
                .ok_or_else(|| TopemsError::Internal("temp path invalid".to_string()))?,
        )?;

        let content = b"test content";
        let metadata = storage
            .upload(Path::new("test.txt"), content, "text/plain")
            .await?;

        assert_eq!(metadata.filename, "test.txt");
        assert_eq!(metadata.size, content.len() as u64);

        let downloaded = storage.download("test.txt").await?;
        assert_eq!(downloaded, content);
        Ok(())
    }

    #[tokio::test]
    async fn test_local_storage_exists() -> Result<()> {
        let temp_dir = TempDir::new()?;
        let storage = LocalStorage::new_with_path(
            temp_dir
                .path()
                .to_str()
                .ok_or_else(|| TopemsError::Internal("temp path invalid".to_string()))?,
        )?;

        assert!(!storage.exists("nonexistent.txt").await?);

        storage
            .upload(Path::new("exists.txt"), b"content", "text/plain")
            .await?;
        assert!(storage.exists("exists.txt").await?);
        Ok(())
    }

    #[tokio::test]
    async fn test_local_storage_delete() -> Result<()> {
        let temp_dir = TempDir::new()?;
        let storage = LocalStorage::new_with_path(
            temp_dir
                .path()
                .to_str()
                .ok_or_else(|| TopemsError::Internal("temp path invalid".to_string()))?,
        )?;

        storage
            .upload(Path::new("delete_me.txt"), b"content", "text/plain")
            .await?;
        assert!(storage.exists("delete_me.txt").await?);

        storage.delete("delete_me.txt").await?;
        assert!(!storage.exists("delete_me.txt").await?);
        Ok(())
    }

    #[tokio::test]
    async fn test_local_storage_list() -> Result<()> {
        let temp_dir = TempDir::new()?;
        let storage = LocalStorage::new_with_path(
            temp_dir
                .path()
                .to_str()
                .ok_or_else(|| TopemsError::Internal("temp path invalid".to_string()))?,
        )?;

        storage
            .upload(Path::new("file1.txt"), b"content1", "text/plain")
            .await?;
        storage
            .upload(Path::new("file2.txt"), b"content2", "text/plain")
            .await?;

        let files = storage.list("").await?;
        assert_eq!(files.len(), 2);
        Ok(())
    }

    #[test]
    fn test_file_metadata_default() {
        let fm = FileMetadata::default();
        assert!(!fm.id.is_empty());
        assert_eq!(fm.filename, "");
        assert_eq!(fm.path, "");
        assert_eq!(fm.size, 0);
        assert_eq!(fm.content_type, "application/octet-stream");
        assert!(fm.etag.is_none());
        assert!(fm.metadata.is_empty());
        // created_at should be roughly now (within a minute)
        let now = chrono::Utc::now();
        let diff = (now - fm.created_at).num_seconds().abs();
        assert!(diff < 60);
    }

    #[test]
    fn test_file_metadata_serde_roundtrip() {
        let mut meta = std::collections::HashMap::new();
        meta.insert("k1".to_string(), "v1".to_string());
        meta.insert("k2".to_string(), "v2".to_string());
        let fm = FileMetadata {
            id: "abc".to_string(),
            filename: "f.txt".to_string(),
            path: "/p/f.txt".to_string(),
            size: 100,
            content_type: "text/plain".to_string(),
            created_at: chrono::Utc::now(),
            etag: Some("etag1".to_string()),
            metadata: meta,
        };
        let s = serde_json::to_string(&fm).expect("serialize");
        let d: FileMetadata = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(d.id, fm.id);
        assert_eq!(d.filename, fm.filename);
        assert_eq!(d.path, fm.path);
        assert_eq!(d.size, fm.size);
        assert_eq!(d.content_type, fm.content_type);
        assert_eq!(d.created_at, fm.created_at);
        assert_eq!(d.etag, fm.etag);
        assert_eq!(d.metadata, fm.metadata);
    }

    #[test]
    fn test_storage_config_construction() {
        let cfg = StorageConfig {
            provider: "local".to_string(),
            local_path: "/tmp/x".to_string(),
            s3_bucket: Some("bucket".to_string()),
            s3_region: Some("us-east-1".to_string()),
            max_file_size: 1024,
            allowed_types: vec!["text/plain".to_string(), "image/png".to_string()],
        };
        assert_eq!(cfg.provider, "local");
        assert_eq!(cfg.local_path, "/tmp/x");
        assert_eq!(cfg.s3_bucket.as_deref(), Some("bucket"));
        assert_eq!(cfg.s3_region.as_deref(), Some("us-east-1"));
        assert_eq!(cfg.max_file_size, 1024);
        assert_eq!(cfg.allowed_types.len(), 2);
        assert_eq!(cfg.allowed_types[0], "text/plain");
        assert_eq!(cfg.allowed_types[1], "image/png");
    }

    #[test]
    fn test_local_storage_new_with_path() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!("topems_test_{}", uuid::Uuid::new_v4()));
        let path_str = tmp.to_str().expect("path").to_string();
        let storage = LocalStorage::new_with_path(&path_str).expect("create storage");
        assert_eq!(storage.base_path, path_str);
        // The directory should now exist
        assert!(tmp.exists());
        // cleanup
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_validate_file_too_large() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!(
            "topems_test_large_{}",
            uuid::Uuid::new_v4()
        ));
        let cfg = StorageConfig {
            provider: "local".to_string(),
            local_path: tmp.to_str().expect("path").to_string(),
            s3_bucket: None,
            s3_region: None,
            max_file_size: 10,
            allowed_types: vec![],
        };
        let storage = LocalStorage::new(&cfg).expect("create");
        let big_content = vec![0u8; 100];
        let result = storage.validate_file(&big_content, "text/plain");
        assert!(result.is_err(), "expected validation error for too-large file");
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_validate_file_invalid_content_type() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!("topems_test_ct_{}", uuid::Uuid::new_v4()));
        let cfg = StorageConfig {
            provider: "local".to_string(),
            local_path: tmp.to_str().expect("path").to_string(),
            s3_bucket: None,
            s3_region: None,
            max_file_size: 100 * 1024 * 1024,
            allowed_types: vec!["text/plain".to_string(), "image/png".to_string()],
        };
        let storage = LocalStorage::new(&cfg).expect("create");
        let result = storage.validate_file(b"hello", "application/json");
        assert!(
            result.is_err(),
            "expected validation error for disallowed content type"
        );
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_validate_file_valid() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!("topems_test_valid_{}", uuid::Uuid::new_v4()));
        let cfg = StorageConfig {
            provider: "local".to_string(),
            local_path: tmp.to_str().expect("path").to_string(),
            s3_bucket: None,
            s3_region: None,
            max_file_size: 100 * 1024 * 1024,
            allowed_types: vec!["text/plain".to_string()],
        };
        let storage = LocalStorage::new(&cfg).expect("create");
        let result = storage.validate_file(b"hello", "text/plain");
        assert!(result.is_ok(), "expected valid file to pass validation");
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_validate_file_empty_allowed_types_allows_all() {
        let mut tmp = std::env::temp_dir();
        tmp.push(format!("topems_test_empty_{}", uuid::Uuid::new_v4()));
        let cfg = StorageConfig {
            provider: "local".to_string(),
            local_path: tmp.to_str().expect("path").to_string(),
            s3_bucket: None,
            s3_region: None,
            max_file_size: 100 * 1024 * 1024,
            allowed_types: vec![],
        };
        let storage = LocalStorage::new(&cfg).expect("create");
        // Any content type should be accepted when allowed_types is empty
        let result = storage.validate_file(b"hello", "application/octet-stream");
        assert!(
            result.is_ok(),
            "expected any content type to pass when allowed_types is empty"
        );
        let result2 = storage.validate_file(b"hello", "weird/type");
        assert!(result2.is_ok(), "expected weird content type to also pass");
        let _ = std::fs::remove_dir_all(&tmp);
    }
}
