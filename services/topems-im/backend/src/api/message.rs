use axum::{
    extract::{Path, State, Query},
    Json,
};
use chrono::Utc;
use uuid::Uuid;
use serde_json::json;
use sqlx::PgPool;

use crate::models::{Message, SendMessage, UpdateMessage, ReplyMessage, ForwardMessage, MessageReadReceipt};
use topems_shared::ApiResponse;

// ==================== 消息管理API ====================

/// POST /api/v1/messages/send - 发送消息
pub async fn send_message(
    State(pool): State<PgPool>,
    Json(payload): Json<SendMessage>,
) -> Json<ApiResponse<Message>> {
    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();
    
    let chat_room_id = payload.chat_room_id.and_then(|c| Uuid::parse_str(&c).ok());
    let reply_to_id = payload.reply_to_id.and_then(|r| Uuid::parse_str(&r).ok());

    let result = sqlx::query_as::<_, Message>(
        r#"
        INSERT INTO im.messages (id, chat_room_id, sender_id, sender_name, receiver_id, message_type, 
                             content, file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                             is_read, is_edited, is_deleted, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, FALSE, FALSE, FALSE, $12, NULL)
        RETURNING id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
                  file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                  is_read, is_edited, is_deleted, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(chat_room_id)
    .bind(payload.sender_id)
    .bind(payload.sender_name)
    .bind(payload.receiver_id)
    .bind(payload.message_type)
    .bind(payload.content.clone())
    .bind(payload.file_url)
    .bind(payload.file_name)
    .bind(payload.file_size)
    .bind(reply_to_id)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(message) => {
            // 更新聊天室的最后消息
            if let Some(chat_id) = chat_room_id {
                let _ = sqlx::query(
                    r#"
                    UPDATE im.chat_rooms
                    SET last_message = $1, last_message_time = $2, updated_at = $3
                    WHERE id = $4
                    "#
                )
                .bind(payload.content)
                .bind(now)
                .bind(now)
                .bind(chat_id)
                .execute(&pool)
                .await;
            }
            
            Json(ApiResponse::success(message, "发送消息成功"))
        }
        Err(e) => {
            tracing::error!("Failed to send message: {}", e);
            Json(ApiResponse::error(500, "发送消息失败"))
        }
    }
}

