use axum::{
    extract::{Path, State, ws::{WebSocketUpgrade, WebSocket, Message}},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use tokio::sync::{RwLock, mpsc};
use uuid::Uuid;

use crate::AppState;

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
}

pub struct WebSocketManager {
    connections: RwLock<HashMap<ConnectionId, mpsc::Sender<WebSocketMessage>>>,
    subscriptions: RwLock<HashMap<String, HashSet<ConnectionId>>>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
            subscriptions: RwLock::new(HashMap::new()),
        }
    }

    pub async fn register_connection(&self, conn_id: ConnectionId, sender: mpsc::Sender<WebSocketMessage>) {
        self.connections.write().await.insert(conn_id, sender);
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
            subs.entry(device_code).or_insert_with(HashSet::new).insert(conn_id);
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
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let conn_id = Uuid::new_v4();
    let (tx, mut rx) = mpsc::channel(100);

    state.ws_manager.register_connection(conn_id, tx).await;

    let (mut sender, mut receiver) = socket.split();
    
    let state_clone = state.clone();
    let conn_id_clone = conn_id;
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let json_str = serde_json::to_string(&msg).unwrap();
            let _ = sender.send(Message::Text(json_str.into())).await;
        }
    });

    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(message) = serde_json::from_str::<WebSocketMessage>(&text) {
                    match message {
                        WebSocketMessage::Subscribe { device_codes } => {
                            state_clone.ws_manager.subscribe(conn_id_clone, device_codes).await;
                        }
                        WebSocketMessage::Unsubscribe { device_codes } => {
                            state_clone.ws_manager.unsubscribe(conn_id_clone, device_codes).await;
                        }
                        WebSocketMessage::Ping => {}
                        _ => {}
                    }
                }
            }
            Message::Binary(_) => {}
            Message::Close(_) => break,
            Message::Ping(_) => {}
            Message::Pong(_) => {}
        }
    }

    state.ws_manager.unregister_connection(conn_id).await;
}

pub fn websocket_routes() -> Router<AppState> {
    Router::new()
        .route("/api/gis/ws", get(websocket_handler))
        .route("/api/gis/ws/device/{device_code}", get(websocket_device_handler))
}

async fn websocket_device_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(device_code): Path<String>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_device_socket(socket, state, device_code))
}

async fn handle_device_socket(socket: WebSocket, state: AppState, device_code: String) {
    let conn_id = Uuid::new_v4();
    let (tx, mut rx) = mpsc::channel(100);

    state.ws_manager.register_connection(conn_id, tx).await;
    state.ws_manager.subscribe(conn_id, vec![device_code.clone()]).await;

    let (mut sender, mut receiver) = socket.split();

    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let json_str = serde_json::to_string(&msg).unwrap();
            let _ = sender.send(Message::Text(json_str.into())).await;
        }
    });

    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Close(_) => break,
            Message::Ping(_) => {}
            _ => {}
        }
    }

    state.ws_manager.unsubscribe(conn_id, vec![device_code]).await;
    state.ws_manager.unregister_connection(conn_id).await;
}