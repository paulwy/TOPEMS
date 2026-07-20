use axum::{
    extract::ws::{Message, WebSocket},
    extract::{Query, State, WebSocketUpgrade},
    response::IntoResponse,
};
use futures_util::{stream::SplitSink, SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::interval;
use tracing::{error, info, warn};

/// WebSocket 连接状态
pub(crate) struct WsConnection {
    user_id: String,
    sender: Arc<RwLock<SplitSink<WebSocket, Message>>>,
    connected_at: chrono::DateTime<chrono::Utc>,
    last_pong: std::sync::atomic::AtomicI64,
    /// 用户订阅的频道集合
    channels: RwLock<HashSet<String>>,
}

impl WsConnection {
    fn new(user_id: String, sender: Arc<RwLock<SplitSink<WebSocket, Message>>>) -> Self {
        Self {
            user_id,
            sender,
            connected_at: chrono::Utc::now(),
            last_pong: std::sync::atomic::AtomicI64::new(chrono::Utc::now().timestamp()),
            channels: RwLock::new(HashSet::new()),
        }
    }

    fn update_pong_time(&self) {
        self.last_pong.store(
            chrono::Utc::now().timestamp(),
            std::sync::atomic::Ordering::Relaxed,
        );
    }

    fn seconds_since_pong(&self) -> i64 {
        chrono::Utc::now().timestamp() - self.last_pong.load(std::sync::atomic::Ordering::Relaxed)
    }

    /// 订阅频道
    async fn subscribe_channel(&self, channel: String) {
        let mut channels = self.channels.write().await;
        channels.insert(channel);
    }

    /// 取消订阅频道
    async fn unsubscribe_channel(&self, channel: &str) {
        let mut channels = self.channels.write().await;
        channels.remove(channel);
    }

    /// 检查是否订阅了指定频道
    async fn is_subscribed(&self, channel: &str) -> bool {
        let channels = self.channels.read().await;
        channels.contains(channel)
    }

    /// 获取所有订阅的频道
    async fn get_channels(&self) -> HashSet<String> {
        let channels = self.channels.read().await;
        channels.clone()
    }
}

type ConnectionMap = Arc<RwLock<HashMap<String, Arc<WsConnection>>>>;
/// 频道订阅映射: channel -> [user_id]
type ChannelMap = Arc<RwLock<HashMap<String, HashSet<String>>>>;

pub struct WsState {
    connections: ConnectionMap,
    channels: ChannelMap,
}

impl WsState {
    pub fn new() -> Self {
        let connections = Arc::new(RwLock::new(HashMap::new()));
        let channels = Arc::new(RwLock::new(HashMap::new()));
        Self {
            connections,
            channels,
        }
    }

    /// 添加连接
    pub(crate) async fn add_connection(&self, user_id: String, connection: Arc<WsConnection>) {
        let mut connections = self.connections.write().await;
        connections.remove(&user_id);
        connections.insert(user_id.clone(), connection);
        info!(
            "User {} connected, total connections: {}",
            user_id,
            connections.len()
        );
    }

    /// 移除连接
    pub async fn remove_connection(&self, user_id: &str) {
        let mut connections = self.connections.write().await;
        if let Some(conn) = connections.get(user_id) {
            // 清理频道订阅
            let subscribed = conn.get_channels().await;
            let mut channels = self.channels.write().await;
            for ch in subscribed {
                if let Some(users) = channels.get_mut(&ch) {
                    users.remove(user_id);
                    if users.is_empty() {
                        channels.remove(&ch);
                    }
                }
            }
        }
        connections.remove(user_id);
        info!(
            "User {} disconnected, total connections: {}",
            user_id,
            connections.len()
        );
    }

    /// 用户订阅频道
    pub async fn subscribe_to_channel(&self, user_id: &str, channel: String) {
        // 更新连接层面的频道集合
        if let Some(conn) = self.connections.read().await.get(user_id) {
            conn.subscribe_channel(channel.clone()).await;
        }
        // 更新全局频道映射
        let mut channels = self.channels.write().await;
        channels
            .entry(channel.clone())
            .or_default()
            .insert(user_id.to_string());
        info!("User {} subscribed to channel: {}", user_id, channel);
    }

    /// 用户取消订阅频道
    pub async fn unsubscribe_from_channel(&self, user_id: &str, channel: &str) {
        if let Some(conn) = self.connections.read().await.get(user_id) {
            conn.unsubscribe_channel(channel).await;
        }
        let mut channels = self.channels.write().await;
        if let Some(users) = channels.get_mut(channel) {
            users.remove(user_id);
            if users.is_empty() {
                channels.remove(channel);
            }
        }
        info!("User {} unsubscribed from channel: {}", user_id, channel);
    }

    /// 获取频道订阅者
    pub async fn get_channel_subscribers(&self, channel: &str) -> HashSet<String> {
        let channels = self.channels.read().await;
        channels.get(channel).cloned().unwrap_or_default()
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

    /// 向指定频道广播消息
    pub async fn broadcast_to_channel(&self, channel: &str, message: Message) {
        let subscribers = self.get_channel_subscribers(channel).await;
        let connections = self.connections.read().await;
        for user_id in subscribers {
            if let Some(conn) = connections.get(&user_id) {
                let mut sender = conn.sender.write().await;
                if let Err(e) = sender.send(message.clone()).await {
                    warn!(
                        "Failed to send to user {} on channel {}: {}",
                        user_id, channel, e
                    );
                }
            }
        }
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

async fn handle_socket(socket: WebSocket, state: Arc<WsState>, auth_token: Option<String>) {
    info!(
        "New WebSocket connection, auth token present: {}",
        auth_token.is_some()
    );

    let mut user_id: Option<String> = None;
    let (tx, mut rx) = socket.split();
    let tx_shared = Arc::new(RwLock::new(tx));

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
                })
                .to_string()
                .into(),
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
                                let channel = p.get("channel").and_then(|v| v.as_str());
                                let uid = p.get("user_id").and_then(|v| v.as_str());

                                if let Some(id) = uid {
                                    user_id = Some(id.to_string());
                                    let conn = Arc::new(WsConnection::new(
                                        id.to_string(),
                                        tx_shared.clone(),
                                    ));
                                    state.add_connection(id.to_string(), conn).await;

                                    // 订阅指定频道
                                    if let Some(ch) = channel {
                                        state.subscribe_to_channel(id, ch.to_string()).await;
                                    }

                                    // 发送确认消息
                                    let confirm = json!({
                                        "type": "subscribed",
                                        "payload": {
                                            "channel": channel.unwrap_or("default"),
                                            "user_id": id
                                        }
                                    });
                                    let mut tx = tx_shared.write().await;
                                    let _ =
                                        tx.send(Message::Text(confirm.to_string().into())).await;
                                    info!("User {} subscribed to channel: {:?}", id, channel);
                                }
                            }
                        }
                        Some("pong") | Some("heartbeat_response") => {
                            if let Some(id) = &user_id {
                                if let Some(conn) = state.connections.read().await.get(id) {
                                    conn.update_pong_time();
                                }
                            }
                        }
                        Some("ping") => {
                            let mut tx = tx_shared.write().await;
                            let _ = tx
                                .send(Message::Text(json!({"type": "pong"}).to_string().into()))
                                .await;
                        }
                        Some("unsubscribe") => {
                            if let Some(p) = payload {
                                if let Some(ch) = p.get("channel").and_then(|v| v.as_str()) {
                                    if let Some(id) = &user_id {
                                        state.unsubscribe_from_channel(id, ch).await;
                                    }
                                } else if let Some(id) = &user_id {
                                    state.remove_connection(id).await;
                                    info!("User {} unsubscribed from all channels", id);
                                }
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
                let mut tx = tx_shared.write().await;
                let _ = tx.send(Message::Pong(data)).await;
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
    info!(
        "WebSocket upgrade requested, token present: {}",
        params.token.is_some()
    );

    ws.on_upgrade(move |socket| handle_socket(socket, state, params.token))
}

/// 通过用户 ID 发送通知
pub async fn broadcast_notification(state: &Arc<WsState>, user_id: &str, notification: Value) {
    let msg = json!({
        "type": "notification",
        "payload": notification
    });

    if state
        .send_to_user(user_id, Message::Text(msg.to_string().into()))
        .await
    {
        info!("Notification sent to user {}", user_id);
    } else {
        warn!(
            "Failed to send notification to user {}, may be offline",
            user_id
        );
    }
}

/// 向通知频道广播
pub async fn broadcast_to_notifications(state: &Arc<WsState>, notification: Value) {
    let msg = json!({
        "type": "notification",
        "payload": notification
    });
    state
        .broadcast_to_channel("notifications", Message::Text(msg.to_string().into()))
        .await;
}

/// 更新用户未读计数
pub async fn update_unread_count(state: &Arc<WsState>, user_id: &str, count: i32) {
    let msg = json!({
        "type": "unread_count",
        "payload": { "count": count }
    });

    if state
        .send_to_user(user_id, Message::Text(msg.to_string().into()))
        .await
    {
        info!("Unread count updated for user {}: {}", user_id, count);
    }
}

/// 广播消息给所有在线用户
pub async fn broadcast_to_all(state: &Arc<WsState>, msg_type: &str, payload: Value) {
    let msg = Message::Text(
        json!({
            "type": msg_type,
            "payload": payload
        })
        .to_string()
        .into(),
    );

    state.broadcast(msg).await;
}
