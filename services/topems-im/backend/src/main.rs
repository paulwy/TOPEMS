use axum::{
    extract::{Path, State, WebSocketUpgrade, Multipart},
    Json, Router,
    extract::ws::{Message, WebSocket, Utf8Bytes},
    http::StatusCode,
};
use anyhow::Result;
use axum::extract::FromRef;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::env;
use std::fmt::format;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde_json::json;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tokio::sync::broadcast;
use futures_util::{SinkExt, StreamExt};
use sqlx::{PgPool, Row};
use tower_http::services::ServeDir;

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

mod db;
mod models;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    pub msg_type: String,
    pub chat_id: Option<String>,
    pub sender_id: String,
    pub sender_name: String,
    pub content: String,
    pub timestamp: String,
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth_state: AuthState,
    pub ws_connections: Arc<Mutex<HashMap<String, broadcast::Sender<WsMessage>>>>,
    pub tx: broadcast::Sender<WsMessage>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    fn new(pool: PgPool, auth_state: AuthState) -> Self {
        let (tx, _) = broadcast::channel(1000);
        AppState {
            pool,
            auth_state,
            ws_connections: Arc::new(Mutex::new(HashMap::new())),
            tx,
        }
    }
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-IM is running", "健康检查"))
}

async fn list_chat_rooms(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as!(
        models::ChatRoom,
        r#"
        SELECT id, name, room_type, members, created_by, last_message, last_message_time, created_at, updated_at
        FROM chat_rooms
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&state.pool)
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

async fn create_chat_room(
    State(state): State<AppState>,
    Json(payload): Json<models::CreateChatRoom>,
) -> Json<ApiResponse<models::ChatRoom>> {
    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as!(
        models::ChatRoom,
        r#"
        INSERT INTO chat_rooms (id, name, room_type, members, created_by, last_message, last_message_time, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, $7)
        RETURNING id, name, room_type, members, created_by, last_message, last_message_time, created_at, updated_at
        "#,
        id,
        payload.name,
        payload.room_type,
        json!(payload.members),
        payload.created_by,
        now,
        now
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(room) => Json(ApiResponse::success(room, "创建聊天室成功")),
        Err(e) => {
            tracing::error!("Failed to create chat room: {}", e);
            Json(ApiResponse::error(500, "创建聊天室失败"))
        }
    }
}

async fn get_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<models::ChatRoom>> {
    let result = sqlx::query_as!(
        models::ChatRoom,
        r#"
        SELECT id, name, room_type, members, created_by, last_message, last_message_time, created_at, updated_at
        FROM chat_rooms
        WHERE id = $1
        "#,
        chat_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(room)) => Json(ApiResponse::success(room, "获取聊天室成功")),
        Ok(None) => Json(ApiResponse::error(404, "聊天室不存在")),
        Err(e) => {
            tracing::error!("Failed to get chat room: {}", e);
            Json(ApiResponse::error(500, "获取聊天室失败"))
        }
    }
}

async fn update_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
    Json(payload): Json<models::UpdateChatRoom>,
) -> Json<ApiResponse<models::ChatRoom>> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as!(
        models::ChatRoom,
        r#"
        UPDATE chat_rooms
        SET name = COALESCE($1, name),
            room_type = COALESCE($2, room_type),
            members = COALESCE($3, members),
            updated_at = $4
        WHERE id = $5
        RETURNING id, name, room_type, members, created_by, last_message, last_message_time, created_at, updated_at
        "#,
        payload.name,
        payload.room_type,
        payload.members.map(|m| json!(m)),
        now,
        chat_id
    )
    .fetch_optional(&state.pool)
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

async fn delete_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query!(
        r#"
        DELETE FROM chat_rooms
        WHERE id = $1
        RETURNING id
        "#,
        chat_id
    )
    .fetch_optional(&state.pool)
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

