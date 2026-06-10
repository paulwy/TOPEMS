use std::path::{Path, PathBuf};
use std::sync::Arc;
use thiserror::Error;
use tracing::{debug, info};
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Configuration error: {0}")]
    Config(String),
}

#[derive(Clone)]
pub struct StorageService {
    base_path: Arc<PathBuf>,
}

impl StorageService {
    pub fn new_local(base_path: impl AsRef<Path>) -> Result<Self, StorageError> {
        let base_path = base_path.as_ref().to_path_buf();
        if !base_path.exists() {
            std::fs::create_dir_all(&base_path)?;
        }
        Ok(Self { 
            base_path: Arc::new(base_path)
        })
    }

    pub async fn from_env() -> Result<Self, StorageError> {
        // 使用项目根目录的相对路径
        let base_path = std::env::var("STORAGE_LOCAL_PATH")
            .unwrap_or_else(|_| "./storage/files".to_string());
        
        let base_path = std::path::Path::new(&base_path);
        let base_path = if base_path.is_absolute() {
            base_path.to_path_buf()
        } else {
            let current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::Path::new(".").to_path_buf());
            current_dir.join(base_path)
        };
        
        info!("Using local storage at: {:?}", base_path);
        Self::new_local(base_path)
    }

    fn get_file_path(&self, key: &str) -> PathBuf {
        let sanitized_key: String = key
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.' || c == '/' {
                c
            } else {
                '_'
            })
            .collect();
        self.base_path.join(sanitized_key)
    }

    pub async fn save_file(&self, id: &Uuid, data: &[u8]) -> Result<String, StorageError> {
        let key = format!("{}/{}", id, id);
        let path = self.get_file_path(&key);
        
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                tokio::fs::create_dir_all(parent).await?;
            }
        }
        
        tokio::fs::write(&path, data).await?;
        
        debug!("File saved to local storage: {:?}", path);
        
        Ok(path.to_string_lossy().to_string())
    }

    pub async fn load_file(&self, id: &Uuid) -> Result<Vec<u8>, StorageError> {
        let key = format!("{}/{}", id, id);
        let path = self.get_file_path(&key);
        let data = tokio::fs::read(&path).await?;
        debug!("File loaded from local storage: {:?}", path);
        Ok(data)
    }

    pub async fn delete_file(&self, id: &Uuid) -> Result<(), StorageError> {
        let key = format!("{}/{}", id, id);
        let path = self.get_file_path(&key);
        tokio::fs::remove_file(&path).await?;
        debug!("File deleted from local storage: {:?}", path);
        Ok(())
    }

    pub fn get_backend_type(&self) -> &'static str {
        "local"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_storage_service_creation() {
        let temp_dir = tempdir().unwrap();
        let service = StorageService::new_local(temp_dir.path());
        assert!(service.is_ok());
    }

    #[tokio::test]
    async fn test_save_and_load_file() {
        let temp_dir = tempdir().unwrap();
        let service = StorageService::new_local(temp_dir.path()).unwrap();
        
        let test_id = Uuid::new_v4();
        let test_data = b"Hello, TOPEMS!";
        
        // 测试保存文件
        let save_result = service.save_file(&test_id, test_data).await;
        assert!(save_result.is_ok());
        
        // 测试加载文件
        let load_result = service.load_file(&test_id).await;
        assert!(load_result.is_ok());
        assert_eq!(load_result.unwrap(), test_data);
    }

    #[tokio::test]
    async fn test_delete_file() {
        let temp_dir = tempdir().unwrap();
        let service = StorageService::new_local(temp_dir.path()).unwrap();
        
        let test_id = Uuid::new_v4();
        let test_data = b"Test data";
        
        // 保存文件
        service.save_file(&test_id, test_data).await.unwrap();
        
        // 删除文件
        let delete_result = service.delete_file(&test_id).await;
        assert!(delete_result.is_ok());
        
        // 验证文件已被删除
        let load_result = service.load_file(&test_id).await;
        assert!(load_result.is_err());
    }

    #[tokio::test]
    async fn test_get_backend_type() {
        let temp_dir = tempdir().unwrap();
        let service = StorageService::new_local(temp_dir.path()).unwrap();
        assert_eq!(service.get_backend_type(), "local");
    }
}
