use axum::{
    extract::FromRef,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio::time::{timeout, Duration};
use topems_shared_auth::auth::{verify_jwt_token, AuthState, Claims};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

type ConnectionId = Uuid;

/// 连接建立时解析一次的租户作用域上下文：长连接循环内不再从 claims 重新推导，
/// 避免连接生命周期内租户上下文漂移或跨连接串用。
#[derive(Debug, Clone, Copy)]
enum WsTenantScope {
    /// 超管：系统通道（跨租户只读）。
    System,
    /// 普通用户：固定租户；解析失败取 nil，由作用域入口 fail-closed 拒绝。
    Tenant(Uuid),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WebSocketMessage {
    #[serde(rename = "subscribe")]
    Subscribe { device_codes: Vec<String> },

    #[serde(rename = "unsubscribe")]
    Unsubscribe { device_codes: Vec<String> },

    #[serde(rename = "location_update")]
    LocationUpdate {
        device_code: String,
        device_name: String,
        position: serde_json::Value,
        timestamp: String,
        status: String,
    },

    #[serde(rename = "ping")]
    Ping,

    #[serde(rename = "pong")]
    Pong,

    #[serde(rename = "error")]
    Error { message: String },

    #[serde(rename = "connection_limit_exceeded")]
    ConnectionLimitExceeded { max_connections: usize },
}

/// WebSocket 连接 query 参数：`?token=<JWT>`（与 mes/communication WS 模式一致）
#[derive(Debug, Deserialize)]
pub struct WsQueryParams {
    pub token: Option<String>,
}

pub struct WebSocketConfig {
    pub max_connections: usize,
    pub idle_timeout_secs: u64,
    pub max_frame_size: usize,
    pub max_message_size: usize,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            max_connections: 1000,
            idle_timeout_secs: 120,
            max_frame_size: 4 * 1024 * 1024,
            max_message_size: 4 * 1024 * 1024,
        }
    }
}

impl WebSocketConfig {
    pub fn from_env() -> Self {
        Self {
            max_connections: env::var("WS_MAX_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(1000),
            idle_timeout_secs: env::var("WS_IDLE_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(120),
            max_frame_size: env::var("WS_MAX_FRAME_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(4 * 1024 * 1024),
            max_message_size: env::var("WS_MAX_MESSAGE_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(4 * 1024 * 1024),
        }
    }
}

pub type SharedWebSocketManager = Arc<WebSocketManager>;

pub struct WebSocketManager {
    connections: RwLock<HashMap<ConnectionId, mpsc::Sender<WebSocketMessage>>>,
    subscriptions: RwLock<HashMap<String, HashSet<ConnectionId>>>,
    config: WebSocketConfig,
}

impl WebSocketManager {
    pub fn new(config: WebSocketConfig) -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
            subscriptions: RwLock::new(HashMap::new()),
            config,
        }
    }

    #[allow(clippy::result_unit_err)] // 内部连接注册表：仅表达"已满/成功"，无外部错误契约
    pub async fn register_connection(
        &self,
        conn_id: ConnectionId,
        sender: mpsc::Sender<WebSocketMessage>,
    ) -> Result<(), ()> {
        let mut conns = self.connections.write().await;
        if conns.len() >= self.config.max_connections {
            return Err(());
        }
        conns.insert(conn_id, sender);
        Ok(())
    }

    pub async fn unregister_connection(&self, conn_id: ConnectionId) {
        self.connections.write().await.remove(&conn_id);

        let mut subs = self.subscriptions.write().await;
        subs.retain(|_, conns| {
            conns.remove(&conn_id);
            !conns.is_empty()
        });
    }

    pub async fn subscribe(&self, conn_id: ConnectionId, device_codes: Vec<String>) {
        let mut subs = self.subscriptions.write().await;
        for device_code in device_codes {
            subs.entry(device_code)
                .or_insert_with(HashSet::new)
                .insert(conn_id);
        }
    }

    pub async fn unsubscribe(&self, conn_id: ConnectionId, device_codes: Vec<String>) {
        let mut subs = self.subscriptions.write().await;
        for device_code in device_codes {
            if let Some(conns) = subs.get_mut(&device_code) {
                conns.remove(&conn_id);
                if conns.is_empty() {
                    subs.remove(&device_code);
                }
            }
        }
    }

    pub async fn broadcast_location_update(&self, message: WebSocketMessage) {
        if let WebSocketMessage::LocationUpdate { device_code, .. } = &message {
            let subs = self.subscriptions.read().await;
            if let Some(conn_ids) = subs.get(device_code) {
                let connections = self.connections.read().await;
                for conn_id in conn_ids {
                    if let Some(sender) = connections.get(conn_id) {
                        let _ = sender.send(message.clone()).await;
                    }
                }
            }
        }
    }

    pub fn get_connection_count(&self) -> usize {
        self.connections.blocking_read().len()
    }

    pub fn get_config(&self) -> &WebSocketConfig {
        &self.config
    }
}

/// 向指定连接发送 `error` 消息（内部注册表访问，与 Ping→Pong 同一通道）。
async fn send_ws_error(ws_manager: &WebSocketManager, conn_id: ConnectionId, message: String) {
    if let Some(sender) = ws_manager.connections.read().await.get(&conn_id) {
        let _ = sender.send(WebSocketMessage::Error { message }).await;
    }
}

use std::env;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:websocket:read"])),
    path = "/ws/gis",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "websocket"
)]
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(ws_manager): State<SharedWebSocketManager>,
    State(auth_state): State<AuthState>,
    State(db): State<Db>,
    Query(params): Query<WsQueryParams>,
) -> impl IntoResponse {
    let config = ws_manager.get_config();
    let jwt_secret = auth_state.jwt_secret;
    let token = params.token;
    ws.max_frame_size(config.max_frame_size)
        .max_message_size(config.max_message_size)
        .on_upgrade(move |socket| handle_socket(socket, ws_manager, jwt_secret, token, db))
}