async fn add_chat_room_member(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = payload.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
    
    if user_id.is_empty() {
        return Json(ApiResponse::error(400, "用户ID不能为空"));
    }

    let result = sqlx::query_as!(
        models::ChatRoom,
        r#"
        UPDATE chat_rooms
        SET members = members || $1::jsonb,
            updated_at = $2
        WHERE id = $3
        RETURNING id, name, room_type, members, created_by, last_message, last_message_time, created_at, updated_at
        "#,
        json!([user_id]),
        Utc::now().naive_utc(),
        chat_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(room)) => Json(ApiResponse::success(json!(room), "添加成员成功")),
        Ok(None) => Json(ApiResponse::error(404, "聊天室不存在")),
        Err(e) => {
            tracing::error!("Failed to add member: {}", e);
            Json(ApiResponse::error(500, "添加成员失败"))
        }
    }
}

async fn remove_chat_room_member(
    State(state): State<AppState>,
    Path((chat_id, user_id)): Path<(Uuid, String)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as!(
        models::ChatRoom,
        r#"
        UPDATE chat_rooms
        SET members = members - $1,
            updated_at = $2
        WHERE id = $3
        RETURNING id, name, room_type, members, created_by, last_message, last_message_time, created_at, updated_at
        "#,
        user_id,
        Utc::now().naive_utc(),
        chat_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(room)) => Json(ApiResponse::success(json!(room), "移除成员成功")),
        Ok(None) => Json(ApiResponse::error(404, "聊天室不存在")),
        Err(e) => {
            tracing::error!("Failed to remove member: {}", e);
            Json(ApiResponse::error(500, "移除成员失败"))
        }
    }
}

async fn get_chat_room_members(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query!(
        r#"
        SELECT members
        FROM chat_rooms
        WHERE id = $1
        "#,
        chat_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(json!({
            "members": record.members
        }), "获取成员列表成功")),
        Ok(None) => Json(ApiResponse::error(404, "聊天室不存在")),
        Err(e) => {
            tracing::error!("Failed to get members: {}", e);
            Json(ApiResponse::error(500, "获取成员列表失败"))
        }
    }
}

async fn list_chat_messages(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as!(
        models::ChatMessage,
        r#"
        SELECT id, chat_id, sender_id, sender_name, message_type, content, file_url, file_name, created_at, is_read
        FROM chat_messages
        WHERE chat_id = $1
        ORDER BY created_at ASC
        "#,
        chat_id
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(messages) => Json(ApiResponse::success(json!({
            "chat_messages": messages,
            "total": messages.len()
        }), "获取聊天消息成功")),
        Err(e) => {
            tracing::error!("Failed to list chat messages: {}", e);
            Json(ApiResponse::error(500, "获取聊天消息失败"))
        }
    }
}

async fn create_chat_message(
    State(state): State<AppState>,
    Json(payload): Json<models::CreateChatMessage>,
) -> Json<ApiResponse<models::ChatMessage>> {
    let chat_id = match Uuid::parse_str(&payload.chat_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的聊天室ID")),
    };

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query_as!(
        models::ChatMessage,
        r#"
        INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, message_type, content, file_url, file_name, created_at, is_read)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
        RETURNING id, chat_id, sender_id, sender_name, message_type, content, file_url, file_name, created_at, is_read
        "#,
        id,
        chat_id,
        payload.sender_id,
        payload.sender_name,
        payload.message_type,
        payload.content.clone(),
        payload.file_url,
        payload.file_name,
        now
    )
    .fetch_one(&state.pool)
    .await;

    if let Ok(ref message) = result {
        // 更新聊天室的最后消息
        let _ = sqlx::query!(
            r#"
            UPDATE chat_rooms
            SET last_message = $1, last_message_time = $2, updated_at = $3
            WHERE id = $4
            "#,
            payload.content,
            now,
            now,
            chat_id
        )
        .execute(&state.pool)
        .await;
    }

    match result {
        Ok(message) => Json(ApiResponse::success(message, "发送消息成功")),
        Err(e) => {
            tracing::error!("Failed to create chat message: {}", e);
            Json(ApiResponse::error(500, "发送消息失败"))
        }
    }
}

