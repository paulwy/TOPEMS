use axum::{
    extract::FromRef,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
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
use uuid::Uuid;

type ConnectionId = Uuid;

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

use std::env;

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(ws_manager): State<SharedWebSocketManager>,
) -> impl IntoResponse {
    let config = ws_manager.get_config();
    ws.max_frame_size(config.max_frame_size)
        .max_message_size(config.max_message_size)
        .on_upgrade(|socket| handle_socket(socket, ws_manager))
}

async fn handle_socket(socket: WebSocket, ws_manager: SharedWebSocketManager) {
    let conn_id = Uuid::new_v4();
    let (tx, mut rx) = mpsc::channel(100);

    if ws_manager.register_connection(conn_id, tx).await.is_err() {
        return;
    }

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
                                    ws_manager_clone
                                        .subscribe(conn_id_clone, device_codes)
                                        .await;
                                }
                                WebSocketMessage::Unsubscribe { device_codes } => {
                                    ws_manager_clone
                                        .unsubscribe(conn_id_clone, device_codes)
                                        .await;
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
{
    Router::new()
        .route("/ws/gis", get(websocket_handler))
        .route(
            "/ws/gis/device/{device_code}",
            get(websocket_device_handler),
        )
}

pub async fn websocket_device_handler(
    ws: WebSocketUpgrade,
    State(ws_manager): State<SharedWebSocketManager>,
    Path(device_code): Path<String>,
) -> impl IntoResponse {
    let config = ws_manager.get_config();
    ws.max_frame_size(config.max_frame_size)
        .max_message_size(config.max_message_size)
        .on_upgrade(|socket| handle_device_socket(socket, ws_manager, device_code))
}

async fn handle_device_socket(
    socket: WebSocket,
    ws_manager: SharedWebSocketManager,
    device_code: String,
) {
    let conn_id = Uuid::new_v4();
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
