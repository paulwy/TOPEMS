//! WebSocket submodule - WebSocket handler

use crate::AppState;

pub async fn websocket_handler(
    axum::extract::State(_state): axum::extract::State<AppState>,
) -> &'static str {
    tracing::info!("Communication ws websocket_handler called");
    "WebSocket endpoint - use ws://host:port/api/core/comm/ws/connect"
}