async fn mark_message_read(
    State(state): State<AppState>,
    Path(message_id): Path<Uuid>,
) -> Json<ApiResponse<models::ChatMessage>> {
    let result = sqlx::query_as!(
        models::ChatMessage,
        r#"
        UPDATE chat_messages
        SET is_read = true
        WHERE id = $1
        RETURNING id, chat_id, sender_id, sender_name, message_type, content, file_url, file_name, created_at, is_read
        "#,
        message_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(message)) => Json(ApiResponse::success(message, "标记消息已读成功")),
        Ok(None) => Json(ApiResponse::error(404, "消息不存在")),
        Err(e) => {
            tracing::error!("Failed to mark message read: {}", e);
            Json(ApiResponse::error(500, "标记消息已读失败"))
        }
    }
}

async fn delete_chat_message(
    State(state): State<AppState>,
    Path(message_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query!(
        r#"
        DELETE FROM chat_messages
        WHERE id = $1
        RETURNING id, chat_id, content
        "#,
        message_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(record)) => {
            let _ = sqlx::query!(
                r#"
                UPDATE chat_rooms
                SET last_message = NULL, last_message_time = NULL, updated_at = $1
                WHERE id = $2 AND last_message = $3
                "#,
                Utc::now().naive_utc(),
                record.chat_id,
                record.content
            )
            .execute(&state.pool)
            .await;
            
            Json(ApiResponse::success(json!({ "deleted": true }), "删除消息成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "消息不存在")),
        Err(e) => {
            tracing::error!("Failed to delete chat message: {}", e);
            Json(ApiResponse::error(500, "删除消息失败"))
        }
    }
}

async fn update_chat_message(
    State(state): State<AppState>,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<models::ChatMessage>> {
    let content = payload.get("content").and_then(|v| v.as_str()).unwrap_or("");
    
    if content.is_empty() {
        return Json(ApiResponse::error(400, "消息内容不能为空"));
    }

    let result = sqlx::query_as!(
        models::ChatMessage,
        r#"
        UPDATE chat_messages
        SET content = $1
        WHERE id = $2
        RETURNING id, chat_id, sender_id, sender_name, message_type, content, file_url, file_name, created_at, is_read
        "#,
        content,
        message_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(message)) => {
            let _ = sqlx::query!(
                r#"
                UPDATE chat_rooms
                SET last_message = $1, updated_at = $2
                WHERE id = $3
                "#,
                content,
                Utc::now().naive_utc(),
                message.chat_id
            )
            .execute(&state.pool)
            .await;
            
            Json(ApiResponse::success(message, "更新消息成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "消息不存在")),
        Err(e) => {
            tracing::error!("Failed to update chat message: {}", e);
            Json(ApiResponse::error(500, "更新消息失败"))
        }
    }
}

async fn search_chat_messages(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
    query: axum::extract::Query<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let keyword = query.get("keyword").and_then(|k| k.as_str()).unwrap_or("");
    
    let result = sqlx::query_as!(
        models::ChatMessage,
        r#"
        SELECT id, chat_id, sender_id, sender_name, message_type, content, file_url, file_name, created_at, is_read
        FROM chat_messages
        WHERE chat_id = $1 AND content ILIKE $2
        ORDER BY created_at DESC
        "#,
        chat_id,
        format!("%{}%", keyword)
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(messages) => Json(ApiResponse::success(json!({
            "messages": messages,
            "total": messages.len()
        }), "搜索消息成功")),
        Err(e) => {
            tracing::error!("Failed to search chat messages: {}", e);
            Json(ApiResponse::error(500, "搜索消息失败"))
        }
    }
}

async fn list_project_groups(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as!(
        models::ProjectGroup,
        r#"
        SELECT id, name, description, project_id, members, created_by, created_at, updated_at
        FROM project_groups
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(groups) => Json(ApiResponse::success(json!({
            "project_groups": groups,
            "total": groups.len()
        }), "获取项目群组成功")),
        Err(e) => {
            tracing::error!("Failed to list project groups: {}", e);
            Json(ApiResponse::error(500, "获取项目群组失败"))
        }
    }
}

async fn create_project_group(
    State(state): State<AppState>,
    Json(payload): Json<models::CreateProjectGroup>,
) -> Json<ApiResponse<models::ProjectGroup>> {
    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();
    let project_id = payload.project_id.and_then(|p| Uuid::parse_str(&p).ok());

    let result = sqlx::query_as!(
        models::ProjectGroup,
        r#"
        INSERT INTO project_groups (id, name, description, project_id, members, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, description, project_id, members, created_by, created_at, updated_at
        "#,
        id,
        payload.name,
        payload.description,
        project_id,
        json!(payload.members),
        payload.created_by,
        now,
        now
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(group) => Json(ApiResponse::success(group, "创建项目群组成功")),
        Err(e) => {
            tracing::error!("Failed to create project group: {}", e);
            Json(ApiResponse::error(500, "创建项目群组失败"))
        }
    }
}

async fn list_notifications(
  State(state): State<AppState>,
  Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
  let result = sqlx::query(
    r#"
    SELECT id, user_id, title, content, notification_type, is_read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    "#
  )
  .bind(&user_id)
  .fetch_all(&state.pool)
  .await;

    match result {
        Ok(rows) => {
            let notifications: Vec<models::Notification> = rows.iter()
                .map(|row| models::Notification {
                    id: row.get("id"),
                    user_id: row.get("user_id"),
                    title: row.get("title"),
                    content: row.get("content"),
                    notification_type: row.get("notification_type"),
                    is_read: row.get("is_read"),
                    created_at: row.get("created_at"),
                })
                .collect();
            Json(ApiResponse::success(json!({
                "notifications": notifications,
                "total": notifications.len()
            }), "获取通知列表成功"))
        },
        Err(e) => {
            tracing::error!("Failed to list notifications: {}", e);
            Json(ApiResponse::error(500, "获取通知列表失败"))
        }
    }
}

async fn create_notification(
  State(state): State<AppState>,
  Json(payload): Json<models::CreateNotification>,
) -> Json<ApiResponse<models::Notification>> {
  let id = Uuid::new_v4();
  let now = Utc::now().naive_utc();

  let result = sqlx::query(
    r#"
    INSERT INTO notifications (id, user_id, title, content, notification_type, is_read, created_at)
    VALUES ($1, $2, $3, $4, $5, false, $6)
    RETURNING id, user_id, title, content, notification_type, is_read, created_at
    "#
  )
  .bind(id)
  .bind(&payload.user_id)
  .bind(&payload.title)
  .bind(&payload.content)
  .bind(&payload.notification_type)
  .bind(now)
  .fetch_one(&state.pool)
  .await;

    match result {
        Ok(row) => {
            let notification = models::Notification {
                id: row.get("id"),
                user_id: row.get("user_id"),
                title: row.get("title"),
                content: row.get("content"),
                notification_type: row.get("notification_type"),
                is_read: row.get("is_read"),
                created_at: row.get("created_at"),
            };
            Json(ApiResponse::success(notification, "创建通知成功"))
        },
        Err(e) => {
            tracing::error!("Failed to create notification: {}", e);
            Json(ApiResponse::error(500, "创建通知失败"))
        }
    }
}

async fn mark_notification_read(
  State(state): State<AppState>,
  Path(notification_id): Path<Uuid>,
) -> Json<ApiResponse<models::Notification>> {
  let result = sqlx::query(
    r#"
    UPDATE notifications
    SET is_read = true
    WHERE id = $1
    RETURNING id, user_id, title, content, notification_type, is_read, created_at
    "#
  )
  .bind(notification_id)
  .fetch_optional(&state.pool)
  .await;

    match result {
        Ok(Some(row)) => {
            let notification = models::Notification {
                id: row.get("id"),
                user_id: row.get("user_id"),
                title: row.get("title"),
                content: row.get("content"),
                notification_type: row.get("notification_type"),
                is_read: row.get("is_read"),
                created_at: row.get("created_at"),
            };
            Json(ApiResponse::success(notification, "标记通知已读成功"))
        },
        Ok(None) => Json(ApiResponse::error(404, "通知不存在")),
        Err(e) => {
            tracing::error!("Failed to mark notification read: {}", e);
            Json(ApiResponse::error(500, "标记通知已读失败"))
        }
    }
}

async fn mark_all_notifications_read(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query(
        r#"
        UPDATE notifications
        SET is_read = true
        WHERE user_id = $1
        "#
    )
    .bind(&user_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({ "marked": true }), "标记所有通知已读成功")),
        Err(e) => {
            tracing::error!("Failed to mark all notifications read: {}", e);
            Json(ApiResponse::error(500, "标记所有通知已读失败"))
        }
    }
}

async fn upload_file(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());
    
    // 创建上传目录
    tokio::fs::create_dir_all(&upload_dir).await.map_err(|e| {
        tracing::error!("Failed to create upload directory: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut uploaded_files = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        tracing::error!("Failed to get multipart field: {}", e);
        StatusCode::BAD_REQUEST
    })? {
        let file_name = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        
        let data = field.bytes().await.map_err(|e| {
            tracing::error!("Failed to read file data: {}", e);
            StatusCode::BAD_REQUEST
        })?;

        let file_id = Uuid::new_v4();
        let file_path = format!("{}/{}-{}", upload_dir, file_id, file_name);

        tokio::fs::write(&file_path, &data).await.map_err(|e| {
            tracing::error!("Failed to write file: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        uploaded_files.push(json!({
            "file_id": file_id.to_string(),
            "file_name": file_name,
            "file_path": file_path,
            "content_type": content_type,
            "size": data.len()
        }));
    }

    Ok(Json(ApiResponse::success(json!({
        "files": uploaded_files
    }), "文件上传成功")))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl axum::response::IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    
    let tx = state.tx.clone();
    let mut rx = tx.subscribe();
    
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let json_msg = serde_json::to_string(&msg).unwrap_or_default();
            if sender.send(Message::Text(Utf8Bytes::from(json_msg))).await.is_err() {
                break;
            }
        }
    });
    
    let state_for_recv = state.clone();
    
    let recv_task = tokio::spawn(async move {
        while let Some(msg_result) = receiver.next().await {
            match msg_result {
                Ok(Message::Text(text)) => {
                    if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text.to_string()) {
                        let chat_id = ws_msg.chat_id.as_ref().and_then(|c| Uuid::parse_str(c).ok());
                        
                        if let Some(cid) = chat_id {
                            let id = Uuid::new_v4();
                            let now = Utc::now().naive_utc();

                            // 保存消息到数据库
                            let result = sqlx::query!(
                                r#"
                                INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, message_type, content, file_url, file_name, created_at, is_read)
                                VALUES ($1, $2, $3, $4, 'text', $5, NULL, NULL, $6, false)
                                "#,
                                id,
                                cid,
                                ws_msg.sender_id.clone(),
                                ws_msg.sender_name.clone(),
                                ws_msg.content.clone(),
                                now
                            )
                            .execute(&state_for_recv.pool)
                            .await;

                            if result.is_ok() {
                                // 更新聊天室的最后消息
                                let _ = sqlx::query!(
                                    r#"
                                    UPDATE chat_rooms
                                    SET last_message = $1, last_message_time = $2, updated_at = $3
                                    WHERE id = $4
                                    "#,
                                    ws_msg.content.clone(),
                                    now,
                                    now,
                                    cid
                                )
                                .execute(&state_for_recv.pool)
                                .await;

                                let _ = state_for_recv.tx.send(ws_msg);
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    break;
                }
                _ => {}
            }
        }
    });
    
    tokio::spawn(async move {
        tokio::join!(send_task, recv_task);
    });
}

async fn ws_connect(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    {
        let mut connections = state.ws_connections.lock().unwrap();
        let (tx, _) = broadcast::channel(100);
        connections.insert(user_id.clone(), tx);
    }

    // 更新用户在线状态
    let now = Utc::now().naive_utc();
    sqlx::query!(
        r#"
        INSERT INTO user_online_status (user_id, is_online, last_seen)
        VALUES ($1, true, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET is_online = true, last_seen = $2
        "#,
        user_id,
        now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update user online status: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ApiResponse::success(json!({ "connected": true }), "WebSocket连接成功")))
}

async fn ws_disconnect(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    {
        let mut connections = state.ws_connections.lock().unwrap();
        connections.remove(&user_id);
    }

    // 更新用户离线状态
    let now = Utc::now().naive_utc();
    sqlx::query!(
        r#"
        UPDATE user_online_status
        SET is_online = false, last_seen = $1
        WHERE user_id = $2
        "#,
        now,
        user_id
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update user offline status: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ApiResponse::success(json!({ "disconnected": true }), "WebSocket断开成功")))
}

async fn get_user_online_status(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query!(
        r#"
        SELECT is_online, last_seen
        FROM user_online_status
        WHERE user_id = $1
        "#,
        user_id
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(json!({
            "user_id": user_id,
            "is_online": record.is_online,
            "last_seen": record.last_seen
        }), "获取用户在线状态成功")),
        Ok(None) => Json(ApiResponse::success(json!({
            "user_id": user_id,
            "is_online": false,
            "last_seen": null
        }), "用户未记录在线状态")),
        Err(e) => {
            tracing::error!("Failed to get user online status: {}", e);
            Json(ApiResponse::error(500, "获取用户在线状态失败"))
        }
    }
}

async fn list_friends(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query!(
        r#"
        SELECT f.id, f.friend_id, f.friend_name, f.status, f.created_at, u.is_online, u.last_seen
        FROM friends f
        LEFT JOIN user_online_status u ON f.friend_id = u.user_id
        WHERE f.user_id = $1
        ORDER BY f.status, f.updated_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let friends: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| json!({
                    "id": row.id,
                    "friend_id": row.friend_id,
                    "friend_name": row.friend_name,
                    "status": row.status,
                    "created_at": row.created_at,
                    "is_online": row.is_online.unwrap_or(false),
                    "last_seen": row.last_seen
                }))
                .collect();
            Json(ApiResponse::success(json!({ "friends": friends }), "获取好友列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to get friends: {}", e);
            Json(ApiResponse::error(500, "获取好友列表失败"))
        }
    }
}