async fn handle_socket(
    socket: WebSocket,
    ws_manager: SharedWebSocketManager,
    jwt_secret: String,
    token: Option<String>,
    db: Db,
) {
    let conn_id = Uuid::new_v4();
    let (tx, mut rx) = mpsc::channel(100);

    if ws_manager.register_connection(conn_id, tx).await.is_err() {
        return;
    }

    // P1-21：WS 消息层强制鉴权（握手保持 public，与 mes/communication WS 的 ?token= 模式一致）。
    // 未认证 / token 无效的连接仅允许 Ping/Pong/Close；Subscribe/Unsubscribe 一律拒绝。
    let claims: Option<Claims> = token.and_then(|tok| verify_jwt_token(&tok, &jwt_secret).ok());

    // 连接建立即固化租户作用域上下文；订阅循环只按此上下文打开 stream 读作用域。
    let ws_tenant_scope: Option<WsTenantScope> = claims.as_ref().map(|c| {
        if c.is_superuser {
            WsTenantScope::System
        } else {
            WsTenantScope::Tenant(
                c.tenant_id
                    .as_deref()
                    .and_then(|t| Uuid::parse_str(t).ok())
                    .unwrap_or_else(Uuid::nil),
            )
        }
    });

    let (sender, receiver) = socket.split();
    let idle_timeout = ws_manager.get_config().idle_timeout_secs;

    let send_task = tokio::spawn(async move {
        let mut sender = sender;
        while let Some(msg) = rx.recv().await {
            if let Ok(json_str) = serde_json::to_string(&msg) {
                let _ = sender.send(Message::Text(json_str.into())).await;
            }
        }
    });

    let ws_manager_clone = ws_manager.clone();
    let conn_id_clone = conn_id;

    let recv_task = tokio::spawn(async move {
        let mut receiver = receiver;
        let timeout_duration = Duration::from_secs(idle_timeout);

        loop {
            match timeout(timeout_duration, receiver.next()).await {
                Ok(Some(Ok(msg))) => match msg {
                    Message::Text(text) => {
                        if let Ok(message) = serde_json::from_str::<WebSocketMessage>(&text) {
                            match message {
                                WebSocketMessage::Subscribe { device_codes } => {
                                    // P1-21：订阅前强制认证；已认证连接仅可订阅本租户设备
                                    match &claims {
                                        None => {
                                            send_ws_error(
                                                &ws_manager_clone,
                                                conn_id_clone,
                                                "未认证连接：拒绝订阅".to_string(),
                                            )
                                            .await;
                                        }
                                        Some(_claims) => {
                                            // 连接建立时已固化租户上下文（ws_tenant_scope）：
                                            // 循环内只按该上下文打开 stream 读作用域，不再从 claims 推导。
                                            let scope_res = match ws_tenant_scope {
                                                Some(WsTenantScope::System) => {
                                                    db.scope_read_system().await
                                                }
                                                Some(WsTenantScope::Tenant(tenant)) => {
                                                    db.scope_read_for_tenant_stream(tenant).await
                                                }
                                                None => unreachable!(
                                                    "claims 存在时租户上下文必然已在连接建立时解析"
                                                ),
                                            };
                                            let allowed: Vec<String> = match scope_res {
                                                Ok(mut scope) => {
                                                    let rows = sqlx::query_scalar(
                                                        only_own_schema_query!(
                                                            "gis",
                                                            "SELECT device_code FROM gis.devices WHERE deleted_at IS NULL AND device_code = ANY($1)"
                                                        ),
                                                    )
                                                    .bind(&device_codes)
                                                    .fetch_all(&mut scope)
                                                    .await
                                                    .unwrap_or_default();
                                                    let _ = scope.commit().await;
                                                    rows
                                                }
                                                Err(_) => Vec::new(),
                                            };
                                            let rejected: Vec<&str> = device_codes
                                                .iter()
                                                .filter(|c| !allowed.contains(c))
                                                .map(|c| c.as_str())
                                                .collect();
                                            if !rejected.is_empty() {
                                                send_ws_error(
                                                    &ws_manager_clone,
                                                    conn_id_clone,
                                                    format!(
                                                        "设备码无权订阅或不存在: {}",
                                                        rejected.join(",")
                                                    ),
                                                )
                                                .await;
                                            }
                                            if !allowed.is_empty() {
                                                ws_manager_clone
                                                    .subscribe(conn_id_clone, allowed)
                                                    .await;
                                            }
                                        }
                                    }
                                }
                                WebSocketMessage::Unsubscribe { device_codes } => {
                                    // 未认证连接无订阅可退，静默忽略
                                    if claims.is_some() {
                                        ws_manager_clone
                                            .unsubscribe(conn_id_clone, device_codes)
                                            .await;
                                    }
                                }
                                WebSocketMessage::Ping => {
                                    if let Some(sender) = ws_manager_clone
                                        .connections
                                        .read()
                                        .await
                                        .get(&conn_id_clone)
                                    {
                                        let _ = sender.send(WebSocketMessage::Pong).await;
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    Message::Binary(_) => {}
                    Message::Close(_) => break,
                    Message::Ping(_) => {}
                    Message::Pong(_) => {}
                },
                Ok(Some(Err(_))) => {
                    tracing::warn!("WebSocket connection {} read error", conn_id_clone);
                    break;
                }
                Ok(None) => break,
                Err(_) => {
                    tracing::warn!("WebSocket connection {} idle timeout", conn_id_clone);
                    break;
                }
            }
        }
    });

    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }

    ws_manager.unregister_connection(conn_id).await;
}

pub fn websocket_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    SharedWebSocketManager: FromRef<S>,
    AuthState: FromRef<S>,
    Db: FromRef<S>,
{
    Router::new()
        .route("/ws/gis/map", get(websocket_handler))
        .route(
            "/ws/gis/device/{device_code}",
            get(websocket_device_handler),
        )
        // 兼容遗留路径（v7.7 前使用 /ws/gis，v7.8 起统一为 /ws/gis/map）
        .route("/ws/gis", get(websocket_handler))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:websocket:read"])),
    path = "/ws/gis/device/{device_code}",
    params(
        ("device_code" = String, Path, description = "device_code")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "websocket"
)]
pub async fn websocket_device_handler(
    ws: WebSocketUpgrade,
    State(ws_manager): State<SharedWebSocketManager>,
    State(auth_state): State<AuthState>,
    State(db): State<Db>,
    Path(device_code): Path<String>,
    Query(params): Query<WsQueryParams>,
) -> impl IntoResponse {
    let config = ws_manager.get_config();
    let jwt_secret = auth_state.jwt_secret;
    let token = params.token;
    ws.max_frame_size(config.max_frame_size)
        .max_message_size(config.max_message_size)
        .on_upgrade(move |socket| {
            handle_device_socket(socket, ws_manager, device_code, jwt_secret, token, db)
        })
}

async fn handle_device_socket(
    mut socket: WebSocket,
    ws_manager: SharedWebSocketManager,
    device_code: String,
    jwt_secret: String,
    token: Option<String>,
    db: Db,
) {
    let conn_id = Uuid::new_v4();

    // P1-21：设备 WS 连接强制认证 + 设备归属校验，任一不通过直接关闭连接
    let reject_reason: Option<String> = match token.as_ref() {
        None => Some("缺少 token".to_string()),
        Some(tok) => match verify_jwt_token(tok, &jwt_secret) {
            Err(_) => Some("无效 token".to_string()),
            Ok(claims) => {
                let tenant_filter: Option<Uuid> = if claims.is_superuser {
                    None
                } else {
                    claims
                        .tenant_id
                        .as_deref()
                        .and_then(|t| Uuid::parse_str(t).ok())
                };
                // WS 升级任务没有请求 task-local：超管走系统通道，
                // 普通用户按连接建立时解析的租户打开 stream 专用读作用域（fail-closed）。
                let is_system = claims.is_superuser;
                let scope_res = if is_system {
                    db.scope_read_system().await
                } else {
                    db.scope_read_for_tenant_stream(tenant_filter.unwrap_or_else(Uuid::nil))
                        .await
                };
                let status: Option<String> = match scope_res {
                    Ok(mut scope) => {
                        let status = sqlx::query_scalar(only_own_schema_query!(
                            "gis",
                            "SELECT status FROM gis.devices WHERE deleted_at IS NULL AND device_code = $1"
                        ))
                        .bind(&device_code)
                        .fetch_optional(&mut scope)
                        .await
                        .unwrap_or(None);
                        let _ = scope.commit().await;
                        status
                    }
                    Err(_) => None,
                };
                match status {
                    Some(s) if s == "active" => None,
                    Some(_) => Some("设备未启用".to_string()),
                    None => Some("设备不存在或无权访问".to_string()),
                }
            }
        },
    };
    if let Some(reason) = reject_reason {
        tracing::warn!("设备 WS 拒绝连接 {}: {}", device_code, reason);
        let _ = socket.send(Message::Close(None)).await;
        return;
    }

    let (tx, mut rx) = mpsc::channel(100);

    if ws_manager.register_connection(conn_id, tx).await.is_err() {
        return;
    }
    ws_manager
        .subscribe(conn_id, vec![device_code.clone()])
        .await;

    let (sender, receiver) = socket.split();
    let idle_timeout = ws_manager.get_config().idle_timeout_secs;

    let send_task = tokio::spawn(async move {
        let mut sender = sender;
        while let Some(msg) = rx.recv().await {
            if let Ok(json_str) = serde_json::to_string(&msg) {
                let _ = sender.send(Message::Text(json_str.into())).await;
            }
        }
    });

    let recv_task = tokio::spawn(async move {
        let mut receiver = receiver;
        let timeout_duration = Duration::from_secs(idle_timeout);

        loop {
            match timeout(timeout_duration, receiver.next()).await {
                Ok(Some(Ok(msg))) => match msg {
                    Message::Close(_) => break,
                    Message::Ping(_) => {}
                    _ => {}
                },
                Ok(Some(Err(_))) => {
                    tracing::warn!("Device WebSocket {} read error", conn_id);
                    break;
                }
                Ok(None) => break,
                Err(_) => {
                    tracing::warn!("Device WebSocket {} idle timeout", conn_id);
                    break;
                }
            }
        }
    });

    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }

    ws_manager.unsubscribe(conn_id, vec![device_code]).await;
    ws_manager.unregister_connection(conn_id).await;
}
