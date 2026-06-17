use axum::{
    extract::{Query, State, WebSocketUpgrade},
    response::IntoResponse,
    extract::ws::{Message, WebSocket},
};
use futures_util::{stream::SplitSink, SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::interval;
use tracing::{info, warn, error};

/// WebSocket 连接状态
pub(crate) struct WsConnection {
    user_id: String,
    sender: Arc<RwLock<SplitSink<WebSocket, Message>>>,
    connected_at: chrono::DateTime<chrono::Utc>,
    last_pong: std::sync::atomic::AtomicI64,
}

impl WsConnection {
    fn new(user_id: String, sender: Arc<RwLock<SplitSink<WebSocket, Message>>>) -> Self {
        Self {
            user_id,
            sender,
            connected_at: chrono::Utc::now(),
            last_pong: std::sync::atomic::AtomicI64::new(chrono::Utc::now().timestamp()),
        }
    }

    fn update_pong_time(&self) {
        self.last_pong.store(chrono::Utc::now().timestamp(), std::sync::atomic::Ordering::Relaxed);
    }

    fn seconds_since_pong(&self) -> i64 {
        chrono::Utc::now().timestamp() - self.last_pong.load(std::sync::atomic::Ordering::Relaxed)
    }
}

type ConnectionMap = Arc<RwLock<HashMap<String, Arc<WsConnection>>>>;

pub struct WsState {
    connections: ConnectionMap,
}

impl WsState {
    pub fn new() -> Self {
        let connections = Arc::new(RwLock::new(HashMap::new()));
        Self { connections }
    }

    /// 添加连接
    pub(crate) async fn add_connection(&self, user_id: String, connection: Arc<WsConnection>) {
        let mut connections = self.connections.write().await;
        // 移除旧连接（如果存在）
        connections.remove(&user_id);
        connections.insert(user_id.clone(), connection);
        info!("User {} connected, total connections: {}", user_id, connections.len());
    }

    /// 移除连接
    pub async fn remove_connection(&self, user_id: &str) {
        let mut connections = self.connections.write().await;
        connections.remove(user_id);
        info!("User {} disconnected, total connections: {}", user_id, connections.len());
    }

    /// 获取所有已连接用户数
    pub async fn connection_count(&self) -> usize {
        self.connections.read().await.len()
    }

    /// 向指定用户发送消息
    pub async fn send_to_user(&self, user_id: &str, message: Message) -> bool {
        let connections = self.connections.read().await;
        if let Some(conn) = connections.get(user_id) {
            let mut sender = conn.sender.write().await;
            if sender.send(message).await.is_ok() {
                return true;
            }
        }
        false
    }

    /// 广播消息给所有用户
    pub async fn broadcast(&self, message: Message) {
        let connections = self.connections.read().await;
        for conn in connections.values() {
            let mut sender = conn.sender.write().await;
            if let Err(e) = sender.send(message.clone()).await {
                warn!("Failed to broadcast to user {}: {}", conn.user_id, e);
            }
        }
    }

    /// 检查并清理超时连接
    pub async fn cleanup_timeout_connections(&self, timeout_secs: i64) -> Vec<String> {
        let mut connections = self.connections.write().await;
        let mut removed_users = Vec::new();
        
        let timed_out: Vec<String> = connections
            .iter()
            .filter(|(_, conn)| conn.seconds_since_pong() > timeout_secs)
            .map(|(user_id, _)| user_id.clone())
            .collect();

        for user_id in &timed_out {
            connections.remove(user_id);
            removed_users.push(user_id.clone());
        }

        if !removed_users.is_empty() {
            info!("Cleaned up {} timeout connections", removed_users.len());
        }
        
        removed_users
    }
}

impl Default for WsState {
    fn default() -> Self {
        Self::new()
    }
}

/// WebSocket 查询参数（用于认证）
#[derive(Debug, Deserialize)]
pub struct WsQueryParams {
    pub token: Option<String>,
}

/// 心跳消息
#[derive(Debug, Serialize)]
struct HeartbeatMessage {
    #[serde(rename = "type")]
    msg_type: &'static str,
    timestamp: i64,
}

async fn handle_socket(
    socket: WebSocket,
    state: Arc<WsState>,
    auth_token: Option<String>,
) {
    info!("New WebSocket connection, auth token present: {}", auth_token.is_some());

    let mut user_id: Option<String> = None;
    let (tx, mut rx) = socket.split();
    let tx_shared = Arc::new(RwLock::new(tx));
    
    // 心跳跟踪
    let connection_for_heartbeat = tx_shared.clone();

    // Spawn heartbeat task
    let heartbeat_handle = tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(30));
        loop {
            ticker.tick().await;
            
            let msg = Message::Text(
                json!(HeartbeatMessage {
                    msg_type: "heartbeat",
                    timestamp: chrono::Utc::now().timestamp(),
                }).to_string().into()
            );
            
            let mut sender = connection_for_heartbeat.write().await;
            if sender.send(msg).await.is_err() {
                warn!("Heartbeat failed, connection may be dead");
                break;
            }
        }
    });

    while let Some(msg) = rx.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                info!("Received WebSocket message: {}", text);

                if let Ok(parsed) = serde_json::from_str::<Value>(&text) {
                    let msg_type = parsed.get("type").and_then(|v| v.as_str());
                    let payload = parsed.get("payload");

                    match msg_type {
                        Some("subscribe") => {
                            if let Some(p) = payload {
                                if let Some(id) = p.get("user_id").and_then(|v| v.as_str()) {
                                    user_id = Some(id.to_string());
                                    // Create connection with shared sender
                                    let conn = Arc::new(WsConnection::new(id.to_string(), tx_shared.clone()));
                                    state.add_connection(id.to_string(), conn).await;
                                    info!("User {} subscribed to notifications", id);
                                }
                            }
                        }
                        Some("pong") | Some("heartbeat_response") => {
                            // Update last pong time
                            if let Some(id) = &user_id {
                                if let Some(conn) = state.connections.read().await.get(id) {
                                    conn.update_pong_time();
                                }
                            }
                        }
                        Some("ping") => {
                            {
                                let mut tx = tx_shared.write().await;
                                let _ = tx.send(Message::Text(json!({"type": "pong"}).to_string().into())).await;
                            }
                        }
                        Some("unsubscribe") => {
                            if let Some(id) = &user_id {
                                state.remove_connection(id).await;
                                info!("User {} unsubscribed from notifications", id);
                            }
                        }
                        _ => {
                            info!("Unknown message type: {:?}", msg_type);
                        }
                    }
                }
            }
            Ok(Message::Binary(data)) => {
                info!("Received binary message: {} bytes", data.len());
            }
            Ok(Message::Close(frame)) => {
                info!("WebSocket connection closing: {:?}", frame);
                break;
            }
            Ok(Message::Ping(data)) => {
                {
                    let mut tx = tx_shared.write().await;
                    let _ = tx.send(Message::Pong(data)).await;
                }
            }
            Ok(Message::Pong(_)) => {
                // Pong received, connection is alive
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
        }
    }

    // Cancel heartbeat task
    heartbeat_handle.abort();

    if let Some(id) = &user_id {
        state.remove_connection(id).await;
        info!("User {} disconnected", id);
    }

    info!("WebSocket connection closed");
}

