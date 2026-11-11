#![allow(dead_code)] // Reserved: WebSocket 通信模块预留扩展，待实时通信接入后启用

use axum::{
    extract::ws::{Message, WebSocket},
    extract::{Path, Query, State, WebSocketUpgrade},
    http::{HeaderMap, StatusCode},
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
use topems_shared_auth::auth::{verify_jwt_token, verify_message_signature, AuthState, Claims};
use topems_shared_auth::service::is_service_claims;
use tracing::{error, info, warn};
use uuid::Uuid;

/// 客户端可订阅的频道白名单（裸名；服务端存储时统一加租户前缀）。
/// 新增频道必须显式加白，禁止透传客户端任意频道名。
pub(crate) const WS_CHANNEL_WHITELIST: &[&str] =
    &["alerts", "notifications", "events", "permissions"];

/// 校验并规范化客户端频道名；非法（空、超长、含分隔符、不在白名单）返回 None。
pub(crate) fn normalize_channel(raw: &str) -> Option<&'static str> {
    if raw.is_empty() || raw.len() > 32 || raw.contains(':') {
        return None;
    }
    WS_CHANNEL_WHITELIST.iter().copied().find(|c| *c == raw)
}

fn tenant_channel_key(tenant: Uuid, channel: &str) -> String {
    format!("{tenant}:{channel}")
}

/// 握手期解析出的连接身份（租户在连接生命周期内不可变）
#[derive(Debug, Clone)]
pub(crate) struct WsIdentity {
    pub tenant: Uuid,
    pub user_id: String,
}

/// 握手期租户解析：唯一合法来源是 JWT claims。
///
/// - 普通用户：`claims.tenant_id` 必须存在、可解析且非 nil，否则拒绝；
/// - 超管：额外要求显式 `?tenant_id=`，不提供"全租户连接"；
/// - service token：拒绝（不应建立面向人的实时连接）。
pub(crate) fn resolve_ws_identity(
    claims: &Claims,
    tenant_param: Option<&str>,
) -> Result<WsIdentity, &'static str> {
    if is_service_claims(claims) {
        return Err("service_not_allowed");
    }
    let param = tenant_param
        .and_then(|v| Uuid::parse_str(v).ok())
        .filter(|t| !t.is_nil());

    if claims.is_superuser {
        let tenant = param.ok_or("tenant_required")?;
        return Ok(WsIdentity {
            tenant,
            user_id: claims.sub.clone(),
        });
    }

    let claim_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|v| Uuid::parse_str(v).ok())
        .filter(|t| !t.is_nil())
        .ok_or("tenant_required")?;

    if let Some(p) = param {
        if p != claim_tenant {
            return Err("tenant_mismatch");
        }
    }

    Ok(WsIdentity {
        tenant: claim_tenant,
        user_id: claims.sub.clone(),
    })
}

/// WebSocket 连接状态
pub(crate) struct WsConnection {
    /// 连接锚定的租户（握手期 JWT 解析，生命周期内不可变）
    tenant: Uuid,
    user_id: String,
    sender: Arc<RwLock<SplitSink<WebSocket, Message>>>,
    connected_at: chrono::DateTime<chrono::Utc>,
    last_pong: std::sync::atomic::AtomicI64,
    /// 用户订阅的频道集合
    channels: RwLock<HashSet<String>>,
    /// 连接唯一标识（契约 §6：每 token 多并发连接，需按 conn 区分）
    conn_id: Uuid,
}

impl WsConnection {
    fn new(
        tenant: Uuid,
        user_id: String,
        sender: Arc<RwLock<SplitSink<WebSocket, Message>>>,
    ) -> Self {
        Self {
            tenant,
            user_id,
            sender,
            connected_at: chrono::Utc::now(),
            last_pong: std::sync::atomic::AtomicI64::new(chrono::Utc::now().timestamp()),
            channels: RwLock::new(HashSet::new()),
            conn_id: Uuid::new_v4(),
        }
    }

