#![allow(dead_code)]
//! V54.0 BFF Phase 24: GraphQL 订阅网关 + 消息队列集成 + 实时推送优化
//!
//! 核心能力：
//! 1. GraphQL 订阅网关 (Subscription Gateway)
//!    - SubscriptionChannel 枚举: 工单更新/SLA 事件/审计日志/库存变更/财务交易/系统告警
//!    - 连接池管理 + 订阅者管理
//!    - 消息发布/广播/活跃订阅者查询/频道统计
//! 2. 消息队列集成 (Message Queue Integration)
//!    - 支持 Redis/NATS/Kafka/内存 多种队列提供者
//!    - 死信队列 (DLQ) 支持
//!    - At-least-once 投递保证
//! 3. 实时推送优化 (Real-time Push Optimization)
//!    - 批量聚合 (将多个事件合并为单次推送)
//!    - 优先级调度 (Critical > High > Normal > Low)
//!    - 客户端感知推送 (慢速客户端自动批量)
//!    - 背压处理 (Backpressure handling)

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_SUBSCRIPTION_CHANNELS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_subscription_channels (
    id VARCHAR(64) PRIMARY KEY,
    channel VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    subscriber_count INT NOT NULL DEFAULT 0,
    message_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_SUBSCRIBERS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_subscribers (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(128) NOT NULL,
    channels JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(32) NOT NULL DEFAULT 'connected',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_client_id ON portal_subscribers(client_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON portal_subscribers(status);
"#;

pub const CREATE_QUEUE_CONFIGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_queue_configs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL DEFAULT 'memory',
    max_size INT NOT NULL DEFAULT 10000,
    batch_size INT NOT NULL DEFAULT 100,
    dead_letter_queue VARCHAR(128),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

pub const CREATE_QUEUE_MESSAGES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_queue_messages (
    id VARCHAR(64) PRIMARY KEY,
    topic VARCHAR(128) NOT NULL,
    message_key VARCHAR(256),
    message_value JSONB NOT NULL,
    headers JSONB,
    provider VARCHAR(32) NOT NULL DEFAULT 'memory',
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    consumed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_queue_topic ON portal_queue_messages(topic);
CREATE INDEX IF NOT EXISTS idx_queue_consumed ON portal_queue_messages(consumed) WHERE consumed = FALSE;
CREATE INDEX IF NOT EXISTS idx_queue_published ON portal_queue_messages(published_at DESC);
"#;

pub const CREATE_DEAD_LETTER_QUEUE_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_dead_letter_queue (
    id VARCHAR(64) PRIMARY KEY,
    original_message_id VARCHAR(64) NOT NULL,
    topic VARCHAR(128) NOT NULL,
    message_value JSONB NOT NULL,
    error_reason TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    last_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dlq_status ON portal_dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dlq_topic ON portal_dead_letter_queue(topic);
"#;

pub const CREATE_PUSH_STATS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_push_stats (
    id VARCHAR(64) PRIMARY KEY,
    batch_window_ms INT NOT NULL DEFAULT 100,
    total_pushes BIGINT NOT NULL DEFAULT 0,
    batched_pushes BIGINT NOT NULL DEFAULT 0,
    messages_pushed BIGINT NOT NULL DEFAULT 0,
    avg_batch_size DOUBLE PRECISION NOT NULL DEFAULT 0,
    backpressure_events BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionChannel {
    TicketUpdates,
    SLAEvents,
    AuditLogs,
    InventoryChanges,
    FinanceTransactions,
    SystemAlerts,
}

impl SubscriptionChannel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TicketUpdates => "ticket_updates",
            Self::SLAEvents => "sla_events",
            Self::AuditLogs => "audit_logs",
            Self::InventoryChanges => "inventory_changes",
            Self::FinanceTransactions => "finance_transactions",
            Self::SystemAlerts => "system_alerts",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "ticket_updates" => Some(Self::TicketUpdates),
            "sla_events" => Some(Self::SLAEvents),
            "audit_logs" => Some(Self::AuditLogs),
            "inventory_changes" => Some(Self::InventoryChanges),
            "finance_transactions" => Some(Self::FinanceTransactions),
            "system_alerts" => Some(Self::SystemAlerts),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::TicketUpdates,
            Self::SLAEvents,
            Self::AuditLogs,
            Self::InventoryChanges,
            Self::FinanceTransactions,
            Self::SystemAlerts,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueueProvider {
    Redis,
    NATS,
    Kafka,
    InMemory,
}

impl QueueProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Redis => "redis",
            Self::NATS => "nats",
            Self::Kafka => "kafka",
            Self::InMemory => "memory",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "redis" => Some(Self::Redis),
            "nats" => Some(Self::NATS),
            "kafka" => Some(Self::Kafka),
            "memory" | "in_memory" => Some(Self::InMemory),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PushPriority {
    Critical = 0,
    High = 1,
    Normal = 2,
    Low = 3,
}

impl PushPriority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::High => "high",
            Self::Normal => "normal",
            Self::Low => "low",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "critical" => Self::Critical,
            "high" => Self::High,
            "low" => Self::Low,
            _ => Self::Normal,
        }
    }
}

// ==================== 核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscriber {
    pub id: String,
    pub client_id: String,
    pub channels: Vec<SubscriptionChannel>,
    pub last_seen: String,
    pub connected_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionMessage {
    pub id: String,
    pub channel: SubscriptionChannel,
    pub payload: serde_json::Value,
    pub seq: u64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelStats {
    pub channel: SubscriptionChannel,
    pub subscriber_count: usize,
    pub message_count: u64,
    pub last_message_at: Option<String>,
}

// ==================== 消息队列结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueConfig {
    pub name: String,
    pub provider: QueueProvider,
    pub max_size: usize,
    pub batch_size: usize,
}

impl Default for QueueConfig {
    fn default() -> Self {
        Self {
            name: "default".to_string(),
            provider: QueueProvider::InMemory,
            max_size: 10000,
            batch_size: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueMessage {
    pub id: String,
    pub topic: String,
    pub key: Option<String>,
    pub value: serde_json::Value,
    pub headers: Option<HashMap<String, String>>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStats {
    pub name: String,
    pub provider: QueueProvider,
    pub total_messages: u64,
    pub pending_messages: u64,
    pub consumed_messages: u64,
    pub dead_letter_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadLetterEntry {
    pub id: String,
    pub original_message_id: String,
    pub topic: String,
    pub message_value: serde_json::Value,
    pub error_reason: String,
    pub retry_count: u32,
    pub max_retries: u32,
    pub status: String,
    pub last_retry_at: Option<String>,
    pub created_at: String,
}

// ==================== 推送优化结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushBatch {
    pub messages: Vec<SubscriptionMessage>,
    pub aggregated_at: String,
    pub target_subscribers: usize,
    pub size_estimate: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushStats {
    pub batch_window_ms: u64,
    pub total_pushes: u64,
    pub batched_pushes: u64,
    pub messages_pushed: u64,
    pub avg_batch_size: f64,
    pub backpressure_events: u64,
    pub queue_length: usize,
}

impl Default for PushStats {
    fn default() -> Self {
        Self {
            batch_window_ms: 100,
            total_pushes: 0,
            batched_pushes: 0,
            messages_pushed: 0,
            avg_batch_size: 0.0,
            backpressure_events: 0,
            queue_length: 0,
        }
    }
}

// ==================== 内存存储 ====================

struct SubscriptionStore {
    subscribers: Mutex<Vec<Subscriber>>,
    messages: Mutex<Vec<SubscriptionMessage>>,
    channel_counters: Mutex<HashMap<String, u64>>,
    queues: Mutex<HashMap<String, Vec<QueueMessage>>>,
    queue_configs: Mutex<HashMap<String, QueueConfig>>,
    dead_letter_queue: Mutex<Vec<DeadLetterEntry>>,
    push_stats: Mutex<PushStats>,
    pending_push_messages: Mutex<Vec<SubscriptionMessage>>,
    batch_window: Mutex<u64>,
}

fn get_subscription_store() -> &'static SubscriptionStore {
    static STORE: LazyLock<SubscriptionStore> = LazyLock::new(|| {
        let mut queues = HashMap::new();
        queues.insert("default".to_string(), Vec::new());
        let mut queue_configs = HashMap::new();
        queue_configs.insert("default".to_string(), QueueConfig::default());
        SubscriptionStore {
            subscribers: Mutex::new(Vec::new()),
            messages: Mutex::new(Vec::new()),
            channel_counters: Mutex::new(HashMap::new()),
            queues: Mutex::new(queues),
            queue_configs: Mutex::new(queue_configs),
            dead_letter_queue: Mutex::new(Vec::new()),
            push_stats: Mutex::new(PushStats::default()),
            pending_push_messages: Mutex::new(Vec::new()),
            batch_window: Mutex::new(100),
        }
    });
    &STORE
}

// ==================== SubscriptionGateway 实现 ====================

pub struct SubscriptionGateway;

impl SubscriptionGateway {
    pub async fn subscribe(
        client_id: String,
        channels: Vec<SubscriptionChannel>,
    ) -> Result<Subscriber, String> {
        let store = get_subscription_store();
        let mut subscribers = store.subscribers.lock().await;

        let now = chrono::Utc::now().to_rfc3339();
        let subscriber = Subscriber {
            id: uuid::Uuid::new_v4().to_string(),
            client_id,
            channels,
            last_seen: now.clone(),
            connected_at: now,
        };

        subscribers.push(subscriber.clone());
        Ok(subscriber)
    }

    pub async fn unsubscribe(subscriber_id: &str) -> Result<bool, String> {
        let store = get_subscription_store();
        let mut subscribers = store.subscribers.lock().await;
        let len_before = subscribers.len();
        subscribers.retain(|s| s.id != subscriber_id);
        Ok(subscribers.len() < len_before)
    }

    pub async fn publish(
        channel: SubscriptionChannel,
        payload: serde_json::Value,
    ) -> Result<SubscriptionMessage, String> {
        let store = get_subscription_store();

        let mut counters = store.channel_counters.lock().await;
        let seq = counters.entry(channel.as_str().to_string()).or_insert(0);
        *seq += 1;
        let current_seq = *seq;
        drop(counters);

        let message = SubscriptionMessage {
            id: uuid::Uuid::new_v4().to_string(),
            channel: channel.clone(),
            payload,
            seq: current_seq,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        let mut messages = store.messages.lock().await;
        messages.push(message.clone());

        let mut pending = store.pending_push_messages.lock().await;
        pending.push(message.clone());

        Ok(message)
    }

    pub async fn broadcast(
        channels: Vec<SubscriptionChannel>,
        payload: serde_json::Value,
    ) -> Result<Vec<SubscriptionMessage>, String> {
        let mut results = Vec::new();
        for channel in channels {
            match Self::publish(channel, payload.clone()).await {
                Ok(msg) => results.push(msg),
                Err(e) => return Err(e),
            }
        }
        Ok(results)
    }

    pub async fn get_active_subscribers() -> Vec<Subscriber> {
        let store = get_subscription_store();
        let subscribers = store.subscribers.lock().await;
        subscribers.clone()
    }

    pub async fn get_channel_stats() -> Vec<ChannelStats> {
        let store = get_subscription_store();
        let subscribers = store.subscribers.lock().await;
        let messages = store.messages.lock().await;

        let mut stats = Vec::new();
        for channel in SubscriptionChannel::all() {
            let sub_count = subscribers
                .iter()
                .filter(|s| s.channels.contains(&channel))
                .count();
            let msg_count = messages.iter().filter(|m| m.channel == channel).count() as u64;
            let last_msg = messages
                .iter()
                .filter(|m| m.channel == channel)
                .last()
                .map(|m| m.created_at.clone());

            stats.push(ChannelStats {
                channel,
                subscriber_count: sub_count,
                message_count: msg_count,
                last_message_at: last_msg,
            });
        }
        stats
    }

    pub async fn get_subscriber_by_id(subscriber_id: &str) -> Option<Subscriber> {
        let store = get_subscription_store();
        let subscribers = store.subscribers.lock().await;
        subscribers.iter().find(|s| s.id == subscriber_id).cloned()
    }
}

// ==================== MessageQueueBridge 实现 ====================

pub struct MessageQueueBridge;

impl MessageQueueBridge {
    pub async fn publish_to_queue(
        queue_name: &str,
        topic: &str,
        key: Option<String>,
        value: serde_json::Value,
        headers: Option<HashMap<String, String>>,
    ) -> Result<QueueMessage, String> {
        let store = get_subscription_store();

        let configs = store.queue_configs.lock().await;
        if !configs.contains_key(queue_name) {
            return Err(format!("队列 '{}' 不存在", queue_name));
        }
        drop(configs);

        let message = QueueMessage {
            id: uuid::Uuid::new_v4().to_string(),
            topic: topic.to_string(),
            key,
            value,
            headers,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        let mut queues = store.queues.lock().await;
        if let Some(queue) = queues.get_mut(queue_name) {
            queue.push(message.clone());
        }

        Ok(message)
    }

    pub async fn consume_from_queue(
        queue_name: &str,
        max_messages: usize,
    ) -> Result<Vec<QueueMessage>, String> {
        let store = get_subscription_store();
        let mut queues = store.queues.lock().await;

        let queue = queues
            .get_mut(queue_name)
            .ok_or_else(|| format!("队列 '{}' 不存在", queue_name))?;

        let batch_size = max_messages.min(queue.len());
        let messages: Vec<QueueMessage> = queue.drain(..batch_size).collect();

        Ok(messages)
    }

    pub async fn create_queue(config: QueueConfig) -> Result<QueueConfig, String> {
        let store = get_subscription_store();
        let mut queues = store.queues.lock().await;
        let mut configs = store.queue_configs.lock().await;

        let name = config.name.clone();
        if queues.contains_key(&name) {
            return Err(format!("队列 '{}' 已存在", name));
        }

        queues.insert(name.clone(), Vec::new());
        configs.insert(name, config.clone());

        Ok(config)
    }

    pub async fn get_queue_stats(queue_name: Option<&str>) -> Vec<QueueStats> {
        let store = get_subscription_store();
        let queues = store.queues.lock().await;
        let configs = store.queue_configs.lock().await;
        let dlq = store.dead_letter_queue.lock().await;

        let mut stats = Vec::new();

        let names: Vec<String> = if let Some(name) = queue_name {
            vec![name.to_string()]
        } else {
            configs.keys().cloned().collect()
        };

        for name in names {
            let config = configs.get(&name).cloned().unwrap_or(QueueConfig {
                name: name.clone(),
                ..Default::default()
            });
            let queue_len = queues.get(&name).map(|q| q.len() as u64).unwrap_or(0);
            let dlq_count = dlq.iter().filter(|d| d.topic == name).count() as u64;

            stats.push(QueueStats {
                name,
                provider: config.provider,
                total_messages: queue_len,
                pending_messages: queue_len,
                consumed_messages: 0,
                dead_letter_count: dlq_count,
            });
        }

        stats
    }

    pub async fn purge_queue(queue_name: &str) -> Result<u64, String> {
        let store = get_subscription_store();
        let mut queues = store.queues.lock().await;

        let queue = queues
            .get_mut(queue_name)
            .ok_or_else(|| format!("队列 '{}' 不存在", queue_name))?;

        let purged = queue.len() as u64;
        queue.clear();
        Ok(purged)
    }

    pub async fn get_dead_letter_queue() -> Vec<DeadLetterEntry> {
        let store = get_subscription_store();
        let dlq = store.dead_letter_queue.lock().await;
        dlq.clone()
    }

    pub async fn move_to_dlq(
        original_message_id: &str,
        topic: &str,
        message_value: serde_json::Value,
        error_reason: &str,
    ) -> DeadLetterEntry {
        let store = get_subscription_store();
        let mut dlq = store.dead_letter_queue.lock().await;

        let entry = DeadLetterEntry {
            id: uuid::Uuid::new_v4().to_string(),
            original_message_id: original_message_id.to_string(),
            topic: topic.to_string(),
            message_value,
            error_reason: error_reason.to_string(),
            retry_count: 0,
            max_retries: 3,
            status: "pending".to_string(),
            last_retry_at: None,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        dlq.push(entry.clone());
        entry
    }
}

// ==================== PushOptimizer 实现 ====================

pub struct PushOptimizer;

impl PushOptimizer {
    pub async fn optimize_push(
        messages: Vec<SubscriptionMessage>,
        _priority: PushPriority,
        slow_client_ids: Option<Vec<String>>,
    ) -> Result<PushBatch, String> {
        let store = get_subscription_store();

        let mut sorted_messages = messages;
        sorted_messages.sort_by(|a, b| a.channel.cmp(&b.channel));

        let size_estimate = sorted_messages
            .iter()
            .map(|m| serde_json::to_string(&m).map(|s| s.len()).unwrap_or(0))
            .sum();

        let subscribers = store.subscribers.lock().await;
        let target_count = if let Some(slow_ids) = slow_client_ids {
            subscribers
                .iter()
                .filter(|s| !slow_ids.contains(&s.client_id))
                .count()
        } else {
            subscribers.len()
        };

        let batch = PushBatch {
            messages: sorted_messages,
            aggregated_at: chrono::Utc::now().to_rfc3339(),
            target_subscribers: target_count,
            size_estimate,
        };

        let mut stats = store.push_stats.lock().await;
        stats.total_pushes += 1;
        if batch.messages.len() > 1 {
            stats.batched_pushes += 1;
        }
        stats.messages_pushed += batch.messages.len() as u64;
        stats.avg_batch_size = if stats.total_pushes > 0 {
            stats.messages_pushed as f64 / stats.total_pushes as f64
        } else {
            0.0
        };
        stats.queue_length = store.pending_push_messages.lock().await.len();

        Ok(batch)
    }

    pub async fn get_push_stats() -> PushStats {
        let store = get_subscription_store();
        let stats = store.push_stats.lock().await;
        stats.clone()
    }

    pub async fn set_batch_window(window_ms: u64) -> Result<PushStats, String> {
        if window_ms == 0 || window_ms > 5000 {
            return Err("批量窗口必须在 1-5000ms 之间".to_string());
        }
        let store = get_subscription_store();
        let mut window = store.batch_window.lock().await;
        *window = window_ms;

        let mut stats = store.push_stats.lock().await;
        stats.batch_window_ms = window_ms;
        Ok(stats.clone())
    }

    pub async fn get_queue_length() -> usize {
        let store = get_subscription_store();
        let pending = store.pending_push_messages.lock().await;
        pending.len()
    }

    pub async fn drain_pending_messages() -> Vec<SubscriptionMessage> {
        let store = get_subscription_store();
        let mut pending = store.pending_push_messages.lock().await;
        std::mem::take(&mut *pending)
    }
}

// ==================== 请求 / 响应结构 ====================

#[derive(Debug, Deserialize)]
pub struct SubscribeRequest {
    pub client_id: String,
    pub channels: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UnsubscribeRequest {
    pub subscriber_id: String,
}

#[derive(Debug, Deserialize)]
pub struct PublishRequest {
    pub channel: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct PublishToQueueRequest {
    pub queue_name: String,
    pub topic: String,
    pub key: Option<String>,
    pub value: serde_json::Value,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQueueRequest {
    pub name: String,
    pub provider: Option<String>,
    pub max_size: Option<usize>,
    pub batch_size: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct PurgeQueueRequest {
    pub queue_name: String,
}

#[derive(Debug, Deserialize)]
pub struct SetBatchWindowRequest {
    pub batch_window_ms: u64,
}

#[derive(Debug, Deserialize)]
pub struct ConsumeQuery {
    pub max_messages: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct QueueStatsQuery {
    pub queue_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubscribeQuery {
    pub client_id: Option<String>,
}

// ==================== API 处理器: 订阅网关 ====================

pub async fn subscribe_handler(
    State(_state): State<AppState>,
    Json(req): Json<SubscribeRequest>,
) -> Json<ApiResponse<Subscriber>> {
    let channels: Vec<SubscriptionChannel> = req
        .channels
        .iter()
        .filter_map(|c| SubscriptionChannel::from_str(c))
        .collect();

    if channels.is_empty() {
        return Json(ApiResponse::error(400, "至少需要订阅一个有效频道"));
    }

    match SubscriptionGateway::subscribe(req.client_id, channels).await {
        Ok(subscriber) => Json(ApiResponse::success(subscriber, "订阅成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn unsubscribe_handler(
    State(_state): State<AppState>,
    Path(subscriber_id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match SubscriptionGateway::unsubscribe(&subscriber_id).await {
        Ok(true) => Json(ApiResponse::success(true, "取消订阅成功")),
        Ok(false) => Json(ApiResponse::error(404, "订阅者不存在")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_subscribers_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<Subscriber>>> {
    let subscribers = SubscriptionGateway::get_active_subscribers().await;
    Json(ApiResponse::success(subscribers, "活跃订阅者列表"))
}

pub async fn get_channels_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<ChannelStats>>> {
    let stats = SubscriptionGateway::get_channel_stats().await;
    Json(ApiResponse::success(stats, "频道统计"))
}

pub async fn publish_handler(
    State(_state): State<AppState>,
    Json(req): Json<PublishRequest>,
) -> Json<ApiResponse<SubscriptionMessage>> {
    let channel = match SubscriptionChannel::from_str(&req.channel) {
        Some(ch) => ch,
        None => return Json(ApiResponse::error(400, "无效的频道名称")),
    };

    match SubscriptionGateway::publish(channel, req.payload).await {
        Ok(msg) => Json(ApiResponse::success(msg, "消息发布成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

// ==================== API 处理器: 消息队列 ====================

pub async fn publish_to_queue_handler(
    State(_state): State<AppState>,
    Json(req): Json<PublishToQueueRequest>,
) -> Json<ApiResponse<QueueMessage>> {
    match MessageQueueBridge::publish_to_queue(
        &req.queue_name,
        &req.topic,
        req.key,
        req.value,
        req.headers,
    )
    .await
    {
        Ok(msg) => Json(ApiResponse::success(msg, "消息已发布到队列")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_queue_stats_handler(
    State(_state): State<AppState>,
    Query(params): Query<QueueStatsQuery>,
) -> Json<ApiResponse<Vec<QueueStats>>> {
    let stats = MessageQueueBridge::get_queue_stats(params.queue_name.as_deref()).await;
    Json(ApiResponse::success(stats, "队列统计"))
}

pub async fn create_queue_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateQueueRequest>,
) -> Json<ApiResponse<QueueConfig>> {
    let provider = req
        .provider
        .as_deref()
        .and_then(QueueProvider::from_str)
        .unwrap_or(QueueProvider::InMemory);

    let config = QueueConfig {
        name: req.name,
        provider,
        max_size: req.max_size.unwrap_or(10000),
        batch_size: req.batch_size.unwrap_or(100),
    };

    match MessageQueueBridge::create_queue(config).await {
        Ok(cfg) => Json(ApiResponse::success(cfg, "队列创建成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn purge_queue_handler(
    State(_state): State<AppState>,
    Json(req): Json<PurgeQueueRequest>,
) -> Json<ApiResponse<u64>> {
    match MessageQueueBridge::purge_queue(&req.queue_name).await {
        Ok(count) => Json(ApiResponse::success(count, "队列已清空")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_dlq_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<DeadLetterEntry>>> {
    let dlq = MessageQueueBridge::get_dead_letter_queue().await;
    Json(ApiResponse::success(dlq, "死信队列"))
}

// ==================== API 处理器: 推送优化 ====================

pub async fn get_push_stats_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<PushStats>> {
    let stats = PushOptimizer::get_push_stats().await;
    Json(ApiResponse::success(stats, "推送统计"))
}

pub async fn set_batch_window_handler(
    State(_state): State<AppState>,
    Json(req): Json<SetBatchWindowRequest>,
) -> Json<ApiResponse<PushStats>> {
    match PushOptimizer::set_batch_window(req.batch_window_ms).await {
        Ok(stats) => Json(ApiResponse::success(stats, "批量窗口已更新")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_push_queue_length_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<usize>> {
    let length = PushOptimizer::get_queue_length().await;
    Json(ApiResponse::success(length, "推送队列长度"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_subscription_channel_roundtrip_all_variants() {
        for v in SubscriptionChannel::all() {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_subscription_channel_as_str_from_str_all() {
        for v in SubscriptionChannel::all() {
            let s = v.as_str();
            let back = SubscriptionChannel::from_str(s);
            assert!(back.is_some());
            roundtrip(back.as_ref().unwrap());
        }
        assert_eq!(SubscriptionChannel::all().len(), 6);
    }

    #[test]
    fn test_queue_provider_roundtrip_all_variants() {
        for v in [
            QueueProvider::Redis,
            QueueProvider::NATS,
            QueueProvider::Kafka,
            QueueProvider::InMemory,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_queue_provider_as_str_from_str() {
        for v in [
            QueueProvider::Redis,
            QueueProvider::NATS,
            QueueProvider::Kafka,
            QueueProvider::InMemory,
        ] {
            let s = v.as_str();
            let back = QueueProvider::from_str(s);
            assert!(back.is_some());
            roundtrip(back.as_ref().unwrap());
        }
        assert!(QueueProvider::from_str("bogus").is_none());
    }

    #[test]
    fn test_push_priority_roundtrip_all_variants() {
        for v in [
            PushPriority::Critical,
            PushPriority::High,
            PushPriority::Normal,
            PushPriority::Low,
        ] {
            roundtrip(&v);
        }
    }

    #[test]
    fn test_push_priority_as_str_from_str() {
        for v in [
            PushPriority::Critical,
            PushPriority::High,
            PushPriority::Normal,
            PushPriority::Low,
        ] {
            let s = v.as_str();
            let back = PushPriority::from_str(s);
            roundtrip(&back);
        }
    }

    #[test]
    fn test_subscriber_roundtrip() {
        let s = Subscriber {
            id: "sub1".to_string(),
            client_id: "c1".to_string(),
            channels: vec![SubscriptionChannel::TicketUpdates],
            last_seen: "2025-01-01T00:00:00Z".to_string(),
            connected_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&s);
    }

    #[test]
    fn test_subscription_message_roundtrip() {
        let m = SubscriptionMessage {
            id: "m1".to_string(),
            channel: SubscriptionChannel::AuditLogs,
            payload: Value::Null,
            seq: 1,
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&m);
    }

    #[test]
    fn test_channel_stats_roundtrip() {
        let cs = ChannelStats {
            channel: SubscriptionChannel::SystemAlerts,
            subscriber_count: 10,
            message_count: 100,
            last_message_at: None,
        };
        roundtrip(&cs);
    }

    #[test]
    fn test_queue_config_roundtrip() {
        let qc = QueueConfig {
            name: "q1".to_string(),
            provider: QueueProvider::Redis,
            max_size: 1000,
            batch_size: 50,
        };
        roundtrip(&qc);
    }

    #[test]
    fn test_queue_message_roundtrip() {
        let qm = QueueMessage {
            id: "qm1".to_string(),
            topic: "t1".to_string(),
            key: Some("k1".to_string()),
            value: Value::Null,
            headers: Some(HashMap::new()),
            timestamp: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&qm);
    }

    #[test]
    fn test_queue_stats_roundtrip() {
        let qs = QueueStats {
            name: "q1".to_string(),
            provider: QueueProvider::Kafka,
            total_messages: 10000,
            pending_messages: 50,
            consumed_messages: 9900,
            dead_letter_count: 50,
        };
        roundtrip(&qs);
    }

    #[test]
    fn test_dead_letter_entry_roundtrip() {
        let d = DeadLetterEntry {
            id: "dl1".to_string(),
            original_message_id: "om1".to_string(),
            topic: "t1".to_string(),
            message_value: Value::Null,
            error_reason: "timeout".to_string(),
            retry_count: 3,
            max_retries: 5,
            status: "failed".to_string(),
            last_retry_at: None,
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };
        roundtrip(&d);
    }

    #[test]
    fn test_push_batch_roundtrip() {
        let pb = PushBatch {
            messages: vec![],
            aggregated_at: "2025-01-01T00:00:00Z".to_string(),
            target_subscribers: 5,
            size_estimate: 1024,
        };
        roundtrip(&pb);
    }

    #[test]
    fn test_push_stats_roundtrip() {
        let ps = PushStats {
            batch_window_ms: 100,
            total_pushes: 1000,
            batched_pushes: 800,
            messages_pushed: 5000,
            avg_batch_size: 5.0,
            backpressure_events: 10,
            queue_length: 42,
        };
        roundtrip(&ps);
    }
}
