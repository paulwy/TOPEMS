use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct SendNotificationRequest {
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
    pub send_email: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct BroadcastNotificationRequest {
    pub user_ids: Vec<Uuid>,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
    pub send_email: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct NotificationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub is_read: Option<bool>,
    pub notification_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: String,
    pub is_read: bool,
    pub priority: i32,
    pub data: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct BulkIdsRequest {
    pub notification_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ArchiveConfig {
    pub enabled: bool,
    pub retention_days: i32,
    pub auto_archive_enabled: bool,
    pub auto_archive_interval_days: i32,
    pub auto_archive_days: i32,
}