    /// 连接在连接表/频道表中的唯一键：`{tenant}:{user_id}`
    fn key(&self) -> String {
        format!("{}:{}", self.tenant, self.user_id)
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

/// 连接映射: `{tenant}:{user_id}` -> [connection]（契约 §6：每 token 最多 6 并发连接）
type ConnectionMap = Arc<RwLock<HashMap<String, Vec<Arc<WsConnection>>>>>;
/// 频道订阅映射: `{tenant}:{channel}` -> [`{tenant}:{user_id}`]
type ChannelMap = Arc<RwLock<HashMap<String, HashSet<String>>>>;
/// 契约 §6：每 token 最大并发连接数
pub const MAX_CONNECTIONS_PER_USER: usize = 6;

pub struct WsState {
    connections: ConnectionMap,
    channels: ChannelMap,
    auth_state: Arc<AuthState>,
}

impl WsState {
    pub fn new(auth_state: Arc<AuthState>) -> Self {
        let connections = Arc::new(RwLock::new(HashMap::new()));
        let channels = Arc::new(RwLock::new(HashMap::new()));
        Self {
            connections,
            channels,
            auth_state,
        }
    }

    pub fn auth_state(&self) -> &Arc<AuthState> {
        &self.auth_state
    }

    /// 添加连接（契约 §6：每 token 最多 6 并发连接，超限拒绝返回 false）
    pub(crate) async fn add_connection(&self, connection: Arc<WsConnection>) -> bool {
        let user_key = connection.key();
        let tenant = connection.tenant;
        let user_id = connection.user_id.clone();
        let list_len = {
            let mut connections = self.connections.write().await;
            let list = connections.entry(user_key.clone()).or_default();
            if list.len() >= MAX_CONNECTIONS_PER_USER {
                warn!(
                    tenant = %tenant,
                    user = %user_id,
                    "User connection limit exceeded (max {}), rejected",
                    MAX_CONNECTIONS_PER_USER
                );
                return false;
            }
            list.push(connection);
            list.len()
        };
        let total = {
            let connections = self.connections.read().await;
            connections.values().map(|v| v.len()).sum::<usize>()
        };
        info!(
            tenant = %tenant,
            user = %user_id,
            "User connected (conn {}/{}), total connections: {}",
            list_len,
            MAX_CONNECTIONS_PER_USER,
            total
        );
        true
    }

    /// 移除指定连接（按 conn_id；该用户无剩余连接时删除键）
    pub(crate) async fn remove_connection(&self, conn: &Arc<WsConnection>) {
        let user_key = conn.key();
        let user_id = conn.user_id.clone();
        let tenant = conn.tenant;
        // 块作用域：提取被移除连接后结束 connections 可变借用
        let removed_conn: Option<Arc<WsConnection>> = {
            let mut connections = self.connections.write().await;
            let mut rc = None;
            if let Some(list) = connections.get_mut(&user_key) {
                if let Some(idx) = list.iter().position(|c| c.conn_id == conn.conn_id) {
                    rc = list.remove(idx).into();
                }
                if list.is_empty() {
                    connections.remove(&user_key);
                }
            }
            rc
        };

        // 清理频道订阅（该连接订阅的频道；全局映射按 user 聚合）
        if let Some(conn) = &removed_conn {
            let subscribed = conn.get_channels().await;
            let mut channels = self.channels.write().await;
            for ch in subscribed {
                if let Some(users) = channels.get_mut(&ch) {
                    users.remove(&user_key);
                    if users.is_empty() {
                        channels.remove(&ch);
                    }
                }
            }
        }

        let total = {
            let connections = self.connections.read().await;
            connections.values().map(|v| v.len()).sum::<usize>()
        };
        info!(
            tenant = %tenant,
            user = %user_id,
            "User disconnected (removed={}), total connections: {}",
            removed_conn.is_some(),
            total
        );
    }

    /// 用户订阅频道（作用于指定连接）。频道名先经白名单校验，存储时统一加租户前缀。
    pub(crate) async fn subscribe_to_channel(&self, conn: &Arc<WsConnection>, channel: &str) {
        let Some(channel) = normalize_channel(channel) else {
            warn!(
                tenant = %conn.tenant,
                user = %conn.user_id,
                raw_channel = %channel,
                "ws subscribe rejected: channel not allowed"
            );
            return;
        };
        let channel_key = tenant_channel_key(conn.tenant, channel);
        conn.subscribe_channel(channel_key.clone()).await;
        let mut channels = self.channels.write().await;
        channels.entry(channel_key).or_default().insert(conn.key());
        info!(
            tenant = %conn.tenant,
            user = %conn.user_id,
            channel,
            "User subscribed to channel"
        );
    }

    /// 用户取消订阅频道（作用于指定连接）
    pub(crate) async fn unsubscribe_from_channel(&self, conn: &Arc<WsConnection>, channel: &str) {
        let Some(channel) = normalize_channel(channel) else {
            return;
        };
        let channel_key = tenant_channel_key(conn.tenant, channel);
        conn.unsubscribe_channel(&channel_key).await;
        let mut channels = self.channels.write().await;
        if let Some(users) = channels.get_mut(&channel_key) {
            users.remove(&conn.key());
            if users.is_empty() {
                channels.remove(&channel_key);
            }
        }
        info!(
            tenant = %conn.tenant,
            user = %conn.user_id,
            channel,
            "User unsubscribed from channel"
        );
    }

    /// 获取频道订阅者（连接键集合；按租户隔离）
    pub async fn get_channel_subscribers(&self, tenant: Uuid, channel: &str) -> HashSet<String> {
        let channels = self.channels.read().await;
        channels
            .get(&tenant_channel_key(tenant, channel))
            .cloned()
            .unwrap_or_default()
    }

    /// 获取总连接数（含多连接）
    pub async fn connection_count(&self) -> usize {
        let connections = self.connections.read().await;
        connections.values().map(|v| v.len()).sum()
    }

    /// 当前在线租户数（用于健康检查，不暴露租户 ID）
    pub async fn tenant_count(&self) -> usize {
        let connections = self.connections.read().await;
        let mut tenants: Vec<Uuid> = connections.values().flatten().map(|c| c.tenant).collect();
        tenants.sort();
        tenants.dedup();
        tenants.len()
    }

    /// 频道槽位数（不含租户前缀，避免 healthz 暴露租户 ID）
    pub async fn channel_count(&self) -> usize {
        self.channels.read().await.len()
    }

    /// 向指定租户的指定用户发送消息（该用户所有连接都发；任一成功返回 true）
    pub async fn send_to_tenant_user(&self, tenant: Uuid, user_id: &str, message: Message) -> bool {
        let key = format!("{tenant}:{user_id}");
        let list = {
            let connections = self.connections.read().await;
            connections.get(&key).cloned()
        };
        let Some(list) = list else {
            return false;
        };
        let mut sent = false;
        for conn in list {
            // 二级兜底：即使键拼错，也不发给其他租户的连接
            if conn.tenant != tenant {
                error!(
                    tenant = %tenant,
                    actual = %conn.tenant,
                    user = %user_id,
                    "ws targeted send refused: tenant mismatch"
                );
                continue;
            }
            let mut sender = conn.sender.write().await;
            if sender.send(message.clone()).await.is_ok() {
                sent = true;
            }
        }
        sent
    }

    /// 向指定频道广播消息（仅本租户订阅者；广播前逐连接二次比对租户）
    pub async fn broadcast_to_tenant_channel(&self, tenant: Uuid, channel: &str, message: Message) {
        let subscribers = self.get_channel_subscribers(tenant, channel).await;
        let mut dropped = 0usize;
        for key in subscribers {
            let list = {
                let connections = self.connections.read().await;
                connections.get(&key).cloned()
            };
            let Some(list) = list else {
                continue;
            };
            for conn in list {
                // 二级兜底：频道 key 正确性之外，再按连接租户比对一次
                if conn.tenant != tenant {
                    dropped += 1;
                    continue;
                }
                let mut sender = conn.sender.write().await;
                if let Err(e) = sender.send(message.clone()).await {
                    warn!(
                        tenant = %tenant,
                        user = %conn.user_id,
                        channel,
                        error = %e,
                        "Failed to send on tenant channel"
                    );
                }
            }
        }
        if dropped > 0 {
            error!(
                tenant = %tenant,
                channel,
                dropped,
                "ws broadcast dropped connections from other tenant"
            );
        }
    }

    /// 定向发送给某个 user_id（该 ID 全局唯一时使用；多租户命中同一 ID 则拒绝发送）
    ///
    /// 仅用于事件本身不含租户字段的历史路径（Portal 通知）。新事件必须走
    /// `send_to_tenant_user` / `broadcast_to_tenant_channel`。
    pub async fn send_to_unique_user(&self, user_id: &str, message: Message) -> bool {
        let mut tenants: Vec<Uuid> = {
            let connections = self.connections.read().await;
            connections
                .values()
                .flatten()
                .filter(|c| c.user_id == user_id)
                .map(|c| c.tenant)
                .collect()
        };
        tenants.sort();
        tenants.dedup();
        match tenants.as_slice() {
            [] => false,
            [tenant] => self.send_to_tenant_user(*tenant, user_id, message).await,
            _ => {
                error!(
                    user = %user_id,
                    "ws targeted send refused: user id resolves to multiple tenants"
                );
                false
            }
        }
    }

    /// 平台级（非租户）事件广播：仅供无租户语义的系统事件使用（菜单/权限元数据）。
    ///
    /// 调用方必须保证 payload 不含任何租户业务数据；租户事件一律走
    /// `broadcast_to_tenant_channel`。
    pub(crate) async fn broadcast_system(&self, message: Message) {
        let connections = self.connections.read().await;
        for list in connections.values() {
            for conn in list {
                let mut sender = conn.sender.write().await;
                if let Err(e) = sender.send(message.clone()).await {
                    warn!(user = %conn.user_id, error = %e, "Failed to broadcast system event");
                }
            }
        }
    }

    /// 检查并清理超时连接（按连接粒度；返回移除的连接数）
    pub async fn cleanup_timeout_connections(&self, timeout_secs: i64) -> usize {
        let mut connections = self.connections.write().await;
        let mut removed = 0usize;
        let mut alive: HashMap<String, Vec<Arc<WsConnection>>> = HashMap::new();
        for (uid, list) in connections.iter() {
            let kept: Vec<Arc<WsConnection>> = list
                .iter()
                .filter(|c| c.seconds_since_pong() <= timeout_secs)
                .cloned()
                .collect();
            removed += list.len() - kept.len();
            if !kept.is_empty() {
                alive.insert(uid.clone(), kept);
            }
        }
        *connections = alive;
        // 同步清理频道表中已不存在的连接键
        {
            let mut channels = self.channels.write().await;
            let alive_keys: HashSet<String> = connections.keys().cloned().collect();
            channels.retain(|_, users| {
                users.retain(|k| alive_keys.contains(k));
                !users.is_empty()
            });
        }

        if removed > 0 {
            info!("Cleaned up {} timeout connections", removed);
        }

        removed
    }
}

/// WebSocket 查询参数（用于认证）
#[derive(Debug, Deserialize)]
pub struct WsQueryParams {
    pub token: Option<String>,
    /// 超管专用：显式指定本次连接锚定的租户（普通用户传入必须与 claims 一致）
    pub tenant_id: Option<String>,
}

async fn handle_socket(
    socket: WebSocket,
    state: Arc<WsState>,
    auth_token: Option<String>,
    tenant_param: Option<String>,
) {
    info!(
        "New WebSocket connection, auth token present: {}",
        auth_token.is_some()
    );

    let (tx, mut rx) = socket.split();
    let tx_shared = Arc::new(RwLock::new(tx));

    // 验证 JWT token 并解析连接身份（租户在握手期锚定，生命周期内不可变）
    let (claims, identity) = match &auth_token {
        Some(token) => match verify_jwt_token(token, &state.auth_state().jwt_secret) {
            Ok(claims) => match resolve_ws_identity(&claims, tenant_param.as_deref()) {
                Ok(identity) => {
                    info!(
                        tenant = %identity.tenant,
                        user = %identity.user_id,
                        "WebSocket authenticated"
                    );
                    (claims, identity)
                }
                Err(code) => {
                    warn!(
                        user = %claims.sub,
                        code,
                        "WebSocket tenant resolution failed, closing"
                    );
                    let mut sender = tx_shared.write().await;
                    let _ = sender
                        .send(Message::Text(
                            json!({
                                "type": "auth_failed",
                                "payload": {
                                    "error": "Tenant required",
                                    "code": code,
                                    "message": "无法确定连接租户，连接被拒绝"
                                }
                            })
                            .to_string()
                            .into(),
                        ))
                        .await;
                    return;
                }
            },
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

    // 创建连接（契约 §6：每 token 最多 6 并发连接，超限拒绝；按 租户+用户 计）
    let new_conn = Arc::new(WsConnection::new(
        identity.tenant,
        identity.user_id.clone(),
        tx_shared.clone(),
    ));
    let conn = if state.add_connection(new_conn.clone()).await {
        new_conn
    } else {
        warn!(
            tenant = %identity.tenant,
            user = %identity.user_id,
            "Connection rejected: exceeds max connections"
        );
        let err = json!({
            "jsonrpc": "2.0",
            "error": { "code": 429, "message": "too many connections" }
        });
        let mut tx = tx_shared.write().await;
        let _ = tx.send(Message::Text(err.to_string().into())).await;
        return;
    };

    // 发送认证成功消息（块作用域：发送后立即释放写锁，否则 guard 在函数末尾才 drop，
    // 主循环各分支与心跳 task 再取写锁将死锁——tokio RwLock 写锁不可重入）
    let auth_success = json!({
        "type": "auth_success",
        "payload": {
            "user_id": identity.user_id.clone(),
            "tenant_id": identity.tenant.to_string(),
            "username": claims.username,
            "role": claims.role,
        }
    });

    {
        let mut tx = tx_shared.write().await;
        let _ = tx
            .send(Message::Text(auth_success.to_string().into()))
            .await;
    }

    let user_id: Option<String> = Some(identity.user_id.clone());

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
                            // 心跳保活：更新当前连接 last_pong
                            conn.update_pong_time();
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
                                    {
                                        // 频道白名单：客户端只能订阅固定频道，租户前缀由服务端拼接
                                        let Some(channel) = normalize_channel(ch) else {
                                            warn!(
                                                tenant = %conn.tenant,
                                                user = %id,
                                                raw_channel = %ch,
                                                "subscribe rejected: channel not allowed"
                                            );
                                            let err = json!({
                                                "jsonrpc": "2.0",
                                                "id": rpc_id,
                                                "error": { "code": 4003, "message": "channel not allowed" }
                                            });
                                            let mut tx = tx_shared.write().await;
                                            let _ = tx
                                                .send(Message::Text(err.to_string().into()))
                                                .await;
                                            continue;
                                        };
                                        // 配额：每连接最多 32 频道（契约 §6，超限 4202）
                                        if conn.get_channels().await.len() >= 32 {
                                            let err = json!({
                                                "jsonrpc": "2.0",
                                                "id": rpc_id,
                                                "error": { "code": 4202, "message": "too many channels" }
                                            });
                                            let mut tx = tx_shared.write().await;
                                            let _ = tx
                                                .send(Message::Text(err.to_string().into()))
                                                .await;
                                            continue;
                                        }
                                        state.subscribe_to_channel(&conn, channel).await;
                                        let resp = json!({
                                            "jsonrpc": "2.0",
                                            "id": rpc_id,
                                            "result": { "status": "subscribed", "channel": channel }
                                        });
                                        let mut tx = tx_shared.write().await;
                                        let _ =
                                            tx.send(Message::Text(resp.to_string().into())).await;
                                        info!("User {} subscribed to channel: {}", id, channel);
                                    }
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
                                (Some(_id), Some(ch)) => {
                                    state.unsubscribe_from_channel(&conn, ch).await;
                                    let resp = json!({
                                        "jsonrpc": "2.0",
                                        "id": rpc_id,
                                        "result": { "status": "unsubscribed", "channel": ch }
                                    });
                                    let mut tx = tx_shared.write().await;
                                    let _ = tx.send(Message::Text(resp.to_string().into())).await;
                                }
                                (Some(id), None) => {
                                    state.remove_connection(&conn).await;
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
        state.remove_connection(&conn).await;
        info!("User {} disconnected", id);
    }

    info!("WebSocket connection closed");
}

/// Origin 白名单校验（契约 §6：生产部署配置 `WS_ALLOWED_ORIGINS`（逗号分隔）后严格校验；
/// 未配置时放行——开发环境默认；配置后无 Origin 请求拒绝 403）
fn origin_allowed(headers: &HeaderMap) -> bool {
    match std::env::var("WS_ALLOWED_ORIGINS") {
        Ok(list) if !list.trim().is_empty() => {
            let list = list
                .split(',')
                .map(|o| o.trim())
                .filter(|o| !o.is_empty())
                .collect::<Vec<_>>();
            if list.is_empty() {
                return true;
            }
            match headers.get(axum::http::header::ORIGIN) {
                Some(origin) => {
                    let origin = origin.to_str().unwrap_or_default();
                    list.iter().any(|o| *o == origin)
                }
                None => false,
            }
        }
        _ => true,
    }
}

pub async fn websocket_handler(
    State(state): State<Arc<WsState>>,
    Query(params): Query<WsQueryParams>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    info!(
        "WebSocket upgrade requested, token present: {}",
        params.token.is_some()
    );

    // 契约 §6：Origin 生产白名单（WS_ALLOWED_ORIGINS 配置后严格校验，未配置放行）
    if !origin_allowed(&headers) {
        warn!("WS upgrade rejected: origin not in whitelist");
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "code": 403,
                "message": "origin not allowed"
            })),
        )
            .into_response();
    }

