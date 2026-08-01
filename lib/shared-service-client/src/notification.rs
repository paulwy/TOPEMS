use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use topems_shared_core::{
    config::ServiceConfig,
    error::{Result, TopemsError},
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    #[serde(rename = "info")]
    #[default]
    Info,
    #[serde(rename = "success")]
    Success,
    #[serde(rename = "warning")]
    Warning,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "workflow")]
    Workflow,
    #[serde(rename = "reminder")]
    Reminder,
    #[serde(rename = "alert")]
    Alert,
    #[serde(rename = "message")]
    Message,
}

impl From<&str> for NotificationType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "info" => NotificationType::Info,
            "success" => NotificationType::Success,
            "warning" => NotificationType::Warning,
            "error" => NotificationType::Error,
            "system" => NotificationType::System,
            "workflow" => NotificationType::Workflow,
            "reminder" => NotificationType::Reminder,
            "alert" => NotificationType::Alert,
            "message" => NotificationType::Message,
            _ => NotificationType::Info,
        }
    }
}

impl std::fmt::Display for NotificationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NotificationType::Info => write!(f, "info"),
            NotificationType::Success => write!(f, "success"),
            NotificationType::Warning => write!(f, "warning"),
            NotificationType::Error => write!(f, "error"),
            NotificationType::System => write!(f, "system"),
            NotificationType::Workflow => write!(f, "workflow"),
            NotificationType::Reminder => write!(f, "reminder"),
            NotificationType::Alert => write!(f, "alert"),
            NotificationType::Message => write!(f, "message"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub link_url: Option<String>,
    pub is_read: bool,
    pub priority: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TemplateStatus {
    Active,
    Inactive,
    Deprecated,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub notification_type: NotificationType,
    pub title_template: String,
    pub content_template: String,
    pub data_schema: Option<serde_json::Value>,
    pub default_priority: i32,
    pub status: TemplateStatus,
    pub is_archived: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub notification_type: NotificationType,
    pub title_template: String,
    pub content_template: String,
    pub data_schema: Option<serde_json::Value>,
    pub default_priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderTemplateRequest {
    pub template_id: Uuid,
    pub user_id: String,
    pub variables: serde_json::Value,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveConfig {
    pub auto_archive_days: i32,
    pub retention_days: i32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
    pub unread_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub notification_type: Option<NotificationType>,
}

impl Default for NotificationListQuery {
    fn default() -> Self {
        Self {
            page: Some(1),
            page_size: Some(20),
            notification_type: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkOperationRequest {
    pub ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationStats {
    pub total_notifications: i64,
    pub unread_notifications: i64,
    pub read_notifications: i64,
    pub archived_notifications: i64,
    pub notifications_by_type: serde_json::Value,
    pub notifications_by_day: serde_json::Value,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Clone)]
pub struct NotificationServiceClient {
    client: Client,
    base_url: String,
}

impl NotificationServiceClient {
    pub fn new(config: &ServiceConfig) -> Self {
        let base_url = format!("http://localhost:{}", config.port);
        Self {
            client: Client::new(),
            base_url,
        }
    }

    pub fn with_base_url(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    pub async fn create_notification(
        &self,
        req: CreateNotificationRequest,
    ) -> Result<Notification> {
        let response = self
            .client
            .post(format!(
                "{}/api/core/notification/notifications",
                self.base_url
            ))
            .json(&req)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<Notification> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn create_template(
        &self,
        req: CreateTemplateRequest,
    ) -> Result<NotificationTemplate> {
        let response = self
            .client
            .post(format!(
                "{}/api/core/notification/notification-templates",
                self.base_url
            ))
            .json(&req)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<NotificationTemplate> =
            response
                .json()
                .await
                .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn render_template(&self, req: RenderTemplateRequest) -> Result<Notification> {
        let response = self
            .client
            .post(format!(
                "{}/api/core/notification/notification-templates/render",
                self.base_url
            ))
            .json(&req)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<Notification> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn get_stats(&self) -> Result<NotificationStats> {
        let response = self
            .client
            .get(format!(
                "{}/api/core/notification/notifications/stats",
                self.base_url
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<NotificationStats> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn get_my_stats(&self) -> Result<NotificationStats> {
        let response = self
            .client
            .get(format!(
                "{}/api/core/notification/notifications/stats/me",
                self.base_url
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<NotificationStats> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn get_archive_config(&self) -> Result<ArchiveConfig> {
        let response = self
            .client
            .get(format!(
                "{}/api/core/notification/notifications/archive/config",
                self.base_url
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<ArchiveConfig> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn update_archive_config(&self, config: ArchiveConfig) -> Result<ArchiveConfig> {
        let response = self
            .client
            .put(format!(
                "{}/api/core/notification/notifications/archive/config",
                self.base_url
            ))
            .json(&config)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<ArchiveConfig> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn run_auto_archive(&self) -> Result<serde_json::Value> {
        let response = self
            .client
            .post(format!(
                "{}/api/core/notification/notifications/archive/run",
                self.base_url
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<serde_json::Value> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    /// 获取通知列表
    pub async fn list_notifications(
        &self,
        query: &NotificationListQuery,
    ) -> Result<NotificationListResponse> {
        let mut url = format!("{}/api/core/notification/notifications?", self.base_url);
        if let Some(page) = query.page {
            url.push_str(&format!("page={}&", page));
        }
        if let Some(page_size) = query.page_size {
            url.push_str(&format!("page_size={}&", page_size));
        }
        if let Some(ref ntype) = query.notification_type {
            url.push_str(&format!("notification_type={}&", ntype));
        }

        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<NotificationListResponse> =
            response
                .json()
                .await
                .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 获取单个通知
    pub async fn get_notification(&self, id: &Uuid) -> Result<Notification> {
        let response = self
            .client
            .get(format!(
                "{}/api/core/notification/notifications/{}",
                self.base_url, id
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<Notification> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 标记通知为已读
    pub async fn mark_as_read(&self, id: &Uuid) -> Result<Notification> {
        let response = self
            .client
            .put(format!(
                "{}/api/core/notification/notifications/{}/read",
                self.base_url, id
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<Notification> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 标记所有通知为已读
    pub async fn mark_all_as_read(&self) -> Result<i64> {
        let response = self
            .client
            .put(format!(
                "{}/api/core/notification/notifications/read-all",
                self.base_url
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        #[derive(Deserialize)]
        struct CountResponse {
            count: i64,
        }
        #[derive(Deserialize)]
        struct ApiCountResponse {
            data: Option<CountResponse>,
            message: String,
        }

        let api_response: ApiCountResponse = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .map(|c| c.count)
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 删除通知
    pub async fn delete_notification(&self, id: &Uuid) -> Result<bool> {
        let response = self
            .client
            .delete(format!(
                "{}/api/core/notification/notifications/{}",
                self.base_url, id
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        #[derive(Deserialize)]
        struct BoolResponse {
            success: bool,
        }
        #[derive(Deserialize)]
        struct ApiBoolResponse {
            data: Option<BoolResponse>,
            message: String,
        }

        let api_response: ApiBoolResponse = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .map(|d| d.success)
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 获取未读通知
    pub async fn get_unread_notifications(&self) -> Result<Vec<Notification>> {
        let response = self
            .client
            .get(format!(
                "{}/api/core/notification/notifications/unread",
                self.base_url
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<Vec<Notification>> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 获取未读数量
    pub async fn get_unread_count(&self) -> Result<i64> {
        let response = self
            .client
            .get(format!(
                "{}/api/core/notification/notifications/unread-count",
                self.base_url
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<i64> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 批量标记已读
    pub async fn bulk_mark_as_read(&self, ids: &[String]) -> Result<i64> {
        let response = self
            .client
            .put(format!(
                "{}/api/core/notification/notifications/bulk/read",
                self.base_url
            ))
            .json(&BulkOperationRequest { ids: ids.to_vec() })
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<i64> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 批量删除通知
    pub async fn bulk_delete(&self, ids: &[String]) -> Result<i64> {
        let response = self
            .client
            .delete(format!(
                "{}/api/core/notification/notifications/bulk/delete",
                self.base_url
            ))
            .json(&BulkOperationRequest { ids: ids.to_vec() })
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<i64> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }
}

#[derive(Clone)]
pub struct NotificationServiceState {
    pub client: Arc<NotificationServiceClient>,
}

impl NotificationServiceState {
    pub fn from_config(config: &ServiceConfig) -> Self {
        Self {
            client: Arc::new(NotificationServiceClient::new(config)),
        }
    }
}
