use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Announcement {
    pub id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub author: String,
    pub status: String,
    pub priority: Option<String>,
    pub publish_at: Option<DateTime<Utc>>,
    pub expire_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateAnnouncementRequest {
    pub title: String,
    pub content: Option<String>,
    pub author: String,
    pub priority: Option<String>,
    pub expire_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateAnnouncementRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub author: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub expire_at: Option<DateTime<Utc>>,
}