    // 握手前先解析租户身份：无租户/非法租户/超管缺 tenant_id 一律拒绝升级（403），
    // 前端可据此区分"连不上"与"连上了收不到"。
    if let Some(token) = &params.token {
        match verify_jwt_token(token, &state.auth_state().jwt_secret) {
            Ok(claims) => match resolve_ws_identity(&claims, params.tenant_id.as_deref()) {
                Ok(identity) => {
                    // 契约 §6：每 token 最多 6 并发连接（升级前预检，超限返回 429；
                    // handle_socket 内 add_connection 为权威二次检查）
                    let key = format!("{}:{}", identity.tenant, identity.user_id);
                    let conns = state.connections.read().await;
                    if let Some(list) = conns.get(&key) {
                        if list.len() >= MAX_CONNECTIONS_PER_USER {
                            warn!(
                                tenant = %identity.tenant,
                                user = %identity.user_id,
                                "WS upgrade rejected: connection limit exceeded"
                            );
                            return (
                                StatusCode::TOO_MANY_REQUESTS,
                                Json(json!({
                                    "code": 429,
                                    "message": "too many connections"
                                })),
                            )
                                .into_response();
                        }
                    }
                }
                Err(code) => {
                    warn!(code, "WS upgrade rejected: tenant not resolvable");
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({
                            "code": 4403,
                            "reason": code,
                            "message": "tenant required for websocket connection"
                        })),
                    )
                        .into_response();
                }
            },
            Err(e) => {
                warn!("WS upgrade rejected: invalid token: {}", e);
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "code": 4401,
                        "message": "invalid token"
                    })),
                )
                    .into_response();
            }
        }
    } else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "code": 4401,
                "message": "token required"
            })),
        )
            .into_response();
    }

    ws.on_upgrade(move |socket| handle_socket(socket, state, params.token, params.tenant_id))
}

