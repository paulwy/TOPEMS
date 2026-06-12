use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ==================== 聊天室相关模型 ====================

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
pub struct ChatRoomMember {
    pub id: Uuid,
    pub chat_room_id: Uuid,
    pub user_id: String,
    pub role: String,
    pub joined_at: NaiveDateTime,
    pub last_read_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddChatRoomMember {
    pub user_id: String,
    pub role: Option<String>,
}

// ==================== 消息相关模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: Uuid,
    pub chat_room_id: Option<Uuid>,
    pub sender_id: String,
    pub sender_name: String,
    pub receiver_id: Option<String>,
    pub message_type: String,
    pub content: String,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub reply_to_id: Option<Uuid>,
    pub forwarded_from_id: Option<Uuid>,
    pub is_read: bool,
    pub is_edited: bool,
    pub is_deleted: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessage {
    pub chat_room_id: Option<String>,
    pub receiver_id: Option<String>,
    pub sender_id: String,
    pub sender_name: String,
    pub message_type: String,
    pub content: String,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub reply_to_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMessage {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplyMessage {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForwardMessage {
    pub target_chat_room_id: String,
    pub target_receiver_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MessageReadReceipt {
    pub id: Uuid,
    pub message_id: Uuid,
    pub user_id: String,
    pub read_at: NaiveDateTime,
}

// ==================== 联系人相关模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Contact {
    pub id: Uuid,
    pub user_id: String,
    pub contact_user_id: String,
    pub contact_name: String,
    pub contact_avatar: Option<String>,
    pub alias: Option<String>,
    pub status: String,
    pub is_blocked: bool,
    pub group_id: Option<Uuid>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddContact {
    pub contact_user_id: String,
    pub contact_name: String,
    pub contact_avatar: Option<String>,
    pub alias: Option<String>,
    pub group_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateContact {
    pub alias: Option<String>,
    pub group_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchContact {
    pub keyword: String,
}

// ==================== 文件传输相关模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FileTransfer {
    pub id: Uuid,
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub content_type: String,
    pub uploader_id: String,
    pub uploader_name: String,
    pub chat_room_id: Option<Uuid>,
    pub message_id: Option<Uuid>,
    pub is_shared: bool,
    pub share_link: Option<String>,
    pub download_count: i64,
    pub expires_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadFile {
    pub uploader_id: String,
    pub uploader_name: String,
    pub chat_room_id: Option<String>,
    pub expires_days: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareFile {
    pub share_to_users: Vec<String>,
    pub expires_days: Option<i32>,
}

// ==================== 用户状态相关模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserStatus {
    pub user_id: String,
    pub is_online: bool,
    pub status_type: String,
    pub status_message: Option<String>,
    pub last_seen: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateUserStatus {
    pub status_type: Option<String>,
    pub status_message: Option<String>,
}

// ==================== 审计日志相关模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub user_id: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub details: serde_json::Value,
    pub ip_address: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuditLog {
    pub user_id: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub details: serde_json::Value,
    pub ip_address: Option<String>,
}

// ==================== 其他现有模型 ====================

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
    pub related_id: Option<Uuid>,
    pub related_type: Option<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadedFile {
    pub file_id: String,
    pub file_name: String,
    pub file_path: String,
    pub content_type: String,
    pub size: usize,
}

// ==================== WebSocket消息模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    pub msg_type: String,
    pub chat_id: Option<String>,
    pub sender_id: String,
    pub sender_name: String,
    pub content: String,
    pub timestamp: String,
    pub message_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsEvent {
    pub event_type: String,
    pub data: serde_json::Value,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsOnlineStatus {
    pub user_id: String,
    pub is_online: bool,
    pub status_type: String,
    pub status_message: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsReadReceipt {
    pub message_id: String,
    pub chat_room_id: String,
    pub user_id: String,
    pub read_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsChatRoomUpdate {
    pub chat_room_id: String,
    pub update_type: String,
    pub data: serde_json::Value,
    pub timestamp: String,
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
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
        };

        let json = serde_json::to_string(&room).unwrap();
        let deserialized: ChatRoom = serde_json::from_str(&json).unwrap();

        assert_eq!(room.id, deserialized.id);
        assert_eq!(room.name, deserialized.name);
        assert_eq!(room.room_type, deserialized.room_type);
    }

    #[test]
    fn test_message_serialization() {
        let message = Message {
            id: Uuid::new_v4(),
            chat_room_id: Some(Uuid::new_v4()),
            sender_id: "user1".to_string(),
            sender_name: "User One".to_string(),
            receiver_id: None,
            message_type: "text".to_string(),
            content: "Hello, world!".to_string(),
            file_url: None,
            file_name: None,
            file_size: None,
            reply_to_id: None,
            forwarded_from_id: None,
            is_read: false,
            is_edited: false,
            is_deleted: false,
            created_at: Utc::now().naive_utc(),
            updated_at: None,
        };

        let json = serde_json::to_string(&message).unwrap();
        let deserialized: Message = serde_json::from_str(&json).unwrap();

        assert_eq!(message.id, deserialized.id);
        assert_eq!(message.content, deserialized.content);
    }

    #[test]
    fn test_contact_serialization() {
        let contact = Contact {
            id: Uuid::new_v4(),
            user_id: "user1".to_string(),
            contact_user_id: "user2".to_string(),
            contact_name: "User Two".to_string(),
            contact_avatar: None,
            alias: Some("My Friend".to_string()),
            status: "active".to_string(),
            is_blocked: false,
            group_id: None,
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
        };

        let json = serde_json::to_string(&contact).unwrap();
        let deserialized: Contact = serde_json::from_str(&json).unwrap();

        assert_eq!(contact.id, deserialized.id);
        assert_eq!(contact.contact_name, deserialized.contact_name);
    }

    #[test]
    fn test_file_transfer_serialization() {
        let file = FileTransfer {
            id: Uuid::new_v4(),
            file_name: "test.pdf".to_string(),
            file_path: "/uploads/test.pdf".to_string(),
            file_size: 1024,
            content_type: "application/pdf".to_string(),
            uploader_id: "user1".to_string(),
            uploader_name: "User One".to_string(),
            chat_room_id: None,
            message_id: None,
            is_shared: false,
            share_link: None,
            download_count: 0,
            expires_at: None,
            created_at: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
        };

        let json = serde_json::to_string(&file).unwrap();
        let deserialized: FileTransfer = serde_json::from_str(&json).unwrap();

        assert_eq!(file.id, deserialized.id);
        assert_eq!(file.file_name, deserialized.file_name);
    }

    #[test]
    fn test_user_status_serialization() {
        let status = UserStatus {
            user_id: "user123".to_string(),
            is_online: true,
            status_type: "online".to_string(),
            status_message: Some("Working".to_string()),
            last_seen: Utc::now().naive_utc(),
            updated_at: Utc::now().naive_utc(),
        };

        let json = serde_json::to_string(&status).unwrap();
        let deserialized: UserStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(status.user_id, deserialized.user_id);
        assert_eq!(status.is_online, deserialized.is_online);
    }
}
