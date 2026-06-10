use async_trait::async_trait;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tracing::{debug, info};

use super::traits::{FileMetadata, FileStorage, StorageError, StorageResult};

pub struct LocalStorage {
    base_path: PathBuf,
}

impl LocalStorage {
    pub fn new(base_path: &str) -> Result<Self, StorageError> {
        let base_path = PathBuf::from(base_path);

        // 确保基础目录存在
        if !base_path.exists() {
            std::fs::create_dir_all(&base_path)
                .map_err(|e| StorageError::Io(e))?;
        }

        Ok(Self { base_path })
    }

    fn resolve_path(&self, path: &str) -> Result<PathBuf, StorageError> {
        let full_path = self.base_path.join(path);

        // 安全检查：确保路径在基础目录内
        if !full_path.starts_with(&self.base_path) {
            return Err(StorageError::InvalidPath(format!(
                "Path {} is outside base directory",
                path
            )));
        }

        Ok(full_path)
    }

    fn ensure_parent_dir(&self, path: &Path) -> Result<(), StorageError> {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).await
                    .map_err(|e| StorageError::Io(e))?;
            }
        }
        Ok(())
    }
}

#[async_trait]
impl FileStorage for LocalStorage {
    async fn upload(&self, path: &str, data: &[u8]) -> Result<StorageResult, StorageError> {
        let full_path = self.resolve_path(path)?;

        // 确保父目录存在
        self.ensure_parent_dir(&full_path).await?;

        // 写入文件
        let mut file = fs::File::create(&full_path).await
            .map_err(|e| StorageError::Io(e))?;

        file.write_all(data).await
            .map_err(|e| StorageError::Io(e))?;

        file.flush().await
            .map_err(|e| StorageError::Io(e))?;

        let size = data.len() as u64;
        let etag = format!("{:x}", md5::compute(data));

        debug!("Uploaded file to {} ({} bytes)", path, size);

        Ok(StorageResult {
            path: path.to_string(),
            size,
            etag: Some(etag),
        })
    }

    async fn download(&self, path: &str) -> Result<Vec<u8>, StorageError> {
        let full_path = self.resolve_path(path)?;

        if !full_path.exists() {
            return Err(StorageError::NotFound(path.to_string()));
        }

        let data = fs::read(&full_path).await
            .map_err(|e| StorageError::Io(e))?;

        debug!("Downloaded file from {} ({} bytes)", path, data.len());

        Ok(data)
    }

    async fn delete(&self, path: &str) -> Result<(), StorageError> {
        let full_path = self.resolve_path(path)?;

        if !full_path.exists() {
            // 文件不存在，视为删除成功
            return Ok(());
        }

        fs::remove_file(&full_path).await
            .map_err(|e| StorageError::Io(e))?;

        debug!("Deleted file at {}", path);

        // 尝试删除空目录
        if let Some(parent) = full_path.parent() {
            if parent.starts_with(&self.base_path) && parent != self.base_path {
                if let Ok(mut entries) = fs::read_dir(parent).await {
                    if entries.next_entry().await.map_err(|e| StorageError::Io(e))?.is_none() {
                        let _ = fs::remove_dir(parent).await;
                    }
                }
            }
        }

        Ok(())
    }

    async fn exists(&self, path: &str) -> Result<bool, StorageError> {
        let full_path = self.resolve_path(path)?;
        Ok(full_path.exists())
    }

    fn backend_type(&self) -> &'static str {
        "local"
    }

    fn base_path(&self) -> &str {
        self.base_path.to_str().unwrap_or("./")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_local_storage_upload_download() {
        let temp_dir = TempDir::new().unwrap();
        let storage = LocalStorage::new(temp_dir.path().to_str().unwrap()).unwrap();

        let path = "test/file.txt";
        let data = b"Hello, World!";

        // Upload
        let result = storage.upload(path, data).await.unwrap();
        assert_eq!(result.path, path);
        assert_eq!(result.size, 13);

        // Exists
        assert!(storage.exists(path).await.unwrap());

        // Download
        let downloaded = storage.download(path).await.unwrap();
        assert_eq!(downloaded, data);

        // Delete
        storage.delete(path).await.unwrap();
        assert!(!storage.exists(path).await.unwrap());
    }

    #[tokio::test]
    async fn test_local_storage_invalid_path() {
        let temp_dir = TempDir::new().unwrap();
        let storage = LocalStorage::new(temp_dir.path().to_str().unwrap()).unwrap();

        // 尝试路径遍历攻击
        let result = storage.upload("../etc/passwd", b"malicious").await;
        assert!(result.is_err());
    }
}
