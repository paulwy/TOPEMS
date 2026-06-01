use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    System,
    Workflow,
    Reminder,
    Alert,
    Message,
}

impl std::fmt::Display for NotificationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NotificationType::System => write!(f, "system"),
            NotificationType::Workflow => write!(f, "workflow"),
            NotificationType::Reminder => write!(f, "reminder"),
            NotificationType::Alert => write!(f, "alert"),
            NotificationType::Message => write!(f, "message"),
        }
    }
}

impl NotificationType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "system" => Some(NotificationType::System),
            "workflow" => Some(NotificationType::Workflow),
            "reminder" => Some(NotificationType::Reminder),
            "alert" => Some(NotificationType::Alert),
            "message" => Some(NotificationType::Message),
            _ => None,
        }
    }
}

// A helper struct for SQLx that uses the raw string for notification_type
#[derive(Debug, Clone, FromRow)]
struct NotificationRow {
    pub id: Uuid,
    pub user_id: String,
    pub notification_type: String,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub is_read: bool,
    pub priority: i16,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: Uuid,
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub is_read: bool,
    pub priority: i16,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}

impl Notification {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        let row: NotificationRow = NotificationRow::from_row(row)?;
        Ok(Self {
            id: row.id,
            user_id: row.user_id,
            notification_type: NotificationType::from_str(&row.notification_type)
                .unwrap_or(NotificationType::System),
            title: row.title,
            content: row.content,
            data: row.data,
            is_read: row.is_read,
            priority: row.priority,
            created_at: row.created_at,
            read_at: row.read_at,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotificationRequest {
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub priority: Option<i16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationListQuery {
    pub page: Option<usize>,
    pub page_size: Option<usize>,
    pub notification_type: Option<NotificationType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub unread_count: usize,
}
