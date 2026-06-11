use async_trait::async_trait;
use std::time::Duration;
use thiserror::Error;
use tokio::io::AsyncRead;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("File not found: {0}")]
    NotFound(String),
    #[error("Storage backend error: {0}")]
    Backend(String),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

/// 存储操作结果
#[derive(Debug, Clone)]
pub struct StorageResult {
    pub path: String,
    pub size: u64,
    pub etag: Option<String>,
}

/// 文件元数据
#[derive(Debug, Clone)]
pub struct FileMetadata {
    pub path: String,
    pub size: u64,
    pub content_type: String,
    pub last_modified: Option<time::OffsetDateTime>,
}

#[async_trait]
pub trait FileStorage: Send + Sync {
    /// 上传文件
    async fn upload(&self, path: &str, data: &[u8]) -> Result<StorageResult, StorageError>;

    /// 流式上传文件（边收边传）
    async fn upload_stream(&self, path: &str, reader: Box<dyn AsyncRead + Send + Unpin>, size: u64) -> Result<StorageResult, StorageError>;

    /// 下载文件
    async fn download(&self, path: &str) -> Result<Vec<u8>, StorageError>;

    /// 删除文件
    async fn delete(&self, path: &str) -> Result<(), StorageError>;

    /// 检查文件是否存在
    async fn exists(&self, path: &str) -> Result<bool, StorageError>;

    /// 生成预签名 URL（用于 S3/MinIO）
    async fn presigned_url(&self, path: &str, _expires_in: Duration) -> Result<String, StorageError> {
        Err(StorageError::Backend("Presigned URL not supported for this backend".to_string()))
    }

    /// 获取存储类型
    fn backend_type(&self) -> &'static str;

    /// 获取基础路径
    fn base_path(&self) -> &str;
}
