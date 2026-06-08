use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::{config::ServiceConfig, Result, TopemsError};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    #[serde(rename = "info")]
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

impl Default for NotificationType {
    fn default() -> Self {
        NotificationType::Info
    }
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

impl ToString for NotificationType {
    fn to_string(&self) -> String {
        match self {
            NotificationType::Info => "info".to_string(),
            NotificationType::Success => "success".to_string(),
            NotificationType::Warning => "warning".to_string(),
            NotificationType::Error => "error".to_string(),
            NotificationType::System => "system".to_string(),
            NotificationType::Workflow => "workflow".to_string(),
            NotificationType::Reminder => "reminder".to_string(),
            NotificationType::Alert => "alert".to_string(),
            NotificationType::Message => "message".to_string(),
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

    pub async fn create_notification(&self, req: CreateNotificationRequest) -> Result<Notification> {
        let response = self
            .client
            .post(format!("{}/api/v1/notifications", self.base_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<Notification> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
    }

    pub async fn create_template(&self, req: CreateTemplateRequest) -> Result<NotificationTemplate> {
        let response = self
            .client
            .post(format!("{}/api/v1/templates", self.base_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<NotificationTemplate> = response
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
            .post(format!("{}/api/v1/templates/render", self.base_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<Notification> = response
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
            .get(format!("{}/api/v1/stats", self.base_url))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<NotificationStats> = response
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
            .get(format!("{}/api/v1/stats/me", self.base_url))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<NotificationStats> = response
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
            .get(format!("{}/api/v1/archive/config", self.base_url))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<ArchiveConfig> = response
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
            .put(format!("{}/api/v1/archive/config", self.base_url))
            .json(&config)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<ArchiveConfig> = response
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
            .post(format!("{}/api/v1/archive/auto", self.base_url))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to send request: {}", e)))?;

        let api_response: crate::response::ApiResponse<serde_json::Value> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        if let Some(data) = api_response.data {
            Ok(data)
        } else {
            Err(TopemsError::Internal(api_response.message))
        }
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