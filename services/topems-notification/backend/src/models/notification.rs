use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NotificationTypeEnum {
    Info,
    Success,
    Warning,
    Error,
    System,
}

impl Default for NotificationTypeEnum {
    fn default() -> Self {
        NotificationTypeEnum::Info
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub is_read: bool,
    pub priority: i32,
    pub data: Option<serde_json::Value>,
    pub link_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub notification_type: NotificationTypeEnum,
    #[serde(default = "default_priority")]
    pub priority: i32,
    pub data: Option<serde_json::Value>,
    pub link_url: Option<String>,
}

fn default_priority() -> i32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
    pub unread_count: i64,
}
