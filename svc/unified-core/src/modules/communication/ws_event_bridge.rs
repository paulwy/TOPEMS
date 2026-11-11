#![allow(unused_imports)]

//! WebSocket 事件桥接器
//!
//! 将 Redis 事件总线的事件实时转发到 WebSocket 连接的前端客户端。
//! 实现后端事件系统与前端实时推送的打通。

use crate::modules::communication::ws::WsState;
use futures_util::StreamExt;
use redis::AsyncCommands;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc;
use topems_shared_core::error::TopemsError;
use tracing::{error, info, warn};
use uuid::Uuid;

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
/// 订阅 Redis 事件总线，将事件实时转发到 WebSocket 客户端。
/// 默认消费 Redis Stream（与事件总线 stream 模式对齐，消息持久化 + ACK）；
/// 通过 `EVENT_BRIDGE_MODE=pubsub` 可显式降级回 Redis Pub/Sub 频道订阅。
pub struct WsEventBridge {
    ws_state: Arc<WsState>,
    config: WsEventBridgeConfig,
    shutdown_tx: Option<mpsc::Sender<()>>,
}

/// 桥接转发的 Stream 事件类型（与旧 pubsub 频道 `topems:events:Portal* / Ehs* / Permission*` 一一对应）
const BRIDGE_STREAM_EVENT_TYPES: &[topems_shared_event::event::EventType] = &[
    // Portal 通知/菜单/页面
    topems_shared_event::event::EventType::PortalNotificationPublished,
    topems_shared_event::event::EventType::PortalMenuUpdated,
    topems_shared_event::event::EventType::PortalPageCreated,
    // EHS 安全告警
    topems_shared_event::event::EventType::EhsHazardReported,
    topems_shared_event::event::EventType::EhsHazardRectified,
    topems_shared_event::event::EventType::EhsHazardVerified,
    topems_shared_event::event::EventType::EhsAccidentReported,
    topems_shared_event::event::EventType::EhsAccidentInvestigated,
    // 权限变更
    topems_shared_event::event::EventType::PermissionChanged,
    topems_shared_event::event::EventType::PermissionMetadataChanged,
];

/// 告警帧 `data` 字段白名单（新增字段必须显式加白，禁止整包透传）
const ALERT_DATA_KEYS: &[&str] = &[
    "hazard_id",
    "hazard_no",
    "accident_id",
    "accident_no",
    "category",
    "level",
    "severity",
    "location",
    "status",
];

/// 通知帧 `data` 白名单（不含 target_users / tenant_id）
const NOTIFICATION_DATA_KEYS: &[&str] = &["notification_id", "link_url"];

/// 权限变更帧白名单
const PERMISSION_CHANGED_KEYS: &[&str] =
    &["permissions_added", "permissions_removed", "changed_at"];

/// 平台级事件白名单（菜单/页面/权限元数据）
const SYSTEM_DATA_KEYS: &[&str] = &[
    "change_type",
    "permission_codes",
    "menu_id",
    "menu_name",
    "page_id",
    "page_name",
    "page_path",
    "changed_at",
    "updated_at",
    "created_at",
];

