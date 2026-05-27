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

#[derive(Debug, Clone, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message: "Success".to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(message: &str, code: u16) -> Self {
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}
