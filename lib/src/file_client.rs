use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::response::ApiResponse;

/// File 服务 HTTP 客户端
#[derive(Clone)]
pub struct FileServiceClient {
    base_url: String,
    client: Client,
}

/// 文件元数据响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadataResponse {
    pub id: Uuid,
    pub filename: String,
    pub storage_path: String,
    pub file_size: i64,
    pub content_type: String,
    pub owner_id: Uuid,
    pub owner_department_id: Option<Uuid>,
    pub file_type: String,
    pub category: Option<String>,
    pub version: i32,
    pub parent_id: Option<Uuid>,
    pub vector_status: String,
    pub vector_document_id: Option<Uuid>,
    pub is_shared: bool,
    pub visibility: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// 上传响应
#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResponse {
    pub file_id: Uuid,
    pub storage_path: String,
    pub filename: String,
    pub file_size: i64,
    pub content_type: String,
    pub vector_status: String,
}

impl FileServiceClient {
    /// 创建新的 File 服务客户端
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            client: Client::new(),
        }
    }

    /// 上传文件
    pub async fn upload_file(
        &self,
        filename: &str,
        content: Vec<u8>,
        content_type: &str,
    ) -> anyhow::Result<UploadResponse> {
        let part = reqwest::multipart::Part::bytes(content)
            .file_name(filename.to_string())
            .mime_str(content_type)
            .map_err(|e| anyhow::anyhow!("Invalid mime type: {}", e))?;

        let form = reqwest::multipart::Form::new().part("file", part);

        let response = self
            .client
            .post(format!("{}/api/v1/files/upload", self.base_url))
            .multipart(form)
            .send()
            .await?;

        let api_response: ApiResponse<UploadResponse> = response.json().await?;
        api_response.data.ok_or_else(|| anyhow::anyhow!("Empty response data"))
    }

    /// 上传文件（带 external_id）
    pub async fn upload_file_with_id(
        &self,
        filename: &str,
        content: Vec<u8>,
        content_type: &str,
        external_id: Uuid,
    ) -> anyhow::Result<UploadResponse> {
        let part = reqwest::multipart::Part::bytes(content)
            .file_name(filename.to_string())
            .mime_str(content_type)
            .map_err(|e| anyhow::anyhow!("Invalid mime type: {}", e))?;

        let form = reqwest::multipart::Form::new()
            .text("external_id", external_id.to_string())
            .part("file", part);

        let response = self
            .client
            .post(format!("{}/api/v1/files/upload", self.base_url))
            .multipart(form)
            .send()
            .await?;

        let api_response: ApiResponse<UploadResponse> = response.json().await?;
        api_response.data.ok_or_else(|| anyhow::anyhow!("Empty response data"))
    }

    /// 获取文件元数据
    pub async fn get_file(&self, file_id: Uuid) -> anyhow::Result<FileMetadataResponse> {
        let response = self
            .client
            .get(format!("{}/api/v1/files/{}", self.base_url, file_id))
            .send()
            .await?;

        let api_response: ApiResponse<FileMetadataResponse> = response.json().await?;
        api_response.data.ok_or_else(|| anyhow::anyhow!("Empty response data"))
    }

    /// 下载文件
    pub async fn download_file(&self, file_id: Uuid) -> anyhow::Result<Vec<u8>> {
        let response = self
            .client
            .get(format!("{}/api/v1/files/{}/download", self.base_url, file_id))
            .send()
            .await?;

        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    /// 删除文件
    pub async fn delete_file(&self, file_id: Uuid) -> anyhow::Result<()> {
        let response = self
            .client
            .delete(format!("{}/api/v1/files/{}", self.base_url, file_id))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(anyhow::anyhow!("Delete failed with status: {}", response.status()))
        }
    }
}