pub async fn websocket_handler(
    State(state): State<Arc<WsState>>,
    Query(params): Query<WsQueryParams>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    info!("WebSocket upgrade requested, token present: {}", params.token.is_some());
    
    ws.on_upgrade(move |socket| {
        handle_socket(socket, state, params.token)
    })
}

/// 通过用户 ID 发送通知
pub async fn broadcast_notification(state: &Arc<WsState>, user_id: &str, notification: Value) {
    let msg = json!({
        "type": "notification",
        "payload": notification
    });

    if state.send_to_user(user_id, Message::Text(msg.to_string().into())).await {
        info!("Notification sent to user {}", user_id);
    } else {
        warn!("Failed to send notification to user {}, may be offline", user_id);
    }
}

/// 更新用户未读计数
pub async fn update_unread_count(state: &Arc<WsState>, user_id: &str, count: i32) {
    let msg = json!({
        "type": "unread_count",
        "payload": count
    });

    if state.send_to_user(user_id, Message::Text(msg.to_string().into())).await {
        info!("Unread count updated for user {}: {}", user_id, count);
    }
}

/// 广播消息给所有在线用户
pub async fn broadcast_to_all(state: &Arc<WsState>, msg_type: &str, payload: Value) {
    let msg = Message::Text(json!({
        "type": msg_type,
        "payload": payload
    }).to_string().into());
    
    state.broadcast(msg).await;
}