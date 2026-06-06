use serde::{Deserialize, Serialize};
use chrono::NaiveDateTime;
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
    pub last_message_time: Option<NaiveDateTime>,
    pub is_muted: bool,
    pub is_pinned: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChatRoom {
    pub name: Option<String>,
    pub room_type: String,
    pub members: Vec<String>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateChatRoom {
    pub name: Option<String>,
    pub room_type: Option<String>,
    pub members: Option<Vec<String>>,
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
    pub created_at: NaiveDateTime,
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
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
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
  pub is_read: bool,
  pub created_at: NaiveDateTime,
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
    pub last_seen: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadedFile {
    pub file_id: String,
    pub file_name: String,
    pub file_path: String,
    pub content_type: String,
    pub size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Friend {
    pub id: Uuid,
    pub user_id: String,
    pub friend_id: String,
    pub friend_name: String,
    pub status: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFriendRequest {
    pub friend_id: String,
    pub friend_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ContactGroup {
    pub id: Uuid,
    pub user_id: String,
    pub name: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateContactGroup {
    pub name: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    #[test]
    fn test_chat_room_serialization() {
        let room = ChatRoom {
            id: Uuid::new_v4(),
            name: Some("Test Room".to_string()),
            room_type: "private".to_string(),
            members: serde_json::json!(["user1", "user2"]),
            created_by: "admin".to_string(),
            last_message: None,
            last_message_time: None,
            is_muted: false,
            is_pinned: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&room).unwrap();
        let deserialized: ChatRoom = serde_json::from_str(&json).unwrap();

        assert_eq!(room.id, deserialized.id);
        assert_eq!(room.name, deserialized.name);
        assert_eq!(room.room_type, deserialized.room_type);
    }

    #[test]
    fn test_create_chat_room_validation() {
        let create_room = CreateChatRoom {
            name: Some("New Room".to_string()),
            room_type: "private".to_string(),
            members: vec!["user1".to_string(), "user2".to_string()],
            created_by: "admin".to_string(),
        };

        assert!(create_room.room_type == "private" || create_room.room_type == "group");
        assert!(!create_room.members.is_empty());
    }

    #[test]
    fn test_notification_serialization() {
        let notification = Notification {
            id: Uuid::new_v4(),
            user_id: "user123".to_string(),
            title: "Test Notification".to_string(),
            content: "This is a test".to_string(),
            notification_type: "info".to_string(),
            is_read: false,
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&notification).unwrap();
        let deserialized: Notification = serde_json::from_str(&json).unwrap();

        assert_eq!(notification.id, deserialized.id);
        assert_eq!(notification.user_id, deserialized.user_id);
        assert_eq!(notification.is_read, deserialized.is_read);
    }

    #[test]
    fn test_chat_message_serialization() {
        let message = ChatMessage {
            id: Uuid::new_v4(),
            chat_id: Uuid::new_v4(),
            sender_id: "user1".to_string(),
            sender_name: "User One".to_string(),
            message_type: "text".to_string(),
            content: "Hello, world!".to_string(),
            file_url: None,
            file_name: None,
            created_at: Utc::now(),
            is_read: false,
        };

        let json = serde_json::to_string(&message).unwrap();
        let deserialized: ChatMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(message.id, deserialized.id);
        assert_eq!(message.content, deserialized.content);
    }

    #[test]
    fn test_user_online_status_serialization() {
        let status = UserOnlineStatus {
            user_id: "user123".to_string(),
            is_online: true,
            last_seen: Utc::now(),
        };

        let json = serde_json::to_string(&status).unwrap();
        let deserialized: UserOnlineStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(status.user_id, deserialized.user_id);
        assert_eq!(status.is_online, deserialized.is_online);
    }
}
