use axum::{
    extract::{Path, State, WebSocketUpgrade, Query},
    extract::ws::{Message as WsRawMessage, WebSocket, Utf8Bytes},
    Json,
};
use chrono::Utc;
use uuid::Uuid;
use serde_json::json;
use sqlx::PgPool;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tokio::sync::broadcast;
use futures_util::{SinkExt, StreamExt};

use crate::models::{WsMessage, WsEvent, UserStatus};
use topems_shared::ApiResponse;

// WebSocket连接管理器
#[derive(Clone)]
pub struct WebSocketManager {
    pub connections: Arc<Mutex<HashMap<String, broadcast::Sender<WsEvent>>>>,
    pub global_tx: broadcast::Sender<WsEvent>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(1000);
        WebSocketManager {
            connections: Arc::new(Mutex::new(HashMap::new())),
            global_tx: tx,
        }
    }

    pub fn add_connection(&self, user_id: String) -> broadcast::Sender<WsEvent> {
        let (tx, _) = broadcast::channel(100);
        self.connections.lock().unwrap().insert(user_id, tx.clone());
        tx
    }

    pub fn remove_connection(&self, user_id: &str) {
        self.connections.lock().unwrap().remove(user_id);
    }

    pub fn broadcast_event(&self, event: WsEvent) {
        let _ = self.global_tx.send(event);
    }

    pub fn send_to_user(&self, user_id: &str, event: WsEvent) {
        if let Some(tx) = self.connections.lock().unwrap().get(user_id) {
            let _ = tx.send(event);
        }
    }
}

// ==================== WebSocket连接API ====================

/// GET /api/v1/ws/connect - WebSocket连接端点
pub async fn ws_connect_handler(
    ws: WebSocketUpgrade,
    State((pool, ws_manager)): State<(PgPool, WebSocketManager)>,
    Query(params): Query<serde_json::Value>,
) -> impl axum::response::IntoResponse {
    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("anonymous").to_string();
    
    ws.on_upgrade(move |socket| handle_websocket(socket, pool, ws_manager, user_id))
}

async fn handle_websocket(socket: WebSocket, pool: PgPool, ws_manager: WebSocketManager, user_id: String) {
    let (mut sender, mut receiver) = socket.split();
    
    // 为用户创建专用通道
    let user_tx = ws_manager.add_connection(user_id.clone());
    let mut user_rx = user_tx.subscribe();
    let mut global_rx = ws_manager.global_tx.subscribe();
    
    // 更新用户在线状态
    update_user_online_status(&pool, &user_id, true).await;
    
    // 广播用户上线事件
    let online_event = WsEvent {
        event_type: "user_online".to_string(),
        data: json!({
            "user_id": user_id,
            "is_online": true,
            "timestamp": Utc::now().to_rfc3339()
        }),
        timestamp: Utc::now().to_rfc3339(),
    };
    ws_manager.broadcast_event(online_event);
    
    // 发送任务：监听用户专用通道和全局通道
    let send_task = tokio::spawn(async move {
        loop {
            // 优先处理用户专用消息
            if let Ok(event) = user_rx.recv().await {
                let json_msg = serde_json::to_string(&event).unwrap_or_default();
                if sender.send(WsRawMessage::Text(Utf8Bytes::from(json_msg))).await.is_err() {
                    break;
                }
            }
            
            // 然后处理全局广播消息
            if let Ok(event) = global_rx.recv().await {
                let json_msg = serde_json::to_string(&event).unwrap_or_default();
                if sender.send(WsRawMessage::Text(Utf8Bytes::from(json_msg))).await.is_err() {
                    break;
                }
            }
        }
    });
    
    let recv_pool = pool.clone();
    let recv_ws_manager = ws_manager.clone();
    let recv_user_id = user_id.clone();
    
    // 接收任务：处理客户端消息
    let recv_task = tokio::spawn(async move {
        while let Some(msg_result) = receiver.next().await {
            match msg_result {
                Ok(WsRawMessage::Text(text)) => {
                    if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text.to_string()) {
                        handle_ws_message(&recv_pool, &recv_ws_manager, &recv_user_id, ws_msg).await;
                    }
                }
                Ok(WsRawMessage::Close(_)) => {
                    break;
                }
                _ => {}
            }
        }
    });
    
    tokio::spawn(async move {
        tokio::join!(send_task, recv_task);
        
        // 连接断开时清理
        ws_manager.remove_connection(&user_id);
        update_user_online_status(&pool, &user_id, false).await;
        
        // 广播用户离线事件
        let offline_event = WsEvent {
            event_type: "user_offline".to_string(),
            data: json!({
                "user_id": user_id,
                "is_online": false,
                "timestamp": Utc::now().to_rfc3339()
            }),
            timestamp: Utc::now().to_rfc3339(),
        };
        ws_manager.broadcast_event(offline_event);
    });
}