async fn send_friend_request(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Json(body): Json<CreateFriendRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let now = Utc::now().naive_utc();
    let id = Uuid::new_v4();

    let result = sqlx::query!(
        r#"
        INSERT INTO friends (id, user_id, friend_id, friend_name, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'pending', $5, $6)
        ON CONFLICT (user_id, friend_id) DO NOTHING
        "#,
        id,
        user_id,
        body.friend_id,
        body.friend_name,
        now,
        now
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "request_sent": true }), "好友请求已发送")))
        }
        Err(e) => {
            tracing::error!("Failed to send friend request: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn accept_friend_request(
    State(state): State<AppState>,
    Path((user_id, friend_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE friends
        SET status = 'accepted', updated_at = $1
        WHERE user_id = $2 AND friend_id = $3 AND status = 'pending'
        "#,
        now,
        user_id,
        friend_id
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "accepted": true }), "好友请求已接受")))
        }
        Err(e) => {
            tracing::error!("Failed to accept friend request: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn reject_friend_request(
    State(state): State<AppState>,
    Path((user_id, friend_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let result = sqlx::query!(
        r#"
        DELETE FROM friends
        WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
        "#,
        user_id,
        friend_id
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "rejected": true }), "好友请求已拒绝")))
        }
        Err(e) => {
            tracing::error!("Failed to reject friend request: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn remove_friend(
    State(state): State<AppState>,
    Path((user_id, friend_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let result = sqlx::query!(
        r#"
        DELETE FROM friends
        WHERE user_id = $1 AND friend_id = $2
        "#,
        user_id,
        friend_id
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "removed": true }), "好友已删除")))
        }
        Err(e) => {
            tracing::error!("Failed to remove friend: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn list_contact_groups(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query!(
        r#"
        SELECT * FROM contact_groups WHERE user_id = $1 ORDER BY updated_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(groups) => {
            let groups_json: Vec<serde_json::Value> = groups
                .into_iter()
                .map(|g| json!({
                    "id": g.id,
                    "name": g.name,
                    "created_at": g.created_at,
                    "updated_at": g.updated_at
                }))
                .collect();
            Json(ApiResponse::success(json!({ "groups": groups_json }), "获取联系人分组成功"))
        }
        Err(e) => {
            tracing::error!("Failed to get contact groups: {}", e);
            Json(ApiResponse::error(500, "获取联系人分组失败"))
        }
    }
}