/// 通过用户 ID 发送通知（契约 P32-6 §3：JSON-RPC 2.0 event 帧）
///
/// 必须带租户：同一 user_id 在不同租户下是不同的人。
pub async fn broadcast_notification(
    state: &Arc<WsState>,
    tenant: Uuid,
    user_id: &str,
    notification: Value,
) {
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
        .send_to_tenant_user(tenant, user_id, Message::Text(msg.to_string().into()))
        .await
    {
        info!(tenant = %tenant, "Notification sent to user {}", user_id);
    } else {
        warn!(
            tenant = %tenant,
            "Failed to send notification to user {}, may be offline",
            user_id
        );
    }
}

/// 向通知频道广播（仅本租户订阅者）
pub async fn broadcast_to_notifications(state: &Arc<WsState>, tenant: Uuid, notification: Value) {
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
        .broadcast_to_tenant_channel(
            tenant,
            "notifications",
            Message::Text(msg.to_string().into()),
        )
        .await;
}

/// 更新用户未读计数（按租户定位用户）
pub async fn update_unread_count(state: &Arc<WsState>, tenant: Uuid, user_id: &str, count: i32) {
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
        .send_to_tenant_user(tenant, user_id, Message::Text(msg.to_string().into()))
        .await
    {
        info!(tenant = %tenant, "Unread count updated for user {}: {}", user_id, count);
    }
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
    // W7 P0：前端统一入口 /ws/core/notifications 与看板类 /ws/bi/* /ws/gis/*
    "core",
    "bi",
    "gis",
];

