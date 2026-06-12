// IM 服务 OpenAPI 文档
use utoipa::{OpenApi, ToSchema};
use serde::{Deserialize, Serialize};

// ==================== 消息结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Message {
    pub id: String,
    pub chat_room_id: String,
    pub sender_id: String,
    pub content: String,
    pub message_type: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SendMessageRequest {
    #[schema(example = "room-123")]
    pub chat_room_id: String,
    #[schema(example = "Hello, this is a message")]
    pub content: String,
    #[schema(example = "text", enum = ["text", "image", "file", "system"])]
    pub message_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MessageListQuery {
    pub chat_room_id: String,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub before: Option<String>,
}

// ==================== 聊天室结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChatRoom {
    pub id: String,
    pub name: String,
    pub room_type: String,
    pub owner_id: Option<String>,
    pub member_count: i64,
    pub last_message: Option<Message>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateChatRoomRequest {
    #[schema(example = "Test Room")]
    pub name: String,
    #[schema(example = "group", enum = ["private", "group", "channel"])]
    pub room_type: String,
    pub member_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateChatRoomRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AddMemberRequest {
    #[schema(example = "[\"user-1\", \"user-2\"]")]
    pub member_ids: Vec<String>,
}

// ==================== 联系人结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Contact {
    pub id: String,
    pub user_id: String,
    pub contact_user_id: String,
    pub contact_user_name: String,
    pub contact_avatar: Option<String>,
    pub is_favorite: bool,
    pub is_blocked: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AddContactRequest {
    #[schema(example = "user-123")]
    pub contact_user_id: String,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateContactRequest {
    pub remark: Option<String>,
    pub is_favorite: Option<bool>,
    pub is_blocked: Option<bool>,
}

// ==================== 文件结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UploadFileResponse {
    pub file_id: String,
    pub file_name: String,
    pub file_url: String,
    pub file_size: i64,
    pub mime_type: String,
}

// ==================== WebSocket 结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WebSocketMessage {
    pub msg_type: String,
    pub data: serde_json::Value,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OnlineStatus {
    pub user_id: String,
    pub is_online: bool,
    pub last_seen: Option<String>,
}

// ==================== OpenAPI 文档 ====================

#[derive(OpenApi)]
#[openapi(
    // 消息 API
    paths(
        crate::api::message::send_message,
        crate::api::message::get_messages,
        crate::api::message::delete_message,
    ),
    components(
        schemas(
            Message,
            SendMessageRequest,
            MessageListQuery,
        ),
    ),
    tags(
        (name = "message", description = "消息管理 API"),
    ),
    info(
        title = "TOPEMS IM Message API",
        version = "1.0.0",
        description = "即时通讯消息 API",
    )
)]
pub struct MessageApiDoc;

#[derive(OpenApi)]
#[openapi(
    // 聊天室 API
    paths(
        crate::api::chat_room::create_room,
        crate::api::chat_room::list_rooms,
        crate::api::chat_room::get_room,
        crate::api::chat_room::update_room,
        crate::api::chat_room::delete_room,
        crate::api::chat_room::add_members,
        crate::api::chat_room::remove_members,
    ),
    components(
        schemas(
            ChatRoom,
            CreateChatRoomRequest,
            UpdateChatRoomRequest,
            AddMemberRequest,
        ),
    ),
    tags(
        (name = "chat_room", description = "聊天室管理 API"),
    ),
    info(
        title = "TOPEMS IM ChatRoom API",
        version = "1.0.0",
        description = "聊天室管理 API",
    )
)]
pub struct ChatRoomApiDoc;

#[derive(OpenApi)]
#[openapi(
    // 联系人 API
    paths(
        crate::api::contact::add_contact,
        crate::api::contact::list_contacts,
        crate::api::contact::update_contact,
        crate::api::contact::delete_contact,
    ),
    components(
        schemas(
            Contact,
            AddContactRequest,
            UpdateContactRequest,
        ),
    ),
    tags(
        (name = "contact", description = "联系人管理 API"),
    ),
    info(
        title = "TOPEMS IM Contact API",
        version = "1.0.0",
        description = "联系人管理 API",
    )
)]
pub struct ContactApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::file::upload_file,
        crate::api::file::download_file,
        crate::api::file::delete_file,
    ),
    components(
        schemas(
            UploadFileResponse,
        ),
    ),
    tags(
        (name = "file", description = "文件管理 API"),
    ),
    info(
        title = "TOPEMS IM File API",
        version = "1.0.0",
        description = "即时通讯文件管理 API",
    )
)]
pub struct FileApiDoc;
