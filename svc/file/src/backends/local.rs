use async_trait::async_trait;
use md5;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWriteExt};
use tracing::debug;

use super::traits::{FileStorage, StorageError, StorageResult};

pub struct LocalStorage {
    base_path: PathBuf,
}

impl LocalStorage {
    pub fn new(base_path: &str) -> Result<Self, StorageError> {
        let base_path = PathBuf::from(base_path);

        // 确保基础目录存在
        if !base_path.exists() {
            std::fs::create_dir_all(&base_path).map_err(StorageError::Io)?;
        }

        Ok(Self { base_path })
    }

    fn resolve_path(&self, path: &str) -> Result<PathBuf, StorageError> {
        let full_path = self.base_path.join(path);

        // 安全检查：确保路径在基础目录内
        // 规范化路径以处理 .. 组件
        let canonical_base = self.base_path.canonicalize().map_err(|e| {
            StorageError::InvalidPath(format!("Failed to canonicalize base path: {}", e))
        })?;

        // 构建规范化路径：从 canonical_base 开始，然后添加 full_path 的相对组件
        let mut normalized_path = canonical_base.as_os_str().to_os_string();
        let base_components: Vec<_> = self.base_path.components().collect();
        let full_components = full_path.components();

        for component in full_components {
            // 跳过属于 base_path 的组件
            if base_components.contains(&component) {
                continue;
            }
            match component {
                std::path::Component::ParentDir => {
                    if let Some(parent) = std::path::Path::new(&normalized_path).parent() {
                        // 确保不会 pop 到 base_path 之下
                        let parent_components: Vec<_> = parent.components().collect();
                        if parent_components.len() >= base_components.len() {
                            normalized_path = parent.as_os_str().to_os_string();
                        }
                    }
                }
                std::path::Component::Normal(name) => {
                    normalized_path.push(std::path::MAIN_SEPARATOR_STR);
                    normalized_path.push(name);
                }
                std::path::Component::RootDir => {
                    // 不应该到达这里，因为我们跳过了 base_path 的组件
                }
                _ => {}
            }
        }

        let normalized_full = std::path::Path::new(&normalized_path);

        if !normalized_full.starts_with(&canonical_base) {
            return Err(StorageError::InvalidPath(format!(
                "Path {} is outside base directory",
                path
            )));
        }

        Ok(full_path)
    }

    async fn ensure_parent_dir(&self, path: &Path) -> Result<(), StorageError> {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).await.map_err(StorageError::Io)?;
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
        let mut file = fs::File::create(&full_path)
            .await
            .map_err(StorageError::Io)?;

        file.write_all(data).await.map_err(StorageError::Io)?;

        file.flush().await.map_err(StorageError::Io)?;

        let size = data.len() as u64;
        let etag = format!("{:x}", md5::compute(data));

        debug!("Uploaded file to {} ({} bytes)", path, size);

        Ok(StorageResult {
            path: path.to_string(),
            size,
            etag: Some(etag),
        })
    }

    async fn upload_stream(
        &self,
        path: &str,
        mut reader: Box<dyn AsyncRead + Send + Unpin>,
        _size: u64,
    ) -> Result<StorageResult, StorageError> {
        let full_path = self.resolve_path(path)?;

        // 确保父目录存在
        self.ensure_parent_dir(&full_path).await?;

        // 创建文件
        let mut file = fs::File::create(&full_path)
            .await
            .map_err(StorageError::Io)?;

        // 使用流式写入
        let mut written: u64 = 0;
        let mut buffer = vec![0u8; 81920]; // 80KB buffer

        loop {
            let bytes_read = reader.read(&mut buffer).await.map_err(StorageError::Io)?;
            if bytes_read == 0 {
                break;
            }
            file.write_all(&buffer[..bytes_read])
                .await
                .map_err(StorageError::Io)?;
            written += bytes_read as u64;
        }

        file.flush().await.map_err(StorageError::Io)?;

        // 对于流式上传，跳过 etag 计算
        debug!("Uploaded file stream to {} ({} bytes)", path, written);

        Ok(StorageResult {
            path: path.to_string(),
            size: written,
            etag: None,
        })
    }

    async fn download(&self, path: &str) -> Result<Vec<u8>, StorageError> {
        let full_path = self.resolve_path(path)?;

        if !full_path.exists() {
            return Err(StorageError::NotFound(path.to_string()));
        }

        let data = fs::read(&full_path).await.map_err(StorageError::Io)?;

        debug!("Downloaded file from {} ({} bytes)", path, data.len());

        Ok(data)
    }

    async fn delete(&self, path: &str) -> Result<(), StorageError> {
        let full_path = self.resolve_path(path)?;

        if !full_path.exists() {
            // 文件不存在，视为删除成功
            return Ok(());
        }

        fs::remove_file(&full_path)
            .await
            .map_err(StorageError::Io)?;

        debug!("Deleted file at {}", path);

        // 尝试删除空目录
        if let Some(parent) = full_path.parent() {
            if parent.starts_with(&self.base_path) && parent != self.base_path {
                if let Ok(mut entries) = fs::read_dir(parent).await {
                    if entries
                        .next_entry()
                        .await
                        .map_err(StorageError::Io)?
                        .is_none()
                    {
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
