use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

/// File 服务 HTTP 客户端
#[derive(Clone)]
pub struct FileServiceClient {
    base_url: String,
    client: Client,
    /// 可选的 Authorization token
    auth_token: Option<String>,
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

/// 上传响应（与 File 服务的 FileMetadata 匹配）
#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResponse {
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

impl FileServiceClient {
    /// 创建新的 File 服务客户端
    pub fn new(base_url: &str) -> Self {
        // 配置带超时和代理设置的客户端
        // 对于大文件上传，使用更长的超时时间
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300)) // 总超时 5 分钟
            .connect_timeout(std::time::Duration::from_secs(30)) // 连接超时 30 秒
            .pool_idle_timeout(std::time::Duration::from_secs(60)) // 连接池空闲超时
            .tcp_keepalive(std::time::Duration::from_secs(30)) // TCP keep-alive
            .tcp_nodelay(true) // 禁用 Nagle 算法，加快小包传输
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            client,
            auth_token: None,
        }
    }

    /// 设置 Authorization token
    pub fn with_token(mut self, token: &str) -> Self {
        self.auth_token = Some(token.to_string());
        self
    }

    /// 添加 Authorization header 到请求
    fn add_auth_header(&self, request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        if let Some(ref token) = self.auth_token {
            request.header("Authorization", format!("Bearer {}", token))
        } else {
            request
        }
    }

    /// 上传文件
    pub async fn upload_file(
        &self,
        filename: &str,
        content: Vec<u8>,
        content_type: &str,
    ) -> anyhow::Result<UploadResponse> {
        let content_length = content.len();
        let part = reqwest::multipart::Part::bytes(content)
            .file_name(filename.to_string())
            .mime_str(content_type)
            .map_err(|e| anyhow::anyhow!("Invalid mime type: {}", e))?;

        let form = reqwest::multipart::Form::new().part("file", part);

        let url = format!("{}/api/core/file/upload", self.base_url);
        tracing::debug!("Uploading file to: {} ({} bytes)", url, content_length);

        let request = self.client.post(&url).multipart(form);

        tracing::debug!("Sending request to file service...");
        let response = self.add_auth_header(request).send().await
            .map_err(|e| anyhow::anyhow!(
                "Failed to send request to {}: {}. This could be due to: (1) Connection refused (2) DNS resolution failure (3) Timeout (4) Proxy issues",
                url, e
            ))?;

        // 获取原始响应文本用于调试
        let status = response.status();
        tracing::debug!("File service response status: {}", status);
        let text = response.text().await?;

        if !status.is_success() {
            return Err(anyhow::anyhow!(
                "File service returned status {}: {}",
                status,
                text
            ));
        }

        let api_response: ApiResponse<UploadResponse> = serde_json::from_str(&text)
            .map_err(|e| anyhow::anyhow!("Failed to parse response: {}, raw: {}", e, text))?;
        api_response
            .data
            .ok_or_else(|| anyhow::anyhow!("Empty response data"))
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

        let request = self
            .client
            .post(format!("{}/api/core/file/upload", self.base_url))
            .multipart(form);

        let response = self.add_auth_header(request).send().await?;

        let api_response: ApiResponse<UploadResponse> = response.json().await?;
        api_response
            .data
            .ok_or_else(|| anyhow::anyhow!("Empty response data"))
    }

    /// 获取文件元数据
    pub async fn get_file(&self, file_id: Uuid) -> anyhow::Result<FileMetadataResponse> {
        let request = self
            .client
            .get(format!("{}/api/core/file/files/{}", self.base_url, file_id));

        let response = self.add_auth_header(request).send().await?;

        let api_response: ApiResponse<FileMetadataResponse> = response.json().await?;
        api_response
            .data
            .ok_or_else(|| anyhow::anyhow!("Empty response data"))
    }

    /// 下载文件
    pub async fn download_file(&self, file_id: Uuid) -> anyhow::Result<Vec<u8>> {
        let request = self.client.get(format!(
            "{}/api/core/file/download/{}",
            self.base_url, file_id
        ));

        let response = self.add_auth_header(request).send().await?;

        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    /// 删除文件
    pub async fn delete_file(&self, file_id: Uuid) -> anyhow::Result<()> {
        let request = self
            .client
            .delete(format!("{}/api/core/file/files/{}", self.base_url, file_id));

        let response = self.add_auth_header(request).send().await?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(anyhow::anyhow!(
                "Delete failed with status: {}",
                response.status()
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    fn ts() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 8, 15, 14, 0, 0).unwrap()
    }

    fn sample_metadata() -> FileMetadataResponse {
        FileMetadataResponse {
            id: Uuid::parse_str("aaaabbbb-cccc-dddd-eeee-ffffffffffff").unwrap(),
            filename: "report.pdf".into(),
            storage_path: "/uploads/2026/08/report.pdf".into(),
            file_size: 1048576,
            content_type: "application/pdf".into(),
            owner_id: Uuid::parse_str("11112222-3333-4444-5555-666677778888").unwrap(),
            owner_department_id: Some(
                Uuid::parse_str("99990000-1111-2222-3333-444455556666").unwrap(),
            ),
            file_type: "document".into(),
            category: Some("financial".into()),
            version: 3,
            parent_id: None,
            vector_status: "indexed".into(),
            vector_document_id: Some(
                Uuid::parse_str("aaaabbbb-1111-2222-3333-444455556666").unwrap(),
            ),
            is_shared: true,
            visibility: "internal".into(),
            status: "active".into(),
            created_at: ts(),
            updated_at: ts(),
            deleted_at: None,
        }
    }

    fn sample_upload() -> UploadResponse {
        UploadResponse {
            id: Uuid::parse_str("aaaabbbb-cccc-dddd-eeee-ffffffffffff").unwrap(),
            filename: "report.pdf".into(),
            storage_path: "/uploads/2026/08/report.pdf".into(),
            file_size: 1048576,
            content_type: "application/pdf".into(),
            owner_id: Uuid::parse_str("11112222-3333-4444-5555-666677778888").unwrap(),
            owner_department_id: Some(
                Uuid::parse_str("99990000-1111-2222-3333-444455556666").unwrap(),
            ),
            file_type: "document".into(),
            category: Some("financial".into()),
            version: 1,
            parent_id: None,
            vector_status: "pending".into(),
            vector_document_id: None,
            is_shared: false,
            visibility: "private".into(),
            status: "active".into(),
            created_at: ts(),
            updated_at: ts(),
            deleted_at: None,
        }
    }

    #[test]
    fn file_metadata_roundtrip_full() {
        let m = sample_metadata();
        let back = rt(&m);
        assert_eq!(back.id, m.id);
        assert_eq!(back.filename, "report.pdf");
        assert_eq!(back.file_size, 1048576);
        assert_eq!(back.content_type, "application/pdf");
        assert_eq!(back.version, 3);
        assert!(back.is_shared);
        assert_eq!(back.visibility, "internal");
        assert_eq!(back.vector_status, "indexed");
        assert!(back.parent_id.is_none());
        assert!(back.deleted_at.is_none());
    }

    #[test]
    fn file_metadata_with_all_optionals() {
        let mut m = sample_metadata();
        m.parent_id = Some(Uuid::parse_str("12341234-5678-90ab-cdef-1234567890ab").unwrap());
        m.category = None;
        m.deleted_at = Some(Utc.with_ymd_and_hms(2026, 8, 20, 0, 0, 0).unwrap());
        let back = rt(&m);
        assert!(back.parent_id.is_some());
        assert!(back.category.is_none());
        assert!(back.deleted_at.is_some());
    }

    #[test]
    fn upload_response_roundtrip() {
        let u = sample_upload();
        let back = rt(&u);
        assert_eq!(back.id, u.id);
        assert_eq!(back.filename, "report.pdf");
        assert_eq!(back.version, 1);
        assert!(!back.is_shared);
        assert_eq!(back.visibility, "private");
        assert_eq!(back.vector_status, "pending");
    }
}
