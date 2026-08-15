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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde::Serialize;
    use serde_json::Value;
    use uuid::Uuid;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn struct_announcement() {
        roundtrip(&Announcement {
            id: Uuid::new_v4(),
            title: "系统升级通知".into(),
            content: Some("本周六凌晨2点系统升级".into()),
            author: "admin".into(),
            status: "published".into(),
            priority: Some("high".into()),
            publish_at: Some(Utc::now()),
            expire_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn struct_create_announcement_request() {
        roundtrip(&CreateAnnouncementRequest {
            title: "新公告".into(),
            content: None,
            author: "tester".into(),
            priority: Some("low".into()),
            expire_at: Some(Utc::now()),
        });
    }

    #[test]
    fn struct_update_announcement_request() {
        roundtrip(&UpdateAnnouncementRequest {
            title: Some("更新后标题".into()),
            content: Some("新内容".into()),
            author: None,
            status: Some("draft".into()),
            priority: None,
            expire_at: None,
        });
    }
}
