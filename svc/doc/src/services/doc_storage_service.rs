use std::path::{Path, PathBuf};
use thiserror::Error;
use tracing::{debug, info};
use uuid::Uuid;

use topems_shared::file_client::FileServiceClient;

/// 文档存储服务错误类型
#[derive(Debug, Error)]
pub enum DocStorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Configuration error: {0}")]
    Config(String),
    #[error("File service error: {0}")]
    FileService(String),
}

/// 文档存储服务 - 封装 File 服务客户端
#[derive(Clone)]
pub struct DocStorageService {
    file_client: FileServiceClient,
    /// 本地缓存路径（用于临时文件）
    cache_path: PathBuf,
}

impl DocStorageService {
    /// 创建使用 File 服务的存储服务
    pub fn new(file_service_url: &str) -> Self {
        Self {
            file_client: FileServiceClient::new(file_service_url),
            cache_path: PathBuf::from("./storage/doc_cache"),
        }
    }

    /// 从环境变量创建
    pub async fn from_env() -> Result<Self, DocStorageError> {
        let file_service_url = std::env::var("FILE_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8055".to_string());

        let cache_path = std::env::var("DOC_CACHE_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("./storage/doc_cache"));

        // 确保缓存目录存在
        if !cache_path.exists() {
            std::fs::create_dir_all(&cache_path)?;
        }

        info!("Using DocStorageService with File service at: {}", file_service_url);

        Ok(Self {
            file_client: FileServiceClient::new(&file_service_url),
            cache_path,
        })
    }

    /// 上传文件到 File 服务
    pub async fn upload_to_file_service(
        &self,
        filename: &str,
        data: Vec<u8>,
        content_type: &str,
    ) -> Result<topems_shared::file_client::UploadResponse, DocStorageError> {
        debug!("Uploading file to File service: {}", filename);

        self.file_client
            .upload_file(filename, data, content_type)
            .await
            .map_err(|e| DocStorageError::FileService(e.to_string()))
    }

    /// 上传文件到 File 服务（带 external_id）
    pub async fn upload_to_file_service_with_id(
        &self,
        filename: &str,
        data: Vec<u8>,
        content_type: &str,
        external_id: Uuid,
    ) -> Result<topems_shared::file_client::UploadResponse, DocStorageError> {
        debug!("Uploading file to File service with ID: {}", filename);

        self.file_client
            .upload_file_with_id(filename, data, content_type, external_id)
            .await
            .map_err(|e| DocStorageError::FileService(e.to_string()))
    }

    /// 从 File 服务下载文件
    pub async fn download_from_file_service(&self, file_id: Uuid) -> Result<Vec<u8>, DocStorageError> {
        debug!("Downloading file from File service: {}", file_id);

        self.file_client
            .download_file(file_id)
            .await
            .map_err(|e| DocStorageError::FileService(e.to_string()))
    }

    /// 从 File 服务获取文件元数据
    pub async fn get_file_metadata(
        &self,
        file_id: Uuid,
    ) -> Result<topems_shared::file_client::FileMetadataResponse, DocStorageError> {
        debug!("Getting file metadata from File service: {}", file_id);

        self.file_client
            .get_file(file_id)
            .await
            .map_err(|e| DocStorageError::FileService(e.to_string()))
    }

    /// 从 File 服务删除文件
    pub async fn delete_from_file_service(&self, file_id: Uuid) -> Result<(), DocStorageError> {
        debug!("Deleting file from File service: {}", file_id);

        self.file_client
            .delete_file(file_id)
            .await
            .map_err(|e| DocStorageError::FileService(e.to_string()))
    }

    /// 保存文件到本地缓存
    pub async fn save_to_cache(&self, id: &Uuid, data: &[u8]) -> Result<PathBuf, DocStorageError> {
        let cache_file = self.cache_path.join(id.to_string());
        if let Some(parent) = cache_file.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        tokio::fs::write(&cache_file, data).await?;
        debug!("File saved to cache: {:?}", cache_file);
        Ok(cache_file)
    }

    /// 从本地缓存加载文件
    pub async fn load_from_cache(&self, id: &Uuid) -> Result<Vec<u8>, DocStorageError> {
        let cache_file = self.cache_path.join(id.to_string());
        let data = tokio::fs::read(&cache_file).await?;
        debug!("File loaded from cache: {:?}", cache_file);
        Ok(data)
    }

    /// 从本地缓存删除文件
    pub async fn delete_from_cache(&self, id: &Uuid) -> Result<(), DocStorageError> {
        let cache_file = self.cache_path.join(id.to_string());
        if cache_file.exists() {
            tokio::fs::remove_file(&cache_file).await?;
            debug!("File deleted from cache: {:?}", cache_file);
        }
        Ok(())
    }

    /// 获取后端类型
    pub fn get_backend_type(&self) -> &'static str {
        "file-service"
    }
}