/// 从事件 payload 提取租户（唯一合法来源；缺失/nil/非法 → None）
fn event_tenant(payload: &Value) -> Option<Uuid> {
    payload
        .get("tenant_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .filter(|t| !t.is_nil())
}

/// 按白名单提取字段（不存在的键跳过；`null` 跳过）
fn pick(src: &Value, keys: &[&str]) -> Value {
    let mut map = serde_json::Map::new();
    for key in keys {
        if let Some(value) = src.get(*key) {
            if !value.is_null() {
                map.insert((*key).to_string(), value.clone());
            }
        }
    }
    Value::Object(map)
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
    ///
    /// 事件总线默认已切 Redis Stream（`EVENT_BUS_MODE` 默认 stream），
    /// 桥接默认跟随 Stream 消费（`EVENT_BRIDGE_MODE` 默认 stream），
    /// 避免"发布端 XADD / 桥接端 PSUBSCRIBE 旧频道"的链路断裂。
    pub async fn start(&mut self) -> Result<(), TopemsError> {
        let mode = std::env::var("EVENT_BRIDGE_MODE").unwrap_or_else(|_| "stream".to_string());
        if mode.eq_ignore_ascii_case("pubsub") {
            self.start_pubsub().await
        } else {
            self.start_stream().await
        }
    }

    /// Stream 消费模式：订阅 `topems:stream:events:{EventType}`，XREADGROUP + ACK
    async fn start_stream(&mut self) -> Result<(), TopemsError> {
        use topems_shared_event::event::stream_subscriber::StreamEventSubscriber;
        use topems_shared_event::event::Event;

        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        self.shutdown_tx = Some(shutdown_tx);

        let ws_state = self.ws_state.clone();
        let mut subscriber = StreamEventSubscriber::new("unified-core-ws-bridge")?;

        // P0③：消费组名可配置（默认沿用现值），并打印实例标识便于多副本排查。
        // 注意：本轮不改消费语义 —— 同组多实例仍是竞争消费。
        // 扩容扇出方案（Redis Pub/Sub）见 w7-p0-ws-tenant-partition-design 文档，未实施。
        let group = std::env::var("WS_BRIDGE_GROUP")
            .unwrap_or_else(|_| "unified-core-ws-bridge".to_string());
        let instance = std::env::var("WS_INSTANCE_ID")
            .or_else(|_| std::env::var("HOSTNAME"))
            .unwrap_or_else(|_| "local".to_string());
        subscriber = subscriber.with_consumer_group(group.clone());
        info!(
            "WebSocket 事件桥接器实例标识: instance={}, group={}",
            instance, group
        );

        for event_type in BRIDGE_STREAM_EVENT_TYPES {
            let ws_state = ws_state.clone();
            subscriber = subscriber.subscribe(*event_type, move |event: Event| {
                let ws_state = ws_state.clone();
                async move {
                    // 与 pubsub 载荷同构：channel 名 + Event JSON，复用统一转发逻辑
                    let channel = format!("topems:events:{}", event.event_type);
                    let payload = serde_json::to_string(&event).unwrap_or_default();
                    Self::handle_event(&ws_state, &channel, &payload).await
                }
            });
        }

        info!(
            "WebSocket 事件桥接器已启动（Stream 模式），订阅事件类型: {:?}",
            BRIDGE_STREAM_EVENT_TYPES
                .iter()
                .map(|t| t.to_string())
                .collect::<Vec<_>>()
        );

        tokio::select! {
            result = subscriber.start_listening() => {
                result?;
            }
            _ = shutdown_rx.recv() => {
                info!("WebSocket 事件桥接器收到关闭信号（Stream 模式）");
            }
        }

        info!("WebSocket 事件桥接器已停止");
        Ok(())
    }

    /// Pub/Sub 消费模式（显式降级，`EVENT_BRIDGE_MODE=pubsub`）
    async fn start_pubsub(&mut self) -> Result<(), TopemsError> {
        let client = redis::Client::open(self.config.redis_url.clone())?;
        let mut pubsub = client.get_async_pubsub().await?;

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

                            if let Err(e) =
                                Self::handle_event(&ws_state, &channel, &payload).await
                            {
                                warn!("Pub/Sub 事件桥接处理失败: {}", e);
                            }
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
    ///
    /// 租户分区（W7 P0）：租户事件的唯一来源是 `payload.tenant_id`。
    /// 取不到租户 → 返回 Err（Stream 模式重试 3 次后进 DLQ），绝不广播。
    async fn handle_event(
        ws_state: &Arc<WsState>,
        _channel: &str,
        payload: &str,
    ) -> Result<(), TopemsError> {
        // 解析事件 JSON
        let event_json: Value = match serde_json::from_str(payload) {
            Ok(v) => v,
            Err(e) => {
                error!("事件 JSON 解析失败: {}, 原始数据: {}", e, payload);
                return Ok(());
            }
        };

        let event_type = event_json
            .get("event_type")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let event_payload = event_json.get("payload").cloned().unwrap_or(json!({}));

        match event_type {
            // ---------- 租户事件：EHS 安全告警 ----------
            "EhsAccidentReported"
            | "EhsHazardReported"
            | "EhsHazardRectified"
            | "EhsHazardVerified"
            | "EhsAccidentInvestigated" => {
                let tenant = event_tenant(&event_payload).ok_or_else(|| {
                    TopemsError::ValidationFailed(format!(
                        "[tenant_ctx:nil] EHS 事件缺少租户，拒绝广播: event_type={}",
                        event_type
                    ))
                })?;

                let alert = json!({
                    "id": event_payload.get("accident_id").or_else(|| event_payload.get("hazard_id"))
                        .and_then(|v| v.as_str()).unwrap_or(""),
                    "title": event_payload.get("title").and_then(|v| v.as_str()).unwrap_or("安全告警"),
                    "message": event_payload.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                    "type": "warning",
                    "timestamp": chrono::Utc::now().timestamp(),
                    "severity": event_payload.get("severity").and_then(|v| v.as_str()).unwrap_or("medium"),
                    // 白名单：新增字段必须显式加入 ALERT_DATA_KEYS，禁止整包透传
                    "data": pick(&event_payload, ALERT_DATA_KEYS),
                });

                let msg = json!({ "type": "alert", "payload": alert });
                ws_state
                    .broadcast_to_tenant_channel(
                        tenant,
                        "alerts",
                        axum::extract::ws::Message::Text(msg.to_string().into()),
                    )
                    .await;

                info!(
                    tenant = %tenant,
                    "安全告警事件已广播到租户 alerts 频道: {}",
                    event_type
                );
            }

            // ---------- 租户事件：通知（历史 payload 无 tenant_id） ----------
            "PortalNotificationPublished" => {
                let notification = json!({
                    "id": event_payload.get("notification_id").and_then(|v| v.as_str()).unwrap_or(""),
                    "title": event_payload.get("title").and_then(|v| v.as_str()).unwrap_or("新通知"),
                    "message": event_payload.get("message").and_then(|v| v.as_str()).unwrap_or(""),
                    "type": "info",
                    "timestamp": chrono::Utc::now().timestamp(),
                    // 白名单：不含 target_users / tenant_id 等内部字段
                    "data": pick(&event_payload, NOTIFICATION_DATA_KEYS),
                });
                let msg = axum::extract::ws::Message::Text(
                    json!({ "type": "notification", "payload": notification })
                        .to_string()
                        .into(),
                );

                if let Some(tenant) = event_tenant(&event_payload) {
                    let target_users = event_payload
                        .get("target_users")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    if target_users.is_empty() {
                        ws_state
                            .broadcast_to_tenant_channel(tenant, "notifications", msg)
                            .await;
                    } else {
                        for user_id in target_users.iter().filter_map(|v| v.as_str()) {
                            ws_state
                                .send_to_tenant_user(tenant, user_id, msg.clone())
                                .await;
                        }
                    }
                } else {
                    // 过渡：Portal 通知 payload 尚无 tenant_id（生产者待补，见 P0 文档 §11）。
                    // 目标用户 ID 全局唯一，可定向下发；但绝不广播。
                    let target_users = event_payload
                        .get("target_users")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    if target_users.is_empty() {
                        warn!(
                            "Portal 通知缺少 tenant_id 且无目标用户，已丢弃（租户未定，禁止广播）"
                        );
                    } else {
                        warn!(
                            "Portal 通知缺少 tenant_id，按用户 ID 定向发送（临时，待生产者补租户）"
                        );
                        for user_id in target_users.iter().filter_map(|v| v.as_str()) {
                            if !ws_state.send_to_unique_user(user_id, msg.clone()).await {
                                warn!(user = %user_id, "Portal 通知定向发送失败（离线或跨租户重名）");
                            }
                        }
                    }
                }
            }

            // ---------- 租户事件：权限变更 ----------
            "PermissionChanged" => {
                let tenant = event_tenant(&event_payload).ok_or_else(|| {
                    TopemsError::ValidationFailed(
                        "[tenant_ctx:nil] PermissionChanged 缺少租户，拒绝广播".to_string(),
                    )
                })?;
                let msg = axum::extract::ws::Message::Text(
                    json!({
                        "type": "permission_changed",
                        "payload": pick(&event_payload, PERMISSION_CHANGED_KEYS),
                    })
                    .to_string()
                    .into(),
                );
                ws_state
                    .broadcast_to_tenant_channel(tenant, "permissions", msg)
                    .await;
                info!(tenant = %tenant, "权限变更事件已广播到租户 permissions 频道");
            }

            // ---------- 平台级事件（无租户业务数据，仅系统配置） ----------
            "PermissionMetadataChanged" | "PortalMenuUpdated" | "PortalPageCreated" => {
                let msg = axum::extract::ws::Message::Text(
                    json!({
                        "type": "event",
                        "payload": {
                            "event_type": event_type,
                            "data": pick(&event_payload, SYSTEM_DATA_KEYS),
                            "timestamp": chrono::Utc::now().timestamp(),
                        }
                    })
                    .to_string()
                    .into(),
                );
                ws_state.broadcast_system(msg).await;
                info!("平台级事件已广播到系统范围: {}", event_type);
            }

            _ => {
                // 未知事件：不转发（避免把任意 payload 自动泄漏给前端）
                warn!("桥接忽略未登记的事件类型: {}", event_type);
            }
        }

        Ok(())
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
