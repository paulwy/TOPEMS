//! File（文件）服务 API trait 定义
//!
//! 注意：现有的 `FileServiceClient`（`lib/src/file_client.rs`）使用 `reqwest::multipart`
//! 处理文件上传，此处仅提供基于 JSON 的元数据查询方法作为示例。
//! 文件上传仍建议使用原有的 `FileServiceClient`。

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;
use uuid::Uuid;

define_service_api!(
    FileApi,
    "topems-file",
    8000,
    Some("FILE_SERVICE_URL"),
    "/api/core/file"
);

// ============ TypedServiceClient<FileApi> 业务方法 ============

impl TypedServiceClient<FileApi> {
    /// 获取文件元数据
    pub async fn get_file(&self, file_id: Uuid) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/files/{}", file_id);
        self.get_and_unwrap(&self.build_path(&path)).await
    }

    /// 删除文件
    pub async fn delete_file(&self, file_id: Uuid) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/files/{}", file_id);
        self.delete(&self.build_path(&path)).await
    }

    /// 列出文件
    pub async fn list_files(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/files?page={}&page_size={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取文件下载 URL
    pub fn get_download_url(&self, file_id: Uuid) -> String {
        format!("{}{}", self.base_url(), self.build_path(&format!("/download/{}", file_id)))
    }
}