async fn create_contact_group(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Json(body): Json<CreateContactGroup>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let now = Utc::now().naive_utc();
    let id = Uuid::new_v4();

    let result = sqlx::query!(
        r#"
        INSERT INTO contact_groups (id, user_id, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        id,
        user_id,
        body.name,
        now,
        now
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "group_id": id }), "联系人分组创建成功")))
        }
        Err(e) => {
            tracing::error!("Failed to create contact group: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn update_contact_group(
    State(state): State<AppState>,
    Path((user_id, group_id)): Path<(String, String)>,
    Json(body): Json<CreateContactGroup>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let now = Utc::now().naive_utc();
    let group_uuid = Uuid::parse_str(&group_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let result = sqlx::query!(
        r#"
        UPDATE contact_groups
        SET name = $1, updated_at = $2
        WHERE id = $3 AND user_id = $4
        "#,
        body.name,
        now,
        group_uuid,
        user_id
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "updated": true }), "联系人分组更新成功")))
        }
        Err(e) => {
            tracing::error!("Failed to update contact group: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn delete_contact_group(
    State(state): State<AppState>,
    Path((user_id, group_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let group_uuid = Uuid::parse_str(&group_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let result = sqlx::query!(
        r#"
        DELETE FROM contact_groups
        WHERE id = $1 AND user_id = $2
        "#,
        group_uuid,
        user_id
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "deleted": true }), "联系人分组已删除")))
        }
        Err(e) => {
            tracing::error!("Failed to delete contact group: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn add_contact_group_member(
    State(state): State<AppState>,
    Path((user_id, group_id)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let member_user_id = body["user_id"].as_str().ok_or(StatusCode::BAD_REQUEST)?;
    let group_uuid = Uuid::parse_str(&group_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        INSERT INTO contact_group_members (id, group_id, user_id, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (group_id, user_id) DO NOTHING
        "#,
        id,
        group_uuid,
        member_user_id,
        now
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "added": true }), "成员已添加到分组")))
        }
        Err(e) => {
            tracing::error!("Failed to add contact group member: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn remove_contact_group_member(
    State(state): State<AppState>,
    Path((user_id, group_id, member_user_id)): Path<(String, String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let group_uuid = Uuid::parse_str(&group_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let result = sqlx::query!(
        r#"
        DELETE FROM contact_group_members
        WHERE group_id = $1 AND user_id = $2
        "#,
        group_uuid,
        member_user_id
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            Ok(Json(ApiResponse::success(json!({ "removed": true }), "成员已从分组移除")))
        }
        Err(e) => {
            tracing::error!("Failed to remove contact group member: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn mute_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let chat_uuid = Uuid::parse_str(&chat_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE chat_rooms
        SET is_muted = true, updated_at = $1
        WHERE id = $2
        "#,
        now,
        chat_uuid
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Ok(Json(ApiResponse::success(json!({ "muted": true }), "已开启免打扰"))),
        Err(e) => {
            tracing::error!("Failed to mute chat room: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn unmute_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let chat_uuid = Uuid::parse_str(&chat_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE chat_rooms
        SET is_muted = false, updated_at = $1
        WHERE id = $2
        "#,
        now,
        chat_uuid
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Ok(Json(ApiResponse::success(json!({ "muted": false }), "已关闭免打扰"))),
        Err(e) => {
            tracing::error!("Failed to unmute chat room: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn pin_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let chat_uuid = Uuid::parse_str(&chat_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE chat_rooms
        SET is_pinned = true, updated_at = $1
        WHERE id = $2
        "#,
        now,
        chat_uuid
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Ok(Json(ApiResponse::success(json!({ "pinned": true }), "已置顶会话"))),
        Err(e) => {
            tracing::error!("Failed to pin chat room: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn unpin_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, StatusCode> {
    let chat_uuid = Uuid::parse_str(&chat_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE chat_rooms
        SET is_pinned = false, updated_at = $1
        WHERE id = $2
        "#,
        now,
        chat_uuid
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Ok(Json(ApiResponse::success(json!({ "pinned": false }), "已取消置顶"))),
        Err(e) => {
            tracing::error!("Failed to unpin chat room: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    // 创建数据库连接池
    let pool = db::create_pool(&database_url).await?;
    tracing::info!("Database connection pool created");

    // 运行数据库迁移
    db::run_migrations(&pool).await?;
    tracing::info!("Database migrations completed");

    let app_state = AppState::new(pool, AuthState::from_env());

    let cors = create_cors_layer();

    let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());

    let public_routes = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/ws", axum::routing::get(ws_handler))
        .route("/api/v1/chat-rooms", axum::routing::get(list_chat_rooms))
        .route("/api/v1/chat-rooms/{chat_id}", axum::routing::get(get_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}/messages", axum::routing::get(list_chat_messages))
        .route("/api/v1/project-groups", axum::routing::get(list_project_groups))
        .route("/api/v1/notifications/{user_id}", axum::routing::get(list_notifications))
        .route("/api/v1/users/{user_id}/online-status", axum::routing::get(get_user_online_status))
        .nest_service("/uploads", ServeDir::new(&upload_dir));

    let protected_routes = Router::new()
        .route("/api/v1/chat-rooms", axum::routing::post(create_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}", axum::routing::put(update_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}", axum::routing::delete(delete_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}/members", axum::routing::get(get_chat_room_members))
        .route("/api/v1/chat-rooms/{chat_id}/members", axum::routing::post(add_chat_room_member))
        .route("/api/v1/chat-rooms/{chat_id}/members/{user_id}", axum::routing::delete(remove_chat_room_member))
        .route("/api/v1/chat-rooms/{chat_id}/messages", axum::routing::post(create_chat_message))
        .route("/api/v1/chat-rooms/{chat_id}/messages/search", axum::routing::get(search_chat_messages))
        .route("/api/v1/chat-messages/{message_id}", axum::routing::delete(delete_chat_message))
        .route("/api/v1/chat-messages/{message_id}", axum::routing::put(update_chat_message))
        .route("/api/v1/chat-messages/{message_id}/read", axum::routing::put(mark_message_read))
        .route("/api/v1/project-groups", axum::routing::post(create_project_group))
        .route("/api/v1/notifications/{user_id}", axum::routing::post(create_notification))
        .route("/api/v1/notifications/{notification_id}/read", axum::routing::put(mark_notification_read))
        .route("/api/v1/notifications/{user_id}/read-all", axum::routing::put(mark_all_notifications_read))
        .route("/api/v1/ws/connect/{user_id}", axum::routing::post(ws_connect))
        .route("/api/v1/ws/disconnect/{user_id}", axum::routing::post(ws_disconnect))
        .route("/api/v1/files/upload", axum::routing::post(upload_file))
        .route("/api/v1/friends", axum::routing::get(list_friends))
        .route("/api/v1/friends", axum::routing::post(send_friend_request))
        .route("/api/v1/friends/{friend_id}/accept", axum::routing::put(accept_friend_request))
        .route("/api/v1/friends/{friend_id}/reject", axum::routing::put(reject_friend_request))
        .route("/api/v1/friends/{friend_id}", axum::routing::delete(remove_friend))
        .route("/api/v1/contact-groups", axum::routing::get(list_contact_groups))
        .route("/api/v1/contact-groups", axum::routing::post(create_contact_group))
        .route("/api/v1/contact-groups/{group_id}", axum::routing::put(update_contact_group))
        .route("/api/v1/contact-groups/{group_id}", axum::routing::delete(delete_contact_group))
        .route("/api/v1/contact-groups/{group_id}/members", axum::routing::post(add_contact_group_member))
        .route("/api/v1/contact-groups/{group_id}/members/{user_id}", axum::routing::delete(remove_contact_group_member))
        .route("/api/v1/chat-rooms/{chat_id}/mute", axum::routing::put(mute_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}/unmute", axum::routing::put(unmute_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}/pin", axum::routing::put(pin_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}/unpin", axum::routing::put(unpin_chat_room))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = public_routes
        .merge(protected_routes)
        .with_state(app_state)
        .layer(cors);

    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| env::var("PORT").unwrap_or_else(|_| "8051".to_string()));
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-IM 即时通讯系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("🔗 WebSocket端点: ws://0.0.0.0:{}/ws", port);
    tracing::info!("📁 文件上传目录: {}", upload_dir);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
