use axum::{
    extract::ws::Message,
    extract::{Query, State, WebSocketUpgrade},
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use uuid::Uuid;

use topems_shared_auth::auth::{verify_jwt_token, AuthState};

#[derive(Debug, Deserialize)]
pub struct WsQueryParams {
    token: Option<String>,
}

lazy_static::lazy_static! {
    static ref ACTIVE_CONNECTIONS: Arc<RwLock<Vec<Uuid>>> = Arc::new(RwLock::new(Vec::new()));
    static ref TOTAL_CONNECTIONS: Arc<RwLock<u64>> = Arc::new(RwLock::new(0));
}

pub async fn dashboard_websocket(
    State(auth_state): State<AuthState>,
    Query(params): Query<WsQueryParams>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    tracing::info!("========== Dashboard WebSocket Upgrade Request Received ==========");
    tracing::info!("📋 Query params: {:?}", params);
    tracing::info!(
        "🔑 JWT secret available: {}",
        !auth_state.jwt_secret.is_empty()
    );

    let jwt_secret = auth_state.jwt_secret.clone();
    let token_from_url = params.token;

    ws.on_upgrade(move |socket| async move {
        let connection_id = Uuid::new_v4();
        let start_time = Instant::now();
        let mut message_count: u64 = 0;
        let mut heartbeat_count: u64 = 0;

        let mut authenticated = if let Some(token) = token_from_url {
            tracing::info!("🔐 Validating URL token for connection {}", connection_id);
            match verify_jwt_token(&token, &jwt_secret) {
                Ok(claims) => {
                    tracing::info!("✅ URL Token validated: user={}, role={}", claims.sub, claims.role);
                    true
                }
                Err(e) => {
                    tracing::warn!("❌ URL Token validation failed: {}", e);
                    false
                }
            }
        } else {
            tracing::info!("🔐 No URL token provided for connection {}", connection_id);
            false
        };

        {
            let mut total = TOTAL_CONNECTIONS.write().await;
            *total += 1;
            tracing::info!("✅ Connection established: id={}, total_connections={}", connection_id, *total);
        }

        {
            let mut connections = ACTIVE_CONNECTIONS.write().await;
            connections.push(connection_id);
            let count = connections.len();
            tracing::info!("📊 Active connections updated: {}", count);
        }

        tracing::info!("🔌 Socket splitting into sender/receiver for connection {}", connection_id);
        let (mut tx, mut rx) = socket.split();

        let initial_msg = if authenticated {
            r#"{"type":"connected","message":"Dashboard WebSocket connected","authenticated":true}"#.to_string()
        } else {
            r#"{"type":"connected","message":"Dashboard WebSocket connected, please authenticate"}"#.to_string()
        };
        match tx.send(Message::Text(initial_msg.into())).await {
            Ok(_) => {
                tracing::info!("📤 Initial message sent successfully to connection {}", connection_id);
            }
            Err(e) => {
                tracing::error!("❌ Failed to send initial message to connection {}: {}", connection_id, e);
            }
        }

        let mut heartbeat_interval = interval(Duration::from_secs(30));
        heartbeat_interval.tick().await;

        tracing::info!("🔄 Main event loop started for connection {}", connection_id);
        loop {
            tokio::select! {
                _ = heartbeat_interval.tick() => {
                    heartbeat_count += 1;
                    tracing::info!("⏰ Sending heartbeat #{} to connection {}", heartbeat_count, connection_id);
                    let heartbeat_msg = Message::Text(format!("{{\"type\":\"heartbeat\",\"timestamp\":{}}}", chrono::Utc::now().timestamp()).into());
                    match tx.send(heartbeat_msg).await {
                        Ok(_) => {
                            tracing::debug!("✅ Heartbeat #{} sent successfully to connection {}", heartbeat_count, connection_id);
                        }
                        Err(e) => {
                            tracing::error!("❌ Heartbeat #{} failed for connection {}: {}", heartbeat_count, connection_id, e);
                            tracing::info!("🔌 Breaking loop due to heartbeat failure for connection {}", connection_id);
                            break;
                        }
                    }
                }
                msg = rx.next() => {
                    tracing::info!("📥 Message received from connection {}, waiting to process", connection_id);
                    match msg {
                        Some(Ok(message)) => {
                            message_count += 1;
                            tracing::info!("📩 Processing message #{} from connection {}", message_count, connection_id);
                            match message {
                                Message::Text(text) => {
                                    tracing::info!("📝 Received TEXT message ({} bytes) from connection {}: {}", text.len(), connection_id, text);

                                    if !authenticated {
                                        tracing::info!("🔐 Connection {} not authenticated, checking message for auth", connection_id);
                                        match serde_json::from_str::<Value>(&text) {
                                            Ok(parsed) => {
                                                let msg_type = parsed.get("type").and_then(|v| v.as_str());
                                                tracing::info!("🔍 Parsed message type: {:?} for connection {}", msg_type, connection_id);
                                                match msg_type {
                                                    Some("authenticate") => {
                                                        tracing::info!("🔑 Authentication request received for connection {}", connection_id);
                                                        authenticated = true;
                                                        match tx.send(Message::Text(r#"{"type":"authenticated","message":"Authentication successful"}"#.to_string().into())).await {
                                                            Ok(_) => {
                                                                tracing::info!("✅ Connection {} authenticated successfully", connection_id);
                                                            }
                                                            Err(e) => {
                                                                tracing::error!("❌ Failed to send auth success message to connection {}: {}", connection_id, e);
                                                            }
                                                        }
                                                    }
                                                    Some(other_type) => {
                                                        tracing::warn!("⚠️ Connection {} not authenticated, received message type '{}' - ignoring", connection_id, other_type);
                                                        match tx.send(Message::Text(r#"{"type":"error","message":"Authentication required"}"#.to_string().into())).await {
                                                            Ok(_) => {
                                                                tracing::info!("📤 Sent 'Authentication required' error to connection {}", connection_id);
                                                            }
                                                            Err(e) => {
                                                                tracing::error!("❌ Failed to send auth required message to connection {}: {}", connection_id, e);
                                                            }
                                                        }
                                                    }
                                                    None => {
                                                        tracing::warn!("⚠️ Connection {} not authenticated, message has no 'type' field - ignoring", connection_id);
                                                    }
                                                }
                                            }
                                            Err(e) => {
                                                tracing::error!("❌ Failed to parse JSON message from connection {}: {}", connection_id, e);
                                            }
                                        }
                                    } else {
                                        tracing::info!("🔓 Connection {} already authenticated, processing message", connection_id);
                                    }
                                }
                                Message::Binary(data) => {
                                    tracing::info!("📦 Received BINARY message ({} bytes) from connection {}", data.len(), connection_id);
                                }
                                Message::Ping(data) => {
                                    tracing::info!("🏓 Received PING from connection {}, responding with PONG", connection_id);
                                    match tx.send(Message::Pong(data)).await {
                                        Ok(_) => {
                                            tracing::debug!("✅ PONG sent to connection {}", connection_id);
                                        }
                                        Err(e) => {
                                            tracing::error!("❌ Failed to send PONG to connection {}: {}", connection_id, e);
                                        }
                                    }
                                }
                                Message::Pong(_) => {
                                    tracing::info!("🏓 Received PONG from connection {}, connection is alive", connection_id);
                                }
                                Message::Close(frame) => {
                                    tracing::info!("🚪 Connection {} closed by client: {:?}", connection_id, frame);
                                    tracing::info!("🔌 Breaking loop due to client close for connection {}", connection_id);
                                    break;
                                }
                            }
                        }
                        Some(Err(e)) => {
                            tracing::error!("❌ Message error from connection {}: {}, messages received: {}", connection_id, e, message_count);
                            tracing::info!("🔌 Breaking loop due to message error for connection {}", connection_id);
                            break;
                        }
                        None => {
                            tracing::info!("🚪 Connection {} closed gracefully (rx returned None)", connection_id);
                            tracing::info!("🔌 Breaking loop due to graceful close for connection {}", connection_id);
                            break;
                        }
                    }
                }
            }
        }

        let duration = start_time.elapsed();

        {
            let mut connections = ACTIVE_CONNECTIONS.write().await;
            connections.retain(|&id| id != connection_id);
            let remaining = connections.len();
            tracing::info!("📊 Connection {} removed from active connections, remaining: {}", connection_id, remaining);
        }

        tracing::info!(
            "========== Dashboard WebSocket Disconnected ==========\nid: {}\nduration: {:?}\nmessages_received: {}\nheartbeats_sent: {}\nauthenticated: {}\nremaining_connections: {}\n=======================================================",
            connection_id,
            duration,
            message_count,
            heartbeat_count,
            authenticated,
            {
                let connections = ACTIVE_CONNECTIONS.read().await;
                connections.len()
            }
        );
    })
}
