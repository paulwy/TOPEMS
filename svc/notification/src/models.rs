use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sqlx::FromRow;

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
pub struct BulkOperationRequest {
    pub ids: Vec<String>,
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

// ==================== 通知模板系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TemplateStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "inactive")]
    Inactive,
    #[serde(rename = "deprecated")]
    Deprecated,
}

impl std::fmt::Display for TemplateStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TemplateStatus::Active => write!(f, "active"),
            TemplateStatus::Inactive => write!(f, "inactive"),
            TemplateStatus::Deprecated => write!(f, "deprecated"),
        }
    }
}

impl TemplateStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "active" => Some(TemplateStatus::Active),
            "inactive" => Some(TemplateStatus::Inactive),
            "deprecated" => Some(TemplateStatus::Deprecated),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub notification_type: NotificationType,
    pub title_template: String,
    pub content_template: String,
    pub data_schema: Option<serde_json::Value>,
    pub default_priority: Option<i16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub title_template: Option<String>,
    pub content_template: Option<String>,
    pub data_schema: Option<serde_json::Value>,
    pub default_priority: Option<i16>,
    pub status: Option<TemplateStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderTemplateRequest {
    pub template_id: Uuid,
    pub user_id: String,
    pub variables: serde_json::Value,
    pub priority: Option<i16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateListResponse {
    pub templates: Vec<NotificationTemplate>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
}

// ==================== 通知归档系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchivedNotification {
    pub id: Uuid,
    pub original_notification_id: Uuid,
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub priority: i16,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
    pub archived_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveConfig {
    pub auto_archive_days: i32,
    pub retention_days: i32,
    pub enabled: bool,
}

// ==================== 通知统计系统 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationStats {
    pub total_notifications: i64,
    pub unread_notifications: i64,
    pub read_notifications: i64,
    pub archived_notifications: i64,
    pub notifications_by_type: serde_json::Value,
    pub notifications_by_day: serde_json::Value,
    pub generated_at: DateTime<Utc>,
}
