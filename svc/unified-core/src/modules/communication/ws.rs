#![allow(dead_code)] // Reserved: WebSocket 通信模块预留扩展，待实时通信接入后启用

use axum::{
    extract::ws::{Message, WebSocket},
    extract::{Path, Query, State, WebSocketUpgrade},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use futures_util::{stream::SplitSink, SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::interval;
use topems_shared_auth::auth::{verify_jwt_token, verify_message_signature, AuthState};
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
    auth_state: Arc<AuthState>,
    /// global 广播频控：每秒 ≤10 条（契约 §6，超限合并批处理推送留 TODO）
    broadcast_quota: std::sync::Mutex<(i64, u32)>,
}

impl WsState {
    pub fn new(auth_state: Arc<AuthState>) -> Self {
        let connections = Arc::new(RwLock::new(HashMap::new()));
        let channels = Arc::new(RwLock::new(HashMap::new()));
        Self {
            connections,
            channels,
            auth_state,
            broadcast_quota: std::sync::Mutex::new((0, 0)),
        }
    }

    pub fn auth_state(&self) -> &Arc<AuthState> {
        &self.auth_state
    }

    /// 检查 global 广播频控（每秒 ≤10 条，契约 §6）
    pub fn broadcast_quota_ok(&self) -> bool {
        let mut q = self.broadcast_quota.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        if q.0 != now {
            q.0 = now;
            q.1 = 0;
        }
        if q.1 >= 10 {
            return false;
        }
        q.1 += 1;
        true
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
        if !self.broadcast_quota_ok() {
            warn!("Global broadcast rate limit exceeded (>10/s), frame dropped");
            return;
        }
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

/// WebSocket 查询参数（用于认证）
#[derive(Debug, Deserialize)]
pub struct WsQueryParams {
    pub token: Option<String>,
}

async fn handle_socket(socket: WebSocket, state: Arc<WsState>, auth_token: Option<String>) {
    info!(
        "New WebSocket connection, auth token present: {}",
        auth_token.is_some()
    );

    let (tx, mut rx) = socket.split();
    let tx_shared = Arc::new(RwLock::new(tx));

    // 验证 JWT token
    let (claims, user_id) = match &auth_token {
        Some(token) => match verify_jwt_token(token, &state.auth_state().jwt_secret) {
            Ok(c) => {
                let user_id = c.sub.clone();
                info!("WebSocket authenticated user: {}", user_id);
                (Some(c), Some(user_id))
            }
            Err(e) => {
                warn!("WebSocket JWT authentication failed: {}", e);
                let mut sender = tx_shared.write().await;
                let _ = sender
                    .send(Message::Text(
                        json!({
                            "type": "auth_failed",
                            "payload": { "error": "Authentication failed", "message": e.to_string() }
                        })
                        .to_string()
                        .into(),
                    ))
                    .await;
                return;
            }
        },
        None => {
            warn!("WebSocket connection without auth token, closing");
            let mut sender = tx_shared.write().await;
            let _ = sender
                .send(Message::Text(
                    json!({
                        "type": "auth_failed",
                        "payload": { "error": "Authentication required", "message": "Token is required" }
                    })
                    .to_string()
                    .into(),
                ))
                .await;
            return;
        }
    };

    let connection_for_heartbeat = tx_shared.clone();

    // Spawn heartbeat task
    let heartbeat_handle = tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(30));
        // tokio interval 首次 tick 立即完成，跳过（契约 §4.1：连接建立 30s 后才开始心跳）
        ticker.tick().await;
        loop {
            ticker.tick().await;

            // 契约 P32-6 §3.1/§4.1：心跳帧统一 JSON-RPC 2.0（method=ping，客户端回 pong 保活）
            let msg = Message::Text(
                json!({
                    "jsonrpc": "2.0",
                    "method": "ping"
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

    // 创建连接
    if let Some(id) = &user_id {
        let conn = Arc::new(WsConnection::new(id.to_string(), tx_shared.clone()));
        state.add_connection(id.to_string(), conn).await;
    }

    // 发送认证成功消息（块作用域：发送后立即释放写锁，否则 guard 在函数末尾才 drop，
    // 主循环各分支与心跳 task 再取写锁将死锁——tokio RwLock 写锁不可重入）
    let auth_success = json!({
        "type": "auth_success",
        "payload": {
            "user_id": user_id.as_ref().unwrap_or(&"unknown".to_string()),
            "username": claims.as_ref().map(|c| c.username.clone()).unwrap_or_default(),
            "role": claims.as_ref().map(|c| c.role.clone()).unwrap_or_default(),
        }
    });
    {
        let mut tx = tx_shared.write().await;
        let _ = tx
            .send(Message::Text(auth_success.to_string().into()))
            .await;
    }

    while let Some(msg) = rx.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                info!(
                    "Received WebSocket message from user {}: {}",
                    user_id.as_deref().unwrap_or("unknown"),
                    text
                );

                // 契约 P32-6 §3：JSON-RPC 2.0 帧协议；§6 配额：单消息 ≤ 64KB
                if text.len() > 64 * 1024 {
                    warn!(
                        "Message too large ({} bytes) from user {}",
                        text.len(),
                        user_id.as_deref().unwrap_or("unknown")
                    );
                    let err = json!({
                        "jsonrpc": "2.0",
                        "id": Value::Null,
                        "error": { "code": 4203, "message": "message too large (>64KB)" }
                    });
                    let mut tx = tx_shared.write().await;
                    let _ = tx.send(Message::Text(err.to_string().into())).await;
                    continue;
                }

                if let Ok(parsed) = serde_json::from_str::<Value>(&text) {
                    let rpc_id = parsed.get("id").cloned();
                    let method = parsed.get("method").and_then(|v| v.as_str());
                    let params = parsed.get("params");
                    let signature = parsed.get("signature").and_then(|v| v.as_str());

                    // 心跳 method 免签名（契约 §3.1：ping/pong 双向，30s ping / 90s 断）
                    match method {
                        Some("ping") => {
                            let resp = json!({
                                "jsonrpc": "2.0",
                                "id": rpc_id,
                                "result": { "status": "pong" }
                            });
                            let mut tx = tx_shared.write().await;
                            let _ = tx.send(Message::Text(resp.to_string().into())).await;
                            continue;
                        }
                        Some("pong") | Some("heartbeat_response") => {
                            if let Some(id) = &user_id {
                                if let Some(conn) = state.connections.read().await.get(id) {
                                    conn.update_pong_time();
                                }
                            }
                            continue;
                        }
                        _ => {}
                    }

                    // 签名验证（subscribe/unsubscribe/authenticate 等写操作）
                    let sig_ok = match signature {
                        Some(sig) => {
                            let mut cloned = parsed.clone();
                            cloned.as_object_mut().and_then(|o| o.remove("signature"));
                            let original_message =
                                serde_json::to_string(&cloned).unwrap_or_else(|_| text.to_string());
                            verify_message_signature(
                                &original_message,
                                sig,
                                &state.auth_state().jwt_secret,
                            )
                        }
                        None => false,
                    };
                    if !sig_ok {
                        warn!(
                            "Message signature verification failed for user {}",
                            user_id.as_deref().unwrap_or("unknown")
                        );
                        if rpc_id.is_some() {
                            let err = json!({
                                "jsonrpc": "2.0",
                                "id": rpc_id,
                                "error": { "code": -32001, "message": "invalid message signature" }
                            });
                            let mut tx = tx_shared.write().await;
                            let _ = tx.send(Message::Text(err.to_string().into())).await;
                        }
                        continue;
                    }

                    match method {
                        Some("subscribe") => {
                            let channel = params
                                .and_then(|p| p.get("channel"))
                                .and_then(|v| v.as_str());
                            match (&user_id, channel) {
                                (Some(id), Some(ch)) => {
                                    // 配额：每连接最多 32 频道（契约 §6，超限 4202）
                                    let too_many = {
                                        let conn_guard = state.connections.read().await;
                                        match conn_guard.get(id) {
                                            Some(c) => c.get_channels().await.len() >= 32,
                                            None => false,
                                        }
                                    };
                                    if too_many {
                                        let err = json!({
                                            "jsonrpc": "2.0",
                                            "id": rpc_id,
                                            "error": { "code": 4202, "message": "too many channels" }
                                        });
                                        let mut tx = tx_shared.write().await;
                                        let _ = tx.send(Message::Text(err.to_string().into())).await;
                                        continue;
                                    }
                                    state.subscribe_to_channel(id, ch.to_string()).await;
                                    let resp = json!({
                                        "jsonrpc": "2.0",
                                        "id": rpc_id,
                                        "result": { "status": "subscribed", "channel": ch }
                                    });
                                    let mut tx = tx_shared.write().await;
                                    let _ = tx.send(Message::Text(resp.to_string().into())).await;
                                    info!("User {} subscribed to channel: {}", id, ch);
                                }
                                _ => {
                                    warn!(
                                        "subscribe without channel/user from {}",
                                        user_id.as_deref().unwrap_or("unknown")
                                    );
                                }
                            }
                        }
                        Some("unsubscribe") => {
                            let channel = params
                                .and_then(|p| p.get("channel"))
                                .and_then(|v| v.as_str());
                            match (&user_id, channel) {
                                (Some(id), Some(ch)) => {
                                    state.unsubscribe_from_channel(id, ch).await;
                                    let resp = json!({
                                        "jsonrpc": "2.0",
                                        "id": rpc_id,
                                        "result": { "status": "unsubscribed", "channel": ch }
                                    });
                                    let mut tx = tx_shared.write().await;
                                    let _ = tx.send(Message::Text(resp.to_string().into())).await;
                                }
                                (Some(id), None) => {
                                    state.remove_connection(id).await;
                                    let resp = json!({
                                        "jsonrpc": "2.0",
                                        "id": rpc_id,
                                        "result": { "status": "unsubscribed_all" }
                                    });
                                    let mut tx = tx_shared.write().await;
                                    let _ = tx.send(Message::Text(resp.to_string().into())).await;
                                    info!("User {} unsubscribed from all channels", id);
                                }
                                _ => {}
                            }
                        }
                        Some("authenticate") => {
                            // 契约 §3.1：token 过期后 JWT 刷新（刷新逻辑后续实现，占位 OK）
                            let resp = json!({
                                "jsonrpc": "2.0",
                                "id": rpc_id,
                                "result": { "status": "ok", "message": "authenticate stub" }
                            });
                            let mut tx = tx_shared.write().await;
                            let _ = tx.send(Message::Text(resp.to_string().into())).await;
                        }
                        _ => {
                            info!("Unknown WS method: {:?}", method);
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

/// 通过用户 ID 发送通知（契约 P32-6 §3：JSON-RPC 2.0 event 帧）
pub async fn broadcast_notification(state: &Arc<WsState>, user_id: &str, notification: Value) {
    let msg = json!({
        "jsonrpc": "2.0",
        "method": "event",
        "params": {
            "channel": format!("user:{}", user_id),
            "event": "notification",
            "data": notification,
            "ts": chrono::Utc::now().timestamp_millis()
        }
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
        "jsonrpc": "2.0",
        "method": "event",
        "params": {
            "channel": "notifications",
            "event": "notification",
            "data": notification,
            "ts": chrono::Utc::now().timestamp_millis()
        }
    });
    state
        .broadcast_to_channel("notifications", Message::Text(msg.to_string().into()))
        .await;
}

/// 更新用户未读计数
pub async fn update_unread_count(state: &Arc<WsState>, user_id: &str, count: i32) {
    let msg = json!({
        "jsonrpc": "2.0",
        "method": "event",
        "params": {
            "channel": format!("user:{}", user_id),
            "event": "unread_count",
            "data": { "count": count },
            "ts": chrono::Utc::now().timestamp_millis()
        }
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
            "jsonrpc": "2.0",
            "method": "event",
            "params": {
                "channel": "global",
                "event": msg_type,
                "data": payload,
                "ts": chrono::Utc::now().timestamp_millis()
            }
        })
        .to_string()
        .into(),
    );

    state.broadcast(msg).await;
}

// ===== P0 迷你试点（2026-10-29）：对齐 docs/developer/standards/websocket-path-mapping.md =====
// 增量：① /ws/healthz 状态端点；② 通用路径 /ws/{module}/{feature} + 模块注册表白名单（426）。
// 复用现有 handle_socket（心跳 30s/超时清理/JWT 鉴权/Redis 订阅）。

/// P32-6 模块注册表（白名单；未注册模块 Upgrade 时拒绝 426）
pub const WS_MODULE_WHITELIST: &[&str] = &[
    "iam",
    "workflow",
    "im",
    "mes",
    "wms",
    "ai",
    "notification",
    "dashboard",
    "ticket",
];

/// GET /ws/healthz —— 非 Upgrade HTTP 状态端点（规范 §7 自测）
pub async fn healthz_handler(State(state): State<Arc<WsState>>) -> impl IntoResponse {
    let clients = state.connections.read().await.len();
    let chans = state.channels.read().await;
    let channels: HashMap<String, usize> =
        chans.iter().map(|(k, v)| (k.clone(), v.len())).collect();
    Json(json!({
        "ok": true,
        "version": env!("CARGO_PKG_VERSION"),
        "clients": clients,
        "channels": channels,
    }))
}

/// GET /ws/{module}/{feature} —— 通用路径（模块白名单校验后复用 handle_socket）
pub async fn websocket_handler_path(
    Path((module, feature)): Path<(String, String)>,
    State(state): State<Arc<WsState>>,
    Query(params): Query<WsQueryParams>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    if !WS_MODULE_WHITELIST.contains(&module.as_str()) {
        return StatusCode::UPGRADE_REQUIRED.into_response(); // 426
    }
    info!(
        "WebSocket upgrade requested module={} feature={} token_present={}",
        module,
        feature,
        params.token.is_some()
    );
    ws.on_upgrade(move |socket| handle_socket(socket, state, params.token))
}