/// GET /api/v1/messages/:id - 获取消息详情
pub async fn get_message(
    State(pool): State<PgPool>,
    Path(message_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, Message>(
        r#"
        SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
               file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
               is_read, is_edited, is_deleted, created_at, updated_at
        FROM im.messages
        WHERE id = $1 AND is_deleted = FALSE
        "#
    )
    .bind(message_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(message)) => {
            // 获取已读回执
            let receipts_result = sqlx::query_as::<_, MessageReadReceipt>(
                r#"
                SELECT id, message_id, user_id, read_at
                FROM im.message_read_receipts
                WHERE message_id = $1
                ORDER BY read_at ASC
                "#
            )
            .bind(message_id)
            .fetch_all(&pool)
            .await;

            let read_receipts = receipts_result.unwrap_or_default();

            Json(ApiResponse::success(json!({
                "message": message,
                "read_receipts": read_receipts,
                "read_count": read_receipts.len()
            }), "获取消息详情成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "消息不存在")),
        Err(e) => {
            tracing::error!("Failed to get message: {}", e);
            Json(ApiResponse::error(500, "获取消息失败"))
        }
    }
}

/// PUT /api/v1/messages/:id - 更新消息（编辑）
pub async fn update_message(
    State(pool): State<PgPool>,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<UpdateMessage>,
) -> Json<ApiResponse<Message>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as::<_, Message>(
        r#"
        UPDATE im.messages
        SET content = $1, is_edited = TRUE, updated_at = $2
        WHERE id = $3 AND is_deleted = FALSE
        RETURNING id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
                  file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                  is_read, is_edited, is_deleted, created_at, updated_at
        "#
    )
    .bind(payload.content.clone())
    .bind(now)
    .bind(message_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(message)) => {
            // 更新聊天室的最后消息
            if let Some(chat_id) = message.chat_room_id {
                let _ = sqlx::query(
                    r#"
                    UPDATE im.chat_rooms
                    SET last_message = $1, updated_at = $2
                    WHERE id = $3
                    "#
                )
                .bind(payload.content)
                .bind(now)
                .bind(chat_id)
                .execute(&pool)
                .await;
            }
            
            Json(ApiResponse::success(message, "更新消息成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "消息不存在")),
        Err(e) => {
            tracing::error!("Failed to update message: {}", e);
            Json(ApiResponse::error(500, "更新消息失败"))
        }
    }
}

/// DELETE /api/v1/messages/:id - 删除消息（撤回）
pub async fn delete_message(
    State(pool): State<PgPool>,
    Path(message_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();

    // 获取消息信息
    let msg_result = sqlx::query_as::<_, Message>(
        r#"
        SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
               file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
               is_read, is_edited, is_deleted, created_at, updated_at
        FROM im.messages
        WHERE id = $1
        "#
    )
    .bind(message_id)
    .fetch_optional(&pool)
    .await;

    if let Ok(Some(message)) = msg_result {
        // 标记消息为已删除（软删除）
        let result = sqlx::query(
            r#"
            UPDATE im.messages
            SET is_deleted = TRUE, updated_at = $1
            WHERE id = $2
            "#
        )
        .bind(now)
        .bind(message_id)
        .execute(&pool)
        .await;

        match result {
            Ok(_) => {
                // 如果是聊天室的最后一条消息，需要更新
                if let Some(chat_id) = message.chat_room_id {
                    let _ = sqlx::query(
                        r#"
                        UPDATE im.chat_rooms
                        SET last_message = NULL, last_message_time = NULL, updated_at = $1
                        WHERE id = $2 AND last_message = $3
                        "#
                    )
                    .bind(now)
                    .bind(chat_id)
                    .bind(message.content)
                    .execute(&pool)
                    .await;
                }
                
                Json(ApiResponse::success(json!({ "deleted": true }), "删除消息成功"))
            }
            Err(e) => {
                tracing::error!("Failed to delete message: {}", e);
                Json(ApiResponse::error(500, "删除消息失败"))
            }
        }
    } else {
        Json(ApiResponse::error(404, "消息不存在"))
    }
}

/// POST /api/v1/messages/:id/read - 标记消息已读
pub async fn mark_message_read(
    State(pool): State<PgPool>,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<MessageReadReceipt>> {
    let user_id = payload.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
    
    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    // 创建已读回执
    let result = sqlx::query_as::<_, MessageReadReceipt>(
        r#"
        INSERT INTO message_read_receipts (id, message_id, user_id, read_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (message_id, user_id) 
        DO UPDATE SET read_at = $4
        RETURNING id, message_id, user_id, read_at
        "#
    )
    .bind(id)
    .bind(message_id)
    .bind(user_id)
    .bind(now)
    .fetch_one(&pool)
    .await;

    // 更新消息已读状态
    if result.is_ok() {
        let _ = sqlx::query(
            r#"
            UPDATE im.messages
            SET is_read = TRUE
            WHERE id = $1
            "#
        )
        .bind(message_id)
        .execute(&pool)
        .await;
    }

    match result {
        Ok(receipt) => Json(ApiResponse::success(receipt, "标记消息已读成功")),
        Err(e) => {
            tracing::error!("Failed to mark message read: {}", e);
            Json(ApiResponse::error(500, "标记消息已读失败"))
        }
    }
}

/// GET /api/v1/messages/unread - 获取未读消息列表
pub async fn get_unread_messages(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
    
    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let result = sqlx::query_as::<_, Message>(
        r#"
        SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
               file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
               is_read, is_edited, is_deleted, created_at, updated_at
        FROM im.messages
        WHERE (receiver_id = $1 OR chat_room_id IN (
            SELECT chat_room_id FROM chat_room_members WHERE user_id = $1
        ))
        AND is_read = FALSE AND is_deleted = FALSE
        ORDER BY created_at DESC
        LIMIT 50
        "#
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(messages) => Json(ApiResponse::success(json!({
            "unread_messages": messages,
            "total": messages.len()
        }), "获取未读消息成功")),
        Err(e) => {
            tracing::error!("Failed to get unread messages: {}", e);
            Json(ApiResponse::error(500, "获取未读消息失败"))
        }
    }
}

/// POST /api/v1/messages/:id/reply - 回复消息
pub async fn reply_message(
    State(pool): State<PgPool>,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<ReplyMessage>,
) -> Json<ApiResponse<Message>> {
    // 获取原消息
    let original_result = sqlx::query_as::<_, Message>(
        r#"
        SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
               file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
               is_read, is_edited, is_deleted, created_at, updated_at
        FROM im.messages
        WHERE id = $1 AND is_deleted = FALSE
        "#
    )
    .bind(message_id)
    .fetch_optional(&pool)
    .await;

    match original_result {
        Ok(Some(original)) => {
            let id = Uuid::new_v4();
            let now = Utc::now().naive_utc();

            // 创建回复消息
            let result = sqlx::query_as::<_, Message>(
                r#"
                INSERT INTO im.messages (id, chat_room_id, sender_id, sender_name, receiver_id, 
                                     message_type, content, file_url, file_name, file_size, 
                                     reply_to_id, forwarded_from_id, is_read, is_edited, is_deleted, 
                                     created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'text', $6, NULL, NULL, NULL, $7, NULL, FALSE, FALSE, FALSE, $8, NULL)
                RETURNING id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
                          file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                          is_read, is_edited, is_deleted, created_at, updated_at
                "#
            )
            .bind(id)
            .bind(original.chat_room_id)
            .bind(original.sender_id) // 回复发送者
            .bind(original.sender_name)
            .bind(original.receiver_id)
            .bind(payload.content.clone())
            .bind(message_id)
            .bind(now)
            .fetch_one(&pool)
            .await;

            match result {
                Ok(reply) => {
                    // 更新聊天室的最后消息
                    if let Some(chat_id) = original.chat_room_id {
                        let _ = sqlx::query(
                            r#"
                            UPDATE im.chat_rooms
                            SET last_message = $1, last_message_time = $2, updated_at = $3
                            WHERE id = $4
                            "#
                        )
                        .bind(payload.content)
                        .bind(now)
                        .bind(now)
                        .bind(chat_id)
                        .execute(&pool)
                        .await;
                    }
                    
                    Json(ApiResponse::success(reply, "回复消息成功"))
                }
                Err(e) => {
                    tracing::error!("Failed to reply message: {}", e);
                    Json(ApiResponse::error(500, "回复消息失败"))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "原消息不存在")),
        Err(e) => {
            tracing::error!("Failed to get original message: {}", e);
            Json(ApiResponse::error(500, "获取原消息失败"))
        }
    }
}

/// POST /api/v1/messages/:id/forward - 转发消息
pub async fn forward_message(
    State(pool): State<PgPool>,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<ForwardMessage>,
) -> Json<ApiResponse<Message>> {
    // 获取原消息
    let original_result = sqlx::query_as::<_, Message>(
        r#"
        SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
               file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
               is_read, is_edited, is_deleted, created_at, updated_at
        FROM im.messages
        WHERE id = $1 AND is_deleted = FALSE
        "#
    )
    .bind(message_id)
    .fetch_optional(&pool)
    .await;

    match original_result {
        Ok(Some(original)) => {
            let target_chat_room_id = Uuid::parse_str(&payload.target_chat_room_id).ok();
            let id = Uuid::new_v4();
            let now = Utc::now().naive_utc();

            // 创建转发消息
            let result = sqlx::query_as::<_, Message>(
                r#"
                INSERT INTO im.messages (id, chat_room_id, sender_id, sender_name, receiver_id, 
                                     message_type, content, file_url, file_name, file_size, 
                                     reply_to_id, forwarded_from_id, is_read, is_edited, is_deleted, 
                                     created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, $11, FALSE, FALSE, FALSE, $12, NULL)
                RETURNING id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
                          file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                          is_read, is_edited, is_deleted, created_at, updated_at
                "#
            )
            .bind(id)
            .bind(target_chat_room_id)
            .bind(original.sender_id)
            .bind(original.sender_name)
            .bind(payload.target_receiver_id)
            .bind(original.message_type)
            .bind(original.content.clone())
            .bind(original.file_url)
            .bind(original.file_name)
            .bind(original.file_size)
            .bind(message_id)
            .bind(now)
            .fetch_one(&pool)
            .await;

            match result {
                Ok(forwarded) => {
                    // 更新目标聊天室的最后消息
                    if let Some(chat_id) = target_chat_room_id {
                        let _ = sqlx::query(
                            r#"
                            UPDATE im.chat_rooms
                            SET last_message = $1, last_message_time = $2, updated_at = $3
                            WHERE id = $4
                            "#
                        )
                        .bind(original.content)
                        .bind(now)
                        .bind(now)
                        .bind(chat_id)
                        .execute(&pool)
                        .await;
                    }
                    
                    Json(ApiResponse::success(forwarded, "转发消息成功"))
                }
                Err(e) => {
                    tracing::error!("Failed to forward message: {}", e);
                    Json(ApiResponse::error(500, "转发消息失败"))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "原消息不存在")),
        Err(e) => {
            tracing::error!("Failed to get original message: {}", e);
            Json(ApiResponse::error(500, "获取原消息失败"))
        }
    }
}

/// GET /api/v1/messages/search - 搜索消息
pub async fn search_messages(
    State(pool): State<PgPool>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let keyword = params.get("keyword").and_then(|v| v.as_str()).unwrap_or("");
    let chat_room_id = params.get("chat_room_id").and_then(|v| v.as_str()).and_then(|c| Uuid::parse_str(c).ok());
    let user_id = params.get("user_id").and_then(|v| v.as_str());
    
    if keyword.is_empty() {
        return Json(ApiResponse::error(400, "搜索关键词不能为空"));
    }

    let result = if let Some(chat_id) = chat_room_id {
        sqlx::query_as::<_, Message>(
            r#"
            SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
                   file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                   is_read, is_edited, is_deleted, created_at, updated_at
            FROM im.messages
            WHERE chat_room_id = $1 AND content ILIKE $2 AND is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT 50
            "#
        )
        .bind(chat_id)
        .bind(format!("%{}%", keyword))
        .fetch_all(&pool)
        .await
    } else if let Some(uid) = user_id {
        sqlx::query_as::<_, Message>(
            r#"
            SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
                   file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                   is_read, is_edited, is_deleted, created_at, updated_at
            FROM im.messages
            WHERE (sender_id = $1 OR receiver_id = $1 OR chat_room_id IN (
                SELECT chat_room_id FROM chat_room_members WHERE user_id = $1
            ))
            AND content ILIKE $2 AND is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT 50
            "#
        )
        .bind(uid)
        .bind(format!("%{}%", keyword))
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as::<_, Message>(
            r#"
            SELECT id, chat_room_id, sender_id, sender_name, receiver_id, message_type, content, 
                   file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                   is_read, is_edited, is_deleted, created_at, updated_at
            FROM im.messages
            WHERE content ILIKE $1 AND is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT 50
            "#
        )
        .bind(format!("%{}%", keyword))
        .fetch_all(&pool)
        .await
    };

    match result {
        Ok(messages) => Json(ApiResponse::success(json!({
            "messages": messages,
            "total": messages.len(),
            "keyword": keyword
        }), "搜索消息成功")),
        Err(e) => {
            tracing::error!("Failed to search messages: {}", e);
            Json(ApiResponse::error(500, "搜索消息失败"))
        }
    }
}