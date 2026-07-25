use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub user_id: String,
    pub notification_type: String,
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    pub is_read: bool,
    pub priority: i32,
    #[serde(default)]
    pub link_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(default)]
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub page: i32,
    pub pagesize: i32,
    pub unread_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationStats {
    pub total: i64,
    pub unread: i64,
    pub by_type: std::collections::HashMap<String, i64>,
    pub by_priority: std::collections::HashMap<i32, i64>,
    pub total_notifications: i64,
    pub notifications_by_type: std::collections::HashMap<String, i64>,
    pub notifications_by_day: std::collections::HashMap<String, i64>,
    pub unread_notifications: i64,
    pub read_notifications: i64,
    pub archived_notifications: i64,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub notification_type: Option<String>,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    #[serde(default)]
    pub priority: Option<i32>,
    #[serde(default)]
    pub link_url: Option<String>,
}

#[derive(Clone)]
pub struct NotificationSvcClient {
    base_client: BaseServiceClient,
}

impl NotificationSvcClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
        })
    }

    pub fn from_env() -> ServiceClientResult<Self> {
        let base_url = std::env::var("NOTIFICATION_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8000".into());
        Self::new(base_url)
    }

    pub fn set_auth_token(&mut self, token: impl Into<String>) {
        self.base_client.set_auth_token(token);
    }

    pub fn with_auth_token(mut self, token: impl Into<String>) -> Self {
        self.base_client.set_auth_token(token);
        self
    }

    pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.base_client.add_header(key, value);
    }

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn list_notifications(
        &self,
        page: i32,
        page_size: i32,
        notification_type: Option<&str>,
    ) -> ServiceClientResult<NotificationListResponse> {
        let mut path = format!(
            "/api/core/notification/notifications?page={}&pagesize={}",
            page, page_size
        );
        if let Some(nt) = notification_type {
            path.push_str(&format!("&notification_type={}", nt));
        }
        self.base_client.get(&path).await
    }

    pub async fn get_unread(&self) -> ServiceClientResult<Vec<Notification>> {
        self.base_client
            .get("/api/core/notification/notifications/unread")
            .await
    }

    pub async fn get_unread_count(&self) -> ServiceClientResult<i32> {
        self.base_client
            .get("/api/core/notification/notifications/unread-count")
            .await
    }

    pub async fn mark_as_read(&self, id: &str) -> ServiceClientResult<Notification> {
        self.base_client
            .put(&format!("/api/core/notification/notifications/{}", id), &())
            .await
    }

    pub async fn mark_all_as_read(&self) -> ServiceClientResult<i32> {
        self.base_client
            .put("/api/core/notification/notifications/read-all", &())
            .await
    }

    pub async fn create_notification(
        &self,
        req: &CreateNotificationRequest,
    ) -> ServiceClientResult<Notification> {
        self.base_client
            .post("/api/core/notification/notifications", req)
            .await
    }

    pub async fn delete_notification(&self, id: &str) -> ServiceClientResult<bool> {
        self.base_client
            .delete(&format!("/api/core/notification/notifications/{}", id))
            .await
    }

    pub async fn get_stats(&self) -> ServiceClientResult<NotificationStats> {
        self.base_client
            .get("/api/core/notification/notifications/stats/me")
            .await
    }
}
