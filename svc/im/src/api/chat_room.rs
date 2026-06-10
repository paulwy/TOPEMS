use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use uuid::Uuid;
use serde_json::json;
use sqlx::PgPool;

use crate::models::{ChatRoom, CreateChatRoom, UpdateChatRoom, AddChatRoomMember, ChatRoomMember};
use topems_shared::ApiResponse;

// ==================== 聊天室管理API ====================

/// POST /api/v1/chat-rooms/create - 创建聊天室
pub async fn create_chat_room(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateChatRoom>,
) -> Json<ApiResponse<ChatRoom>> {
    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as::<_, ChatRoom>(
        r#"
        INSERT INTO im.chat_rooms (id, name, room_type, members, created_by, last_message, last_message_time, is_muted, is_pinned, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NULL, NULL, FALSE, FALSE, $6, $7)
        RETURNING id, name, room_type, members, created_by, last_message, last_message_time, is_muted, is_pinned, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(payload.name)
    .bind(payload.room_type)
    .bind(json!(payload.members))
    .bind(payload.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(room) => Json(ApiResponse::success(room, "创建聊天室成功")),
        Err(e) => {
            tracing::error!("Failed to create chat room: {}", e);
            Json(ApiResponse::error(500, "创建聊天室失败"))
        }
    }
}

/// GET /api/v1/chat-rooms - 获取聊天室列表
pub async fn list_chat_rooms(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, ChatRoom>(
        r#"
        SELECT id, name, room_type, members, created_by, last_message, last_message_time, is_muted, is_pinned, created_at, updated_at
        FROM im.chat_rooms
        ORDER BY is_pinned DESC, updated_at DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rooms) => Json(ApiResponse::success(json!({
            "chat_rooms": rooms,
            "total": rooms.len()
        }), "获取聊天室列表成功")),
        Err(e) => {
            tracing::error!("Failed to list chat rooms: {}", e);
            Json(ApiResponse::error(500, "获取聊天室列表失败"))
        }
    }
}

/// GET /api/v1/chat-rooms/:id - 获取聊天室详情
pub async fn get_chat_room(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let room_result = sqlx::query_as::<_, ChatRoom>(
        r#"
        SELECT id, name, room_type, members, created_by, last_message, last_message_time, is_muted, is_pinned, created_at, updated_at
        FROM im.chat_rooms
        WHERE id = $1
        "#
    )
    .bind(chat_id)
    .fetch_optional(&pool)
    .await;

    match room_result {
        Ok(Some(room)) => {
            // 获取聊天室成员详情
            let members_result = sqlx::query_as::<_, ChatRoomMember>(
                r#"
                SELECT id, chat_room_id, user_id, role, joined_at, last_read_at
                FROM im.chat_room_members
                WHERE chat_room_id = $1
                ORDER BY joined_at ASC
                "#
            )
            .bind(chat_id)
            .fetch_all(&pool)
            .await;

            let members = members_result.unwrap_or_default();

            Json(ApiResponse::success(json!({
                "chat_room": room,
                "members": members,
                "member_count": members.len()
            }), "获取聊天室详情成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "聊天室不存在")),
        Err(e) => {
            tracing::error!("Failed to get chat room: {}", e);
            Json(ApiResponse::error(500, "获取聊天室失败"))
        }
    }
}

/// PUT /api/v1/chat-rooms/:id - 更新聊天室
pub async fn update_chat_room(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
    Json(payload): Json<UpdateChatRoom>,
) -> Json<ApiResponse<ChatRoom>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as::<_, ChatRoom>(
        r#"
        UPDATE im.chat_rooms
        SET name = COALESCE($1, name),
            room_type = COALESCE($2, room_type),
            members = COALESCE($3, members),
            updated_at = $4
        WHERE id = $5
        RETURNING id, name, room_type, members, created_by, last_message, last_message_time, is_muted, is_pinned, created_at, updated_at
        "#
    )
    .bind(payload.name)
    .bind(payload.room_type)
    .bind(payload.members.map(|m| json!(m)))
    .bind(now)
    .bind(chat_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(room)) => Json(ApiResponse::success(room, "更新聊天室成功")),
        Ok(None) => Json(ApiResponse::error(404, "聊天室不存在")),
        Err(e) => {
            tracing::error!("Failed to update chat room: {}", e);
            Json(ApiResponse::error(500, "更新聊天室失败"))
        }
    }
}

/// DELETE /api/v1/chat-rooms/:id - 删除聊天室
pub async fn delete_chat_room(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query(
        r#"
        DELETE FROM im.chat_rooms
        WHERE id = $1
        RETURNING id
        "#
    )
    .bind(chat_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(_)) => Json(ApiResponse::success(json!({ "deleted": true }), "删除聊天室成功")),
        Ok(None) => Json(ApiResponse::error(404, "聊天室不存在")),
        Err(e) => {
            tracing::error!("Failed to delete chat room: {}", e);
            Json(ApiResponse::error(500, "删除聊天室失败"))
        }
    }
}