async fn handle_ws_message(pool: &PgPool, ws_manager: &WebSocketManager, user_id: &str, ws_msg: WsMessage) {
    match ws_msg.msg_type.as_str() {
        "chat_message" => {
            // 处理聊天消息
            if let Some(chat_id) = ws_msg.chat_id.as_ref().and_then(|c| Uuid::parse_str(c).ok()) {
                let message_id = Uuid::new_v4();
                let now = Utc::now().naive_utc();

                // 保存消息到数据库
                let result = sqlx::query(
                    r#"
                    INSERT INTO messages (id, chat_room_id, sender_id, sender_name, message_type, content, 
                                         file_url, file_name, file_size, reply_to_id, forwarded_from_id, 
                                         is_read, is_edited, is_deleted, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, 'text', $5, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, $6, NULL)
                    "#
                )
                .bind(message_id)
                .bind(chat_id)
                .bind(ws_msg.sender_id.clone())
                .bind(ws_msg.sender_name.clone())
                .bind(ws_msg.content.clone())
                .bind(now)
                .execute(pool)
                .await;

                if result.is_ok() {
                    // 更新聊天室的最后消息
                    let _ = sqlx::query(
                        r#"
                        UPDATE chat_rooms
                        SET last_message = $1, last_message_time = $2, updated_at = $3
                        WHERE id = $4
                        "#
                    )
                    .bind(ws_msg.content.clone())
                    .bind(now)
                    .bind(now)
                    .bind(chat_id)
                    .execute(pool)
                    .await;

                    // 广播消息到聊天室成员
                    let event = WsEvent {
                        event_type: "new_message".to_string(),
                        data: json!({
                            "message_id": message_id.to_string(),
                            "chat_id": chat_id.to_string(),
                            "sender_id": ws_msg.sender_id,
                            "sender_name": ws_msg.sender_name,
                            "content": ws_msg.content,
                            "timestamp": now.to_string()
                        }),
                        timestamp: Utc::now().to_rfc3339(),
                    };
                    ws_manager.broadcast_event(event);
                }
            }
        }
        "read_receipt" => {
            // 处理已读回执
            if let Some(msg_id) = ws_msg.message_id.as_ref().and_then(|m| Uuid::parse_str(m).ok()) {
                let now = Utc::now().naive_utc();

                // 创建已读回执
                let _ = sqlx::query(
                    r#"
                    INSERT INTO message_read_receipts (id, message_id, user_id, read_at)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = $4
                    "#
                )
                .bind(Uuid::new_v4())
                .bind(msg_id)
                .bind(user_id)
                .bind(now)
                .execute(pool)
                .await;

                // 广播已读回执
                let event = WsEvent {
                    event_type: "message_read".to_string(),
                    data: json!({
                        "message_id": msg_id.to_string(),
                        "user_id": user_id,
                        "read_at": now.to_string()
                    }),
                    timestamp: Utc::now().to_rfc3339(),
                };
                ws_manager.broadcast_event(event);
            }
        }
        "typing" => {
            // 处理正在输入状态
            if let Some(chat_id) = ws_msg.chat_id.as_ref() {
                let event = WsEvent {
                    event_type: "user_typing".to_string(),
                    data: json!({
                        "user_id": user_id,
                        "chat_id": chat_id,
                        "is_typing": true
                    }),
                    timestamp: Utc::now().to_rfc3339(),
                };
                ws_manager.broadcast_event(event);
            }
        }
        _ => {}
    }
}

async fn update_user_online_status(pool: &PgPool, user_id: &str, is_online: bool) {
    let now = Utc::now().naive_utc();
    
    let _ = sqlx::query(
        r#"
        INSERT INTO user_status (user_id, is_online, status_type, status_message, last_seen, updated_at)
        VALUES ($1, $2, $3, NULL, $4, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET is_online = $2, last_seen = $4, updated_at = $4
        "#
    )
    .bind(user_id)
    .bind(is_online)
    .bind(if is_online { "online" } else { "offline" })
    .bind(now)
    .execute(pool)
    .await;
}

// ==================== 在线状态管理API ====================

/// GET /api/v1/users/:id/online-status - 获取用户在线状态
pub async fn get_user_online_status(
    State(pool): State<PgPool>,
    Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, UserStatus>(
        r#"
        SELECT user_id, is_online, status_type, status_message, last_seen, updated_at
        FROM user_status
        WHERE user_id = $1
        "#
    )
    .bind(&user_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(status)) => Json(ApiResponse::success(json!({
            "user_id": status.user_id,
            "is_online": status.is_online,
            "status_type": status.status_type,
            "status_message": status.status_message,
            "last_seen": status.last_seen
        }), "获取用户在线状态成功")),
        Ok(None) => Json(ApiResponse::success(json!({
            "user_id": user_id,
            "is_online": false,
            "status_type": "offline",
            "status_message": null,
            "last_seen": null
        }), "用户未记录在线状态")),
        Err(e) => {
            tracing::error!("Failed to get user online status: {}", e);
            Json(ApiResponse::error(500, "获取用户在线状态失败"))
        }
    }
}

/// PUT /api/v1/users/:id/status - 更新用户状态
pub async fn update_user_status(
    State(pool): State<PgPool>,
    Path(user_id): Path<String>,
    Json(payload): Json<crate::models::UpdateUserStatus>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = Utc::now().naive_utc();
    let status_type = payload.status_type.unwrap_or_else(|| "online".to_string());

    let result = sqlx::query(
        r#"
        INSERT INTO user_status (user_id, is_online, status_type, status_message, last_seen, updated_at)
        VALUES ($1, TRUE, $2, $3, $4, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET status_type = $2, status_message = $3, updated_at = $4
        "#
    )
    .bind(&user_id)
    .bind(&status_type)
    .bind(payload.status_message)
    .bind(now)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "user_id": user_id,
            "status_type": status_type,
            "updated": true
        }), "更新用户状态成功")),
        Err(e) => {
            tracing::error!("Failed to update user status: {}", e);
            Json(ApiResponse::error(500, "更新用户状态失败"))
        }
    }
}

/// GET /api/v1/users/online - 获取所有在线用户
pub async fn list_online_users(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, UserStatus>(
        r#"
        SELECT user_id, is_online, status_type, status_message, last_seen, updated_at
        FROM user_status
        WHERE is_online = TRUE
        ORDER BY last_seen DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(users) => Json(ApiResponse::success(json!({
            "online_users": users,
            "total": users.len()
        }), "获取在线用户列表成功")),
        Err(e) => {
            tracing::error!("Failed to list online users: {}", e);
            Json(ApiResponse::error(500, "获取在线用户列表失败"))
        }
    }
}