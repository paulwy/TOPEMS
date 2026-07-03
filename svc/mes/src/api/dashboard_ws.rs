use axum::{extract::WebSocketUpgrade, response::IntoResponse};
use futures_util::{stream::SplitSink, SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::RwLock;

type ConnectionList =
    Arc<RwLock<Vec<SplitSink<axum::extract::ws::WebSocket, axum::extract::ws::Message>>>>;

lazy_static::lazy_static! {
    static ref DASHBOARD_WS_CONNECTIONS: ConnectionList = Arc::new(RwLock::new(Vec::new()));
}

pub async fn dashboard_websocket(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|socket| async {
        let (sender, mut receiver) = socket.split();

        let mut connections = DASHBOARD_WS_CONNECTIONS.write().await;
        connections.push(sender);
        let count = connections.len();
        tracing::info!("Dashboard WebSocket connected, total: {}", count);

        while let Some(msg) = receiver.next().await {
            if let Err(e) = msg {
                tracing::warn!("Dashboard WebSocket message error: {}", e);
                break;
            }
        }

        let mut connections = DASHBOARD_WS_CONNECTIONS.write().await;
        connections.clear();
        tracing::info!("Dashboard WebSocket disconnected");
    })
}