/// POST /api/v1/chat-rooms/:id/members - 添加聊天室成员
pub async fn add_chat_room_member(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
    Json(payload): Json<AddChatRoomMember>,
) -> Json<ApiResponse<ChatRoomMember>> {
    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();
    let role = payload.role.unwrap_or_else(|| "member".to_string());
    let user_id = payload.user_id.clone();

    let result = sqlx::query_as::<_, ChatRoomMember>(
        r#"
        INSERT INTO im.chat_room_members (id, chat_room_id, user_id, role, joined_at, last_read_at)
        VALUES ($1, $2, $3, $4, $5, NULL)
        ON CONFLICT (chat_room_id, user_id) 
        DO UPDATE SET role = $4, joined_at = $5
        RETURNING id, chat_room_id, user_id, role, joined_at, last_read_at
        "#
    )
    .bind(id)
    .bind(chat_id)
    .bind(payload.user_id)
    .bind(role)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(member) => {
            // 更新聊天室成员列表
            let _ = sqlx::query(
                r#"
                UPDATE im.chat_rooms
                SET members = members || $1::jsonb,
                    updated_at = $2
                WHERE id = $3
                "#
            )
            .bind(json!([user_id]))
            .bind(now)
            .bind(chat_id)
            .execute(&pool)
            .await;

            Json(ApiResponse::success(member, "添加成员成功"))
        }
        Err(e) => {
            tracing::error!("Failed to add member: {}", e);
            Json(ApiResponse::error(500, "添加成员失败"))
        }
    }
}

/// DELETE /api/v1/chat-rooms/:id/members/:member_id - 移除成员
pub async fn remove_chat_room_member(
    State(pool): State<PgPool>,
    Path((chat_id, member_id)): Path<(Uuid, String)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    // 删除成员记录
    let result = sqlx::query(
        r#"
        DELETE FROM im.chat_room_members
        WHERE chat_room_id = $1 AND user_id = $2
        RETURNING id
        "#
    )
    .bind(chat_id)
    .bind(&member_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(_)) => {
            // 更新聊天室成员列表
            let _ = sqlx::query(
                r#"
                UPDATE im.chat_rooms
                SET members = members - $1,
                    updated_at = $2
                WHERE id = $3
                "#
            )
            .bind(&member_id)
            .bind(now)
            .bind(chat_id)
            .execute(&pool)
            .await;

            Json(ApiResponse::success(json!({ "removed": true }), "移除成员成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "成员不存在")),
        Err(e) => {
            tracing::error!("Failed to remove member: {}", e);
            Json(ApiResponse::error(500, "移除成员失败"))
        }
    }
}

/// GET /api/v1/chat-rooms/:id/messages - 获取聊天消息列表
pub async fn get_chat_room_messages(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, crate::models::Message>(
        r#"
        SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
               file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
               is_read, is_edited, is_deleted, created_at, updated_at
        FROM im.messages
        WHERE chat_room_id = $1 AND is_deleted = FALSE
        ORDER BY created_at ASC
        LIMIT 100
        "#
    )
    .bind(chat_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(messages) => Json(ApiResponse::success(json!({
            "messages": messages,
            "total": messages.len()
        }), "获取聊天消息成功")),
        Err(e) => {
            tracing::error!("Failed to get chat messages: {}", e);
            Json(ApiResponse::error(500, "获取聊天消息失败"))
        }
    }
}

/// PUT /api/v1/chat-rooms/:id/mute - 开启免打扰
pub async fn mute_chat_room(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE im.chat_rooms
        SET is_muted = true, updated_at = $1
        WHERE id = $2
        "#
    )
    .bind(now)
    .bind(chat_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({ "muted": true }), "已开启免打扰")),
        Err(e) => {
            tracing::error!("Failed to mute chat room: {}", e);
            Json(ApiResponse::error(500, "开启免打扰失败"))
        }
    }
}

/// PUT /api/v1/chat-rooms/:id/unmute - 关闭免打扰
pub async fn unmute_chat_room(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE im.chat_rooms
        SET is_muted = false, updated_at = $1
        WHERE id = $2
        "#
    )
    .bind(now)
    .bind(chat_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({ "muted": false }), "已关闭免打扰")),
        Err(e) => {
            tracing::error!("Failed to unmute chat room: {}", e);
            Json(ApiResponse::error(500, "关闭免打扰失败"))
        }
    }
}

/// PUT /api/v1/chat-rooms/:id/pin - 置顶聊天室
pub async fn pin_chat_room(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE im.chat_rooms
        SET is_pinned = true, updated_at = $1
        WHERE id = $2
        "#
    )
    .bind(now)
    .bind(chat_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({ "pinned": true }), "已置顶会话")),
        Err(e) => {
            tracing::error!("Failed to pin chat room: {}", e);
            Json(ApiResponse::error(500, "置顶会话失败"))
        }
    }
}

/// PUT /api/v1/chat-rooms/:id/unpin - 取消置顶
pub async fn unpin_chat_room(
    State(pool): State<PgPool>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE im.chat_rooms
        SET is_pinned = false, updated_at = $1
        WHERE id = $2
        "#
    )
    .bind(now)
    .bind(chat_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({ "pinned": false }), "已取消置顶")),
        Err(e) => {
            tracing::error!("Failed to unpin chat room: {}", e);
            Json(ApiResponse::error(500, "取消置顶失败"))
        }
    }
}