use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::{config::ServiceConfig, Result, TopemsError};

/// Notification type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
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

/// Create notification request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub priority: Option<i16>,
}

/// Notification response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub is_read: bool,
    pub priority: i16,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Template status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TemplateStatus {
    Active,
    Inactive,
    Deprecated,
}

/// Notification template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub notification_type: NotificationType,
    pub title_template: String,
    pub content_template: String,
    pub data_schema: Option<serde_json::Value>,
    pub default_priority: i16,
    pub status: TemplateStatus,
    pub is_archived: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Create template request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub notification_type: NotificationType,
    pub title_template: String,
    pub content_template: String,
    pub data_schema: Option<serde_json::Value>,
    pub default_priority: Option<i16>,
}

/// Render template request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderTemplateRequest {
    pub template_id: Uuid,
    pub user_id: String,
    pub variables: serde_json::Value,
    pub priority: Option<i16>,
}

/// Archive config
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveConfig {
    pub auto_archive_days: i32,
    pub retention_days: i32,
    pub enabled: bool,
}

/// Notification stats
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

/// Notification service client
#[derive(Clone)]
pub struct NotificationServiceClient {
    client: Client,
    base_url: String,
}

impl NotificationServiceClient {
    /// Create a new notification service client
    pub fn new(config: &ServiceConfig) -> Self {
        let base_url = format!("http://localhost:{}", config.port);
        Self {
            client: Client::new(),
            base_url,
        }
    }

    /// Create a new notification service client with custom base URL
    pub fn with_base_url(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    /// Create a notification
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

    /// Create notification template
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

    /// Render template and create notification
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

    /// Get notification stats
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

    /// Get user-specific stats
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

    /// Get archive config
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

    /// Update archive config
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

    /// Run auto-archive
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

/// Shared notification service client holder
#[derive(Clone)]
pub struct NotificationServiceState {
    pub client: Arc<NotificationServiceClient>,
}

impl NotificationServiceState {
    /// Create a new notification service state from config
    pub fn from_config(config: &ServiceConfig) -> Self {
        Self {
            client: Arc::new(NotificationServiceClient::new(config)),
        }
    }
}
