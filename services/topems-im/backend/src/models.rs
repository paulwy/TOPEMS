use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChatRoom {
    pub id: Uuid,
    pub name: Option<String>,
    pub room_type: String,
    pub members: serde_json::Value,
    pub created_by: String,
    pub last_message: Option<String>,
    pub last_message_time: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChatRoom {
    pub name: Option<String>,
    pub room_type: String,
    pub members: Vec<String>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChatMessage {
    pub id: Uuid,
    pub chat_id: Uuid,
    pub sender_id: String,
    pub sender_name: String,
    pub message_type: String,
    pub content: String,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub is_read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChatMessage {
    pub chat_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub message_type: String,
    pub content: String,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProjectGroup {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub members: serde_json::Value,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectGroup {
    pub name: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub members: Vec<String>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub related_id: Option<Uuid>,
    pub related_type: Option<String>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotification {
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub related_id: Option<String>,
    pub related_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserOnlineStatus {
    pub user_id: String,
    pub is_online: bool,
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadedFile {
    pub file_id: String,
    pub file_name: String,
    pub file_path: String,
    pub content_type: String,
    pub size: usize,
}