/// GET /ws/healthz —— 非 Upgrade HTTP 状态端点（规范 §7 自测）
///
/// 不输出频道名/租户 ID：该端点无鉴权，频道键带租户前缀会泄漏租户标识。
pub async fn healthz_handler(State(state): State<Arc<WsState>>) -> impl IntoResponse {
    // 总连接数（含多连接，契约 §6）
    let clients = state.connection_count().await;
    let tenants = state.tenant_count().await;
    let channels = state.channel_count().await;
    Json(json!({
        "ok": true,
        "version": env!("CARGO_PKG_VERSION"),
        "clients": clients,
        "tenants": tenants,
        "channels": channels,
    }))
}

/// GET /ws/{module}/{feature} —— 通用路径（模块白名单校验后复用 handle_socket）
pub async fn websocket_handler_path(
    Path((module, feature)): Path<(String, String)>,
    State(state): State<Arc<WsState>>,
    Query(params): Query<WsQueryParams>,
    headers: HeaderMap,
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

    // 契约 §6：Origin 生产白名单（WS_ALLOWED_ORIGINS 配置后严格校验，未配置放行）
    if !origin_allowed(&headers) {
        warn!(
            "WS upgrade rejected module={}: origin not in whitelist",
            module
        );
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "code": 403,
                "message": "origin not allowed"
            })),
        )
            .into_response();
    }

    // 握手前先解析租户身份（无租户/非法租户/超管缺 tenant_id → 403，前端可见"连不上"）
    if let Some(token) = &params.token {
        match verify_jwt_token(token, &state.auth_state().jwt_secret) {
            Ok(claims) => match resolve_ws_identity(&claims, params.tenant_id.as_deref()) {
                Ok(identity) => {
                    // 契约 §6：每 token 最多 6 并发连接（升级前预检，超限 429；add_connection 权威复查）
                    let key = format!("{}:{}", identity.tenant, identity.user_id);
                    let conns = state.connections.read().await;
                    if let Some(list) = conns.get(&key) {
                        if list.len() >= MAX_CONNECTIONS_PER_USER {
                            warn!(
                                tenant = %identity.tenant,
                                user = %identity.user_id,
                                "WS upgrade rejected: connection limit exceeded"
                            );
                            return (
                                StatusCode::TOO_MANY_REQUESTS,
                                Json(json!({
                                    "code": 429,
                                    "message": "too many connections"
                                })),
                            )
                                .into_response();
                        }
                    }
                }
                Err(code) => {
                    warn!(module, code, "WS upgrade rejected: tenant not resolvable");
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({
                            "code": 4403,
                            "reason": code,
                            "message": "tenant required for websocket connection"
                        })),
                    )
                        .into_response();
                }
            },
            Err(e) => {
                warn!(module, "WS upgrade rejected: invalid token: {}", e);
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "code": 4401,
                        "message": "invalid token"
                    })),
                )
                    .into_response();
            }
        }
    } else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "code": 4401,
                "message": "token required"
            })),
        )
            .into_response();
    }

    ws.on_upgrade(move |socket| handle_socket(socket, state, params.token, params.tenant_id))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state() -> Arc<WsState> {
        let auth_state = Arc::new(AuthState::new(
            "test-secret-0123456789abcdef0123456789abcdef".into(),
            "test-refresh-0123456789abcdef0123456789abcdef".into(),
            1,
        ));
        WsState::new(auth_state).into()
    }

    fn claims(sub: &str, tenant: Option<&str>, is_superuser: bool) -> Claims {
        Claims {
            sub: sub.to_string(),
            username: sub.to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: Vec::new(),
            is_superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant.map(str::to_string),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    const TENANT_A: &str = "11111111-1111-4111-8111-111111111111";
    const TENANT_B: &str = "22222222-2222-4222-8222-222222222222";

    #[test]
    fn channel_whitelist_rejects_unknown_and_injected_names() {
        assert_eq!(normalize_channel("alerts"), Some("alerts"));
        assert_eq!(normalize_channel("notifications"), Some("notifications"));
        assert!(normalize_channel("global").is_none());
        assert!(normalize_channel(&format!("{TENANT_A}:alerts")).is_none());
        assert!(normalize_channel("user:abc").is_none());
        assert!(normalize_channel(&"x".repeat(33)).is_none());
        assert!(normalize_channel("").is_none());
    }

    #[test]
    fn identity_requires_tenant_for_normal_user() {
        assert_eq!(
            resolve_ws_identity(&claims("u1", Some(TENANT_A), false), None)
                .map(|i| i.tenant.to_string()),
            Ok(TENANT_A.to_string())
        );
        assert_eq!(
            resolve_ws_identity(&claims("u1", None, false), None).err(),
            Some("tenant_required")
        );
        assert_eq!(
            resolve_ws_identity(
                &claims("u1", Some("00000000-0000-0000-0000-000000000000"), false),
                None
            )
            .err(),
            Some("tenant_required")
        );
    }

    #[test]
    fn identity_rejects_cross_tenant_param_for_normal_user() {
        assert_eq!(
            resolve_ws_identity(&claims("u1", Some(TENANT_A), false), Some(TENANT_B)).err(),
            Some("tenant_mismatch")
        );
    }

    #[test]
    fn superuser_requires_explicit_tenant() {
        assert_eq!(
            resolve_ws_identity(&claims("admin", None, true), None).err(),
            Some("tenant_required")
        );
        assert_eq!(
            resolve_ws_identity(&claims("admin", None, true), Some(TENANT_B))
                .map(|i| i.tenant.to_string()),
            Ok(TENANT_B.to_string())
        );
        // 不提供"全租户连接"：'*' 不是合法租户
        assert_eq!(
            resolve_ws_identity(&claims("admin", None, true), Some("*")).err(),
            Some("tenant_required")
        );
    }

    #[tokio::test]
    async fn tenant_count_and_channels_start_empty() {
        let state = test_state();
        assert_eq!(state.connection_count().await, 0);
        assert_eq!(state.tenant_count().await, 0);
        assert_eq!(state.channel_count().await, 0);
        assert!(state
            .get_channel_subscribers(Uuid::nil(), "alerts")
            .await
            .is_empty());
    }
}
