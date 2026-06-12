use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: Option<String>,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub status: String,
    pub priority: String,
    pub metadata: Option<serde_json::Value>,
    pub due_date: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub project_id: Uuid,
    pub user_id: Option<String>,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub priority: String,
    pub metadata: Option<serde_json::Value>,
    pub due_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNotificationRequest {
    pub status: Option<String>,
    pub read_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct NotificationSetting {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: String,
    pub notification_type: String,
    pub enabled: bool,
    pub notify_before_days: Option<i32>,
    pub preferred_channel: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationSettingRequest {
    pub notification_type: String,
    pub enabled: bool,
    pub notify_before_days: Option<i32>,
    pub preferred_channel: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReminderConfig {
    pub milestone_reminder_days: i32,
    pub task_reminder_days: i32,
    pub approval_reminder_days: i32,
    pub risk_alert_enabled: bool,
    pub risk_threshold: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationType {
    pub code: String,
    pub name: String,
    pub description: String,
    pub default_enabled: bool,
    pub default_priority: String,
}
