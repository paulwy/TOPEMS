//! WebSocket 事件桥接器
//!
//! 将 Redis 事件总线的事件实时转发到 WebSocket 连接的前端客户端。
//! 实现后端事件系统与前端实时推送的打通。

use crate::modules::communication::ws::WsState;
use futures_util::StreamExt;
use redis::AsyncCommands;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

/// 事件桥接配置
pub struct WsEventBridgeConfig {
    /// Redis URL
    pub redis_url: String,
    /// 是否启用通知事件转发
    pub enable_notification: bool,
    /// 是否启用告警事件转发
    pub enable_alert: bool,
    /// 是否启用系统消息转发
    pub enable_system: bool,
}

impl Default for WsEventBridgeConfig {
    fn default() -> Self {
        Self {
            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            enable_notification: true,
            enable_alert: true,
            enable_system: true,
        }
    }
}

/// WebSocket 事件桥接器
///
/// 订阅 Redis 事件频道，将事件实时转发到 WebSocket 客户端。
pub struct WsEventBridge {
    ws_state: Arc<WsState>,
    config: WsEventBridgeConfig,
    shutdown_tx: Option<mpsc::Sender<()>>,
}

impl WsEventBridge {
    pub fn new(ws_state: Arc<WsState>, config: WsEventBridgeConfig) -> Self {
        Self {
            ws_state,
            config,
            shutdown_tx: None,
        }
    }

    /// 启动事件桥接（阻塞运行）
    pub async fn start(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let client = redis::Client::open(self.config.redis_url.clone())?;
        let mut pubsub = client.get_async_connection().await?.into_pubsub();

        // 订阅事件频道
        let mut channels = vec![];
        if self.config.enable_notification {
            pubsub.psubscribe("topems:events:Portal*").await?;
            channels.push("PortalNotification*");
        }
        if self.config.enable_alert {
            pubsub.psubscribe("topems:events:Ehs*").await?;
            channels.push("Ehs*");
        }
        if self.config.enable_system {
            pubsub.psubscribe("topems:events:Permission*").await?;
            channels.push("Permission*");
        }

        info!("WebSocket 事件桥接器已启动，订阅频道: {:?}", channels);

        // 创建关闭信号通道
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        self.shutdown_tx = Some(shutdown_tx);

        let ws_state = self.ws_state.clone();
        let mut message_stream = pubsub.on_message();

        loop {
            tokio::select! {
                msg = message_stream.next() => {
                    match msg {
                        Some(msg) => {
                            let channel: String = msg.get_channel_name().to_string();
                            let payload: String = msg.get_payload().unwrap_or_default();

                            Self::handle_event(&ws_state, &channel, &payload).await;
                        }
                        None => {
                            warn!("Redis pubsub 连接断开，尝试重连...");
                            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                            break;
                        }
                    }
                }
                _ = shutdown_rx.recv() => {
                    info!("WebSocket 事件桥接器收到关闭信号");
                    break;
                }
            }
        }

        info!("WebSocket 事件桥接器已停止");
        Ok(())
    }

    /// 处理接收到的事件
    async fn handle_event(ws_state: &Arc<WsState>, _channel: &str, payload: &str) {
        // 解析事件 JSON
        let event_json: serde_json::Value = match serde_json::from_str(payload) {
            Ok(v) => v,
            Err(e) => {
                error!("事件 JSON 解析失败: {}, 原始数据: {}", e, payload);
                return;
            }
        };

        let event_type = event_json
            .get("event_type")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let event_payload = event_json.get("payload").cloned().unwrap_or(json!({}));

        // 根据事件类型决定广播策略
        match event_type {
            "PortalNotificationPublished" => {
                // 通知事件 - 定向推送给目标用户
                if let Some(target_users) =
                    event_payload.get("target_users").and_then(|v| v.as_array())
                {
                    for user_id_value in target_users {
                        if let Some(user_id) = user_id_value.as_str() {
                            let notification = json!({
                                "id": event_payload.get("notification_id").and_then(|v| v.as_str()).unwrap_or(""),
                                "title": event_payload.get("title").and_then(|v| v.as_str()).unwrap_or("新通知"),
                                "message": event_payload.get("message").and_then(|v| v.as_str()).unwrap_or(""),
                                "type": "info",
                                "timestamp": chrono::Utc::now().timestamp(),
                                "data": event_payload,
                            });

                            let msg = json!({
                                "type": "notification",
                                "payload": notification
                            });

                            ws_state
                                .send_to_user(
                                    user_id,
                                    axum::extract::ws::Message::Text(msg.to_string().into()),
                                )
                                .await;
                        }
                    }
                } else {
                    // 如果没有指定目标用户，广播到 notifications 频道
                    let msg = json!({
                        "type": "notification",
                        "payload": event_payload
                    });
                    ws_state
                        .broadcast_to_channel(
                            "notifications",
                            axum::extract::ws::Message::Text(msg.to_string().into()),
                        )
                        .await;
                }
            }
            "EhsAccidentReported" | "EhsHazardReported" => {
                // 安全告警事件 - 广播到 alerts 频道
                let alert = json!({
                    "id": event_payload.get("accident_id").or_else(|| event_payload.get("hazard_id"))
                        .and_then(|v| v.as_str()).unwrap_or(""),
                    "title": event_payload.get("title").and_then(|v| v.as_str()).unwrap_or("安全告警"),
                    "message": event_payload.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                    "type": "warning",
                    "timestamp": chrono::Utc::now().timestamp(),
                    "severity": event_payload.get("severity").and_then(|v| v.as_str()).unwrap_or("medium"),
                    "data": event_payload,
                });

                let msg = json!({
                    "type": "alert",
                    "payload": alert
                });

                ws_state
                    .broadcast_to_channel(
                        "alerts",
                        axum::extract::ws::Message::Text(msg.to_string().into()),
                    )
                    .await;

                info!("安全告警事件已广播到 alerts 频道: {}", event_type);
            }
            "PermissionMetadataChanged" => {
                // 权限变更事件 - 广播到 permissions 频道
                let msg = json!({
                    "type": "permission_changed",
                    "payload": event_payload
                });

                ws_state
                    .broadcast_to_channel(
                        "permissions",
                        axum::extract::ws::Message::Text(msg.to_string().into()),
                    )
                    .await;

                info!("权限变更事件已广播到 permissions 频道");
            }
            _ => {
                // 其他事件 - 广播到 events 通用频道
                let msg = json!({
                    "type": "event",
                    "payload": {
                        "event_type": event_type,
                        "data": event_payload,
                        "timestamp": chrono::Utc::now().timestamp(),
                    }
                });

                ws_state
                    .broadcast_to_channel(
                        "events",
                        axum::extract::ws::Message::Text(msg.to_string().into()),
                    )
                    .await;
            }
        }
    }

    /// 停止事件桥接
    pub async fn shutdown(&self) {
        if let Some(tx) = &self.shutdown_tx {
            let _ = tx.send(()).await;
            info!("WebSocket 事件桥接器关闭信号已发送");
        }
    }
}

/// 启动 WebSocket 事件桥接（后台任务）
pub fn spawn_event_bridge(
    ws_state: Arc<WsState>,
    config: WsEventBridgeConfig,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut bridge = WsEventBridge::new(ws_state, config);
        loop {
            if let Err(e) = bridge.start().await {
                error!("WebSocket 事件桥接器异常: {}，5秒后重试...", e);
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        }
    })
}
