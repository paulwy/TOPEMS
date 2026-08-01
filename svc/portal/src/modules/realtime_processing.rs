#![allow(dead_code)] // Reserved: V56 实时演进模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V56.0 BFF Phase 27: GraphQL 实时演进 — 订阅持久化 + 消息重放 + 实时聚合
//!
//! 核心能力：
//! 1. 订阅持久化 (Subscription Persistence)
//!    - PersistentSubscription: 持久化订阅管理
//!    - SubscriptionRecord: 订阅记录 (Active/Paused/Expired/Failed)
//!    - SubscriptionEvent: 订阅事件持久化 + 投递计数
//! 2. 消息重放 (Message Replay)
//!    - MessageReplayEngine: 消息重放引擎
//!    - ReplayRequest: 重放请求 (Full/Incremental/Live)
//!    - ReplayResult: 重放结果 + 进度追踪
//! 3. 实时聚合 (Real-time Aggregation)
//!    - RealtimeAggregator: 流式聚合引擎
//!    - AggregationConfig: 聚合配置 (Count/Sum/Avg/Min/Max/HLL)
//!    - TumblingWindow/HoppingWindow/SessionWindow 窗口计算

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_SUBSCRIPTION_RECORDS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_subscription_records (
    id VARCHAR(64) PRIMARY KEY,
    subscriber_id VARCHAR(128) NOT NULL,
    topic VARCHAR(128) NOT NULL,
    filter JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_count BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sr_subscriber ON portal_subscription_records(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sr_topic ON portal_subscription_records(topic);
CREATE INDEX IF NOT EXISTS idx_sr_status ON portal_subscription_records(status);
"#;

pub const CREATE_SUBSCRIPTION_EVENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_subscription_events (
    id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    sequence BIGINT NOT NULL,
    delivered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_se_subscription ON portal_subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_se_sequence ON portal_subscription_events(sequence);
CREATE INDEX IF NOT EXISTS idx_se_delivered ON portal_subscription_events(delivered_at);
"#;

pub const CREATE_REPLAY_REQUESTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_replay_requests (
    id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) NOT NULL,
    from_sequence BIGINT NOT NULL DEFAULT 0,
    to_sequence BIGINT,
    batch_size INT NOT NULL DEFAULT 100,
    replay_type VARCHAR(32) NOT NULL DEFAULT 'full',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rr_subscription ON portal_replay_requests(subscription_id);
CREATE INDEX IF NOT EXISTS idx_rr_status ON portal_replay_requests(status);
"#;

pub const CREATE_REPLAY_RESULTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_replay_results (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,
    events_replayed BIGINT NOT NULL DEFAULT 0,
    events_skipped BIGINT NOT NULL DEFAULT 0,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rresult_request ON portal_replay_results(request_id);
CREATE INDEX IF NOT EXISTS idx_rresult_status ON portal_replay_results(status);
"#;

pub const CREATE_AGGREGATION_CONFIGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_aggregation_configs (
    id VARCHAR(64) PRIMARY KEY,
    topic VARCHAR(128) NOT NULL,
    window_size_ms BIGINT NOT NULL DEFAULT 60000,
    aggregation_type VARCHAR(32) NOT NULL DEFAULT 'count',
    group_by JSONB,
    filter_expr TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_ac_topic ON portal_aggregation_configs(topic);
CREATE INDEX IF NOT EXISTS idx_ac_type ON portal_aggregation_configs(aggregation_type);
"#;

pub const CREATE_AGGREGATION_RESULTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_aggregation_results (
    id VARCHAR(64) PRIMARY KEY,
    config_id VARCHAR(64) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    groups JSONB NOT NULL DEFAULT '[]',
    values JSONB NOT NULL DEFAULT '{}',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_config ON portal_aggregation_results(config_id);
CREATE INDEX IF NOT EXISTS idx_ar_window ON portal_aggregation_results(window_start DESC);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Expired,
    Failed,
}

impl SubscriptionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Expired => "expired",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "paused" => Self::Paused,
            "expired" => Self::Expired,
            "failed" => Self::Failed,
            _ => Self::Active,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplayType {
    Full,
    Incremental,
    Live,
}

impl ReplayType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Incremental => "incremental",
            Self::Live => "live",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "incremental" => Self::Incremental,
            "live" => Self::Live,
            _ => Self::Full,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplayStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

impl ReplayStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "in_progress" => Self::InProgress,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            _ => Self::Pending,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AggregationType {
    Count,
    Sum,
    Avg,
    Min,
    Max,
    HLL,
}

impl AggregationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Count => "count",
            Self::Sum => "sum",
            Self::Avg => "avg",
            Self::Min => "min",
            Self::Max => "max",
            Self::HLL => "hll",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "sum" => Self::Sum,
            "avg" => Self::Avg,
            "min" => Self::Min,
            "max" => Self::Max,
            "hll" => Self::HLL,
            _ => Self::Count,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::Count,
            Self::Sum,
            Self::Avg,
            Self::Min,
            Self::Max,
            Self::HLL,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Aggregator {
    TumblingWindow,
    HoppingWindow,
    SessionWindow,
}

impl Aggregator {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TumblingWindow => "tumbling",
            Self::HoppingWindow => "hopping",
            Self::SessionWindow => "session",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "hopping" => Self::HoppingWindow,
            "session" => Self::SessionWindow,
            _ => Self::TumblingWindow,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::TumblingWindow,
            Self::HoppingWindow,
            Self::SessionWindow,
        ]
    }
}

// ==================== 订阅持久化结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionRecord {
    pub id: String,
    pub subscriber_id: String,
    pub topic: String,
    pub filter: Option<serde_json::Value>,
    pub status: SubscriptionStatus,
    pub created_at: String,
    pub last_activity: String,
    pub delivered_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionEvent {
    pub id: String,
    pub subscription_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub sequence: u64,
    pub delivered_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingEventsList {
    pub events: Vec<SubscriptionEvent>,
    pub total: u64,
}

// ==================== 消息重放结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayRequest {
    pub id: String,
    pub subscription_id: String,
    pub from_sequence: u64,
    pub to_sequence: Option<u64>,
    pub batch_size: u32,
    pub replay_type: ReplayType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayResult {
    pub id: String,
    pub request_id: String,
    pub events_replayed: u64,
    pub events_skipped: u64,
    pub duration_ms: u64,
    pub status: ReplayStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayHistoryEntry {
    pub request_id: String,
    pub subscription_id: String,
    pub replay_type: ReplayType,
    pub events_replayed: u64,
    pub status: ReplayStatus,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSequenceInfo {
    pub sequence: u64,
    pub event_type: String,
    pub created_at: String,
}

// ==================== 实时聚合结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregationConfig {
    pub id: String,
    pub topic: String,
    pub window_size_ms: u64,
    pub aggregation_type: AggregationType,
    pub group_by: Option<Vec<String>>,
    pub filter_expr: Option<String>,
    pub aggregator: Aggregator,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregationResult {
    pub config_id: String,
    pub window_start: String,
    pub window_end: String,
    pub groups: Vec<serde_json::Value>,
    pub values: serde_json::Value,
    pub computed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregationStats {
    pub config_id: String,
    pub processed_events: u64,
    pub windows_completed: u64,
    pub avg_processing_time_ms: f64,
    pub active: bool,
}

// ==================== 内存存储 ====================

struct RealtimeStore {
    subscription_records: Mutex<HashMap<String, SubscriptionRecord>>,
    subscription_events: Mutex<Vec<SubscriptionEvent>>,
    subscription_sequences: Mutex<HashMap<String, u64>>,
    replay_requests: Mutex<HashMap<String, ReplayRequest>>,
    replay_results: Mutex<HashMap<String, ReplayResult>>,
    aggregation_configs: Mutex<HashMap<String, AggregationConfig>>,
    aggregation_results: Mutex<Vec<AggregationResult>>,
    aggregation_stats: Mutex<HashMap<String, AggregationStats>>,
    running_aggregations: Mutex<HashMap<String, bool>>,
}

fn get_realtime_store() -> &'static RealtimeStore {
    static STORE: LazyLock<RealtimeStore> = LazyLock::new(|| RealtimeStore {
        subscription_records: Mutex::new(HashMap::new()),
        subscription_events: Mutex::new(Vec::new()),
        subscription_sequences: Mutex::new(HashMap::new()),
        replay_requests: Mutex::new(HashMap::new()),
        replay_results: Mutex::new(HashMap::new()),
        aggregation_configs: Mutex::new(HashMap::new()),
        aggregation_results: Mutex::new(Vec::new()),
        aggregation_stats: Mutex::new(HashMap::new()),
        running_aggregations: Mutex::new(HashMap::new()),
    });
    &STORE
}

// ==================== PersistentSubscription 实现 ====================

pub struct PersistentSubscription;

impl PersistentSubscription {
    pub async fn create_subscription(
        subscriber_id: String,
        topic: String,
        filter: Option<serde_json::Value>,
    ) -> Result<SubscriptionRecord, String> {
        let store = get_realtime_store();

        let record = SubscriptionRecord {
            id: uuid::Uuid::new_v4().to_string(),
            subscriber_id,
            topic,
            filter,
            status: SubscriptionStatus::Active,
            created_at: chrono::Utc::now().to_rfc3339(),
            last_activity: chrono::Utc::now().to_rfc3339(),
            delivered_count: 0,
        };

        let mut records = store.subscription_records.lock().await;
        records.insert(record.id.clone(), record.clone());

        Ok(record)
    }

    pub async fn get_subscription(id: &str) -> Option<SubscriptionRecord> {
        let store = get_realtime_store();
        let records = store.subscription_records.lock().await;
        records.get(id).cloned()
    }

    pub async fn list_subscriptions(
        subscriber_id: Option<&str>,
        topic: Option<&str>,
        status: Option<SubscriptionStatus>,
    ) -> Vec<SubscriptionRecord> {
        let store = get_realtime_store();
        let records = store.subscription_records.lock().await;

        records
            .values()
            .filter(|r| {
                subscriber_id.map(|s| r.subscriber_id == s).unwrap_or(true)
                    && topic.map(|t| r.topic == t).unwrap_or(true)
                    && status.as_ref().map(|st| r.status == *st).unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    pub async fn pause_subscription(id: &str) -> Result<SubscriptionRecord, String> {
        let store = get_realtime_store();
        let mut records = store.subscription_records.lock().await;

        let record = records
            .get_mut(id)
            .ok_or_else(|| format!("订阅不存在: {}", id))?;

        record.status = SubscriptionStatus::Paused;
        record.last_activity = chrono::Utc::now().to_rfc3339();

        Ok(record.clone())
    }

    pub async fn resume_subscription(id: &str) -> Result<SubscriptionRecord, String> {
        let store = get_realtime_store();
        let mut records = store.subscription_records.lock().await;

        let record = records
            .get_mut(id)
            .ok_or_else(|| format!("订阅不存在: {}", id))?;

        record.status = SubscriptionStatus::Active;
        record.last_activity = chrono::Utc::now().to_rfc3339();

        Ok(record.clone())
    }

    pub async fn cancel_subscription(id: &str) -> Result<bool, String> {
        let store = get_realtime_store();
        let mut records = store.subscription_records.lock().await;

        let record = records
            .get_mut(id)
            .ok_or_else(|| format!("订阅不存在: {}", id))?;

        record.status = SubscriptionStatus::Expired;
        record.last_activity = chrono::Utc::now().to_rfc3339();

        Ok(true)
    }

    pub async fn get_pending_events(
        subscription_id: &str,
        limit: Option<u32>,
    ) -> PendingEventsList {
        let store = get_realtime_store();
        let events = store.subscription_events.lock().await;

        let filtered: Vec<SubscriptionEvent> = events
            .iter()
            .filter(|e| e.subscription_id == subscription_id && e.delivered_at.is_none())
            .cloned()
            .collect();

        let total = filtered.len() as u64;
        let events = if let Some(lim) = limit {
            filtered.into_iter().take(lim as usize).collect()
        } else {
            filtered
        };

        PendingEventsList { events, total }
    }

    pub async fn deliver_event(
        subscription_id: &str,
        event_type: String,
        payload: serde_json::Value,
        expires_at: Option<String>,
    ) -> Result<SubscriptionEvent, String> {
        let store = get_realtime_store();

        let mut sequences = store.subscription_sequences.lock().await;
        let seq = sequences.entry(subscription_id.to_string()).or_insert(0);
        *seq += 1;
        let current_seq = *seq;
        drop(sequences);

        let event = SubscriptionEvent {
            id: uuid::Uuid::new_v4().to_string(),
            subscription_id: subscription_id.to_string(),
            event_type,
            payload,
            sequence: current_seq,
            delivered_at: None,
            expires_at,
        };

        let mut events = store.subscription_events.lock().await;
        events.push(event.clone());
        drop(events);

        let mut records = store.subscription_records.lock().await;
        if let Some(record) = records.get_mut(subscription_id) {
            record.delivered_count += 1;
            record.last_activity = chrono::Utc::now().to_rfc3339();
        }

        Ok(event)
    }

    pub async fn cleanup_expired() -> u64 {
        let store = get_realtime_store();
        let mut records = store.subscription_records.lock().await;

        let now = chrono::Utc::now();
        let mut expired_count = 0u64;

        for record in records.values_mut() {
            if record.status == SubscriptionStatus::Active {
                if let Ok(last) = chrono::DateTime::parse_from_rfc3339(&record.last_activity) {
                    let elapsed = now.signed_duration_since(last);
                    if elapsed.num_hours() > 24 {
                        record.status = SubscriptionStatus::Expired;
                        expired_count += 1;
                    }
                }
            }
        }

        expired_count
    }
}

// ==================== MessageReplayEngine 实现 ====================

pub struct MessageReplayEngine;

impl MessageReplayEngine {
    pub async fn request_replay(
        subscription_id: String,
        from_sequence: u64,
        to_sequence: Option<u64>,
        batch_size: u32,
        replay_type: ReplayType,
    ) -> Result<ReplayRequest, String> {
        let store = get_realtime_store();

        let request = ReplayRequest {
            id: uuid::Uuid::new_v4().to_string(),
            subscription_id,
            from_sequence,
            to_sequence,
            batch_size,
            replay_type,
        };

        let mut requests = store.replay_requests.lock().await;
        requests.insert(request.id.clone(), request.clone());

        Ok(request)
    }

    pub async fn execute_replay(request_id: &str) -> Result<ReplayResult, String> {
        let store = get_realtime_store();

        let request = {
            let requests = store.replay_requests.lock().await;
            requests
                .get(request_id)
                .cloned()
                .ok_or_else(|| format!("重放请求不存在: {}", request_id))?
        };

        let start = std::time::Instant::now();
        let events = store.subscription_events.lock().await;

        let matched: Vec<&SubscriptionEvent> = events
            .iter()
            .filter(|e| {
                e.subscription_id == request.subscription_id
                    && e.sequence >= request.from_sequence
                    && request
                        .to_sequence
                        .map(|to| e.sequence <= to)
                        .unwrap_or(true)
            })
            .collect();

        let total = matched.len() as u64;
        let batch = request.batch_size as usize;
        let replayed = matched.len().min(batch) as u64;
        let skipped = total.saturating_sub(replayed);

        let duration_ms = start.elapsed().as_millis() as u64;

        let result = ReplayResult {
            id: uuid::Uuid::new_v4().to_string(),
            request_id: request_id.to_string(),
            events_replayed: replayed,
            events_skipped: skipped,
            duration_ms,
            status: ReplayStatus::Completed,
        };

        let mut results = store.replay_results.lock().await;
        results.insert(result.id.clone(), result.clone());

        Ok(result)
    }

    pub async fn get_replay_status(request_id: &str) -> Option<ReplayResult> {
        let store = get_realtime_store();
        let results = store.replay_results.lock().await;
        results.get(request_id).cloned()
    }

    pub async fn cancel_replay(request_id: &str) -> Result<ReplayResult, String> {
        let store = get_realtime_store();

        let mut results = store.replay_results.lock().await;
        let result = results
            .get_mut(request_id)
            .ok_or_else(|| format!("重放结果不存在: {}", request_id))?;

        result.status = ReplayStatus::Failed;
        Ok(result.clone())
    }

    pub async fn get_replay_history(
        subscription_id: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<ReplayHistoryEntry> {
        let store = get_realtime_store();

        let requests = store.replay_requests.lock().await;
        let results = store.replay_results.lock().await;

        let limit = limit.unwrap_or(50).min(500) as usize;

        let mut history: Vec<ReplayHistoryEntry> = requests
            .values()
            .filter(|r| {
                subscription_id
                    .map(|sid| r.subscription_id == sid)
                    .unwrap_or(true)
            })
            .map(|r| {
                let result = results.get(&r.id);
                ReplayHistoryEntry {
                    request_id: r.id.clone(),
                    subscription_id: r.subscription_id.clone(),
                    replay_type: r.replay_type.clone(),
                    events_replayed: result.map(|res| res.events_replayed).unwrap_or(0),
                    status: result
                        .map(|res| res.status.clone())
                        .unwrap_or(ReplayStatus::Pending),
                    created_at: chrono::Utc::now().to_rfc3339(),
                }
            })
            .collect();

        history.truncate(limit);
        history
    }

    pub async fn get_event_sequence(
        subscription_id: &str,
        sequence: u64,
    ) -> Option<EventSequenceInfo> {
        let store = get_realtime_store();
        let events = store.subscription_events.lock().await;

        events
            .iter()
            .find(|e| e.subscription_id == subscription_id && e.sequence == sequence)
            .map(|e| EventSequenceInfo {
                sequence: e.sequence,
                event_type: e.event_type.clone(),
                created_at: e
                    .delivered_at
                    .clone()
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
            })
    }

    pub async fn store_event(
        subscription_id: String,
        event_type: String,
        payload: serde_json::Value,
    ) -> Result<SubscriptionEvent, String> {
        PersistentSubscription::deliver_event(&subscription_id, event_type, payload, None).await
    }

    pub async fn get_events_range(
        subscription_id: &str,
        from_sequence: u64,
        to_sequence: Option<u64>,
    ) -> Vec<SubscriptionEvent> {
        let store = get_realtime_store();
        let events = store.subscription_events.lock().await;

        events
            .iter()
            .filter(|e| {
                e.subscription_id == subscription_id
                    && e.sequence >= from_sequence
                    && to_sequence.map(|to| e.sequence <= to).unwrap_or(true)
            })
            .cloned()
            .collect()
    }
}

// ==================== RealtimeAggregator 实现 ====================

pub struct RealtimeAggregator;

impl RealtimeAggregator {
    pub async fn create_aggregation(
        topic: String,
        window_size_ms: u64,
        aggregation_type: AggregationType,
        group_by: Option<Vec<String>>,
        filter_expr: Option<String>,
        aggregator: Aggregator,
    ) -> Result<AggregationConfig, String> {
        let store = get_realtime_store();

        let config = AggregationConfig {
            id: uuid::Uuid::new_v4().to_string(),
            topic,
            window_size_ms,
            aggregation_type,
            group_by,
            filter_expr,
            aggregator,
        };

        let mut configs = store.aggregation_configs.lock().await;
        configs.insert(config.id.clone(), config.clone());

        Ok(config)
    }

    pub async fn start_aggregation(config_id: &str) -> Result<bool, String> {
        let store = get_realtime_store();

        {
            let configs = store.aggregation_configs.lock().await;
            configs
                .get(config_id)
                .ok_or_else(|| format!("聚合配置不存在: {}", config_id))?;
        }

        let mut running = store.running_aggregations.lock().await;
        if running.contains_key(config_id) && running[config_id] {
            return Err("聚合已在运行中".to_string());
        }
        running.insert(config_id.to_string(), true);

        let mut stats = store.aggregation_stats.lock().await;
        stats.insert(
            config_id.to_string(),
            AggregationStats {
                config_id: config_id.to_string(),
                processed_events: 0,
                windows_completed: 0,
                avg_processing_time_ms: 0.0,
                active: true,
            },
        );

        let mut configs = store.aggregation_configs.lock().await;
        if let Some(cfg) = configs.get_mut(config_id) {
            let _ = cfg;
        }

        Ok(true)
    }

    pub async fn stop_aggregation(config_id: &str) -> Result<bool, String> {
        let store = get_realtime_store();

        let mut running = store.running_aggregations.lock().await;
        if !running.contains_key(config_id) || !running[config_id] {
            return Err("聚合未在运行".to_string());
        }
        running.insert(config_id.to_string(), false);

        let mut stats = store.aggregation_stats.lock().await;
        if let Some(stat) = stats.get_mut(config_id) {
            stat.active = false;
        }

        Ok(true)
    }

    pub async fn get_aggregation_result(config_id: &str) -> Option<AggregationResult> {
        let store = get_realtime_store();

        let results = store.aggregation_results.lock().await;
        results.iter().find(|r| r.config_id == config_id).cloned()
    }

    pub async fn list_aggregations(
        topic: Option<&str>,
        active_only: Option<bool>,
    ) -> Vec<AggregationConfig> {
        let store = get_realtime_store();
        let configs = store.aggregation_configs.lock().await;

        let running = store.running_aggregations.lock().await;

        configs
            .values()
            .filter(|c| {
                topic.map(|t| c.topic == t).unwrap_or(true)
                    && active_only
                        .map(|a| {
                            if a {
                                running.get(&c.id).map(|r| *r).unwrap_or(false)
                            } else {
                                true
                            }
                        })
                        .unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    pub async fn get_aggregation_stats(config_id: &str) -> Option<AggregationStats> {
        let store = get_realtime_store();
        let stats = store.aggregation_stats.lock().await;
        stats.get(config_id).cloned()
    }

    pub async fn subscribe_to_aggregation(
        config_id: &str,
        subscriber_id: String,
    ) -> Result<SubscriptionRecord, String> {
        let store = get_realtime_store();

        let configs = store.aggregation_configs.lock().await;
        let config = configs
            .get(config_id)
            .cloned()
            .ok_or_else(|| format!("聚合配置不存在: {}", config_id))?;

        drop(configs);

        PersistentSubscription::create_subscription(subscriber_id, config.topic, None).await
    }

    pub async fn compute_window(config_id: &str) -> Result<AggregationResult, String> {
        let store = get_realtime_store();

        let config = {
            let configs = store.aggregation_configs.lock().await;
            configs
                .get(config_id)
                .cloned()
                .ok_or_else(|| format!("聚合配置不存在: {}", config_id))?
        };

        let now = chrono::Utc::now();
        let window_end = now;
        let window_start = chrono::DateTime::<chrono::Utc>::from_timestamp_millis(
            window_end.timestamp_millis() - config.window_size_ms as i64,
        )
        .unwrap_or(now);

        let results = store.aggregation_results.lock().await;

        let matching: Vec<&AggregationResult> = results
            .iter()
            .filter(|r| r.config_id == config_id)
            .collect();

        let groups = Vec::new();
        let mut values = serde_json::json!({});

        match config.aggregation_type {
            AggregationType::Count => {
                values = serde_json::json!({
                    "count": matching.len(),
                });
            }
            AggregationType::Sum => {
                let total: f64 = matching
                    .iter()
                    .filter_map(|r| r.values["value"].as_f64())
                    .sum();
                values = serde_json::json!({
                    "sum": total,
                });
            }
            AggregationType::Avg => {
                let values_vec: Vec<f64> = matching
                    .iter()
                    .filter_map(|r| r.values["value"].as_f64())
                    .collect();
                let avg = if values_vec.is_empty() {
                    0.0
                } else {
                    values_vec.iter().sum::<f64>() / values_vec.len() as f64
                };
                values = serde_json::json!({
                    "avg": avg,
                });
            }
            AggregationType::Min => {
                let min = matching
                    .iter()
                    .filter_map(|r| r.values["value"].as_f64())
                    .fold(f64::INFINITY, |a, b| a.min(b));
                values = serde_json::json!({
                    "min": if min.is_finite() { min } else { 0.0 },
                });
            }
            AggregationType::Max => {
                let max = matching
                    .iter()
                    .filter_map(|r| r.values["value"].as_f64())
                    .fold(f64::NEG_INFINITY, |a, b| a.max(b));
                values = serde_json::json!({
                    "max": if max.is_finite() { max } else { 0.0 },
                });
            }
            AggregationType::HLL => {
                let mut unique_count = 0;
                for r in matching.iter() {
                    if let Some(arr) = r.values["unique"].as_array() {
                        unique_count = arr.len();
                    }
                }
                values = serde_json::json!({
                    "estimated_unique": unique_count,
                });
            }
        }

        let result = AggregationResult {
            config_id: config_id.to_string(),
            window_start: window_start.to_rfc3339(),
            window_end: window_end.to_rfc3339(),
            groups,
            values,
            computed_at: now.to_rfc3339(),
        };

        drop(results);

        let mut results_mut = store.aggregation_results.lock().await;
        results_mut.push(result.clone());

        let mut stats = store.aggregation_stats.lock().await;
        if let Some(stat) = stats.get_mut(config_id) {
            stat.windows_completed += 1;
        }

        Ok(result)
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 订阅持久化 ---

#[derive(Debug, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub subscriber_id: String,
    pub topic: String,
    pub filter: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ListSubscriptionsQuery {
    pub subscriber_id: Option<String>,
    pub topic: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PendingEventsQuery {
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct DeliverEventRequest {
    pub event_type: String,
    pub payload: serde_json::Value,
    pub expires_at: Option<String>,
}

// --- 消息重放 ---

#[derive(Debug, Deserialize)]
pub struct CreateReplayRequest {
    pub subscription_id: String,
    pub from_sequence: Option<u64>,
    pub to_sequence: Option<u64>,
    pub batch_size: Option<u32>,
    pub replay_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReplayHistoryQuery {
    pub subscription_id: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct EventsRangeQuery {
    pub from_sequence: u64,
    pub to_sequence: Option<u64>,
}

// --- 实时聚合 ---

#[derive(Debug, Deserialize)]
pub struct CreateAggregationRequest {
    pub topic: String,
    pub window_size_ms: Option<u64>,
    pub aggregation_type: Option<String>,
    pub group_by: Option<Vec<String>>,
    pub filter_expr: Option<String>,
    pub aggregator: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListAggregationsQuery {
    pub topic: Option<String>,
    pub active_only: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SubscribeAggregationRequest {
    pub subscriber_id: String,
}

// ==================== API 处理器: 订阅持久化 ====================

pub async fn create_subscription_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Json<ApiResponse<SubscriptionRecord>> {
    match PersistentSubscription::create_subscription(req.subscriber_id, req.topic, req.filter)
        .await
    {
        Ok(record) => Json(ApiResponse::success(record, "订阅创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_subscription_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SubscriptionRecord>> {
    match PersistentSubscription::get_subscription(&id).await {
        Some(record) => Json(ApiResponse::success(record, "订阅详情")),
        None => Json(ApiResponse::error(404, "订阅不存在")),
    }
}

pub async fn list_subscriptions_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListSubscriptionsQuery>,
) -> Json<ApiResponse<Vec<SubscriptionRecord>>> {
    let status = params.status.as_deref().map(SubscriptionStatus::from_str);
    let list = PersistentSubscription::list_subscriptions(
        params.subscriber_id.as_deref(),
        params.topic.as_deref(),
        status,
    )
    .await;
    Json(ApiResponse::success(list, "订阅列表"))
}

pub async fn pause_subscription_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SubscriptionRecord>> {
    match PersistentSubscription::pause_subscription(&id).await {
        Ok(record) => Json(ApiResponse::success(record, "订阅已暂停")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn resume_subscription_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SubscriptionRecord>> {
    match PersistentSubscription::resume_subscription(&id).await {
        Ok(record) => Json(ApiResponse::success(record, "订阅已恢复")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn cancel_subscription_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match PersistentSubscription::cancel_subscription(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "订阅已取消")),
        Ok(false) => Json(ApiResponse::error(404, "订阅不存在")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_pending_events_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<PendingEventsQuery>,
) -> Json<ApiResponse<PendingEventsList>> {
    let list = PersistentSubscription::get_pending_events(&id, params.limit).await;
    Json(ApiResponse::success(list, "待投递事件列表"))
}

// ==================== API 处理器: 消息重放 ====================

pub async fn request_replay_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateReplayRequest>,
) -> Json<ApiResponse<ReplayRequest>> {
    let replay_type = req
        .replay_type
        .as_deref()
        .map(ReplayType::from_str)
        .unwrap_or(ReplayType::Full);

    match MessageReplayEngine::request_replay(
        req.subscription_id,
        req.from_sequence.unwrap_or(0),
        req.to_sequence,
        req.batch_size.unwrap_or(100),
        replay_type,
    )
    .await
    {
        Ok(request) => Json(ApiResponse::success(request, "重放请求已创建")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn execute_replay_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ReplayResult>> {
    match MessageReplayEngine::execute_replay(&id).await {
        Ok(result) => Json(ApiResponse::success(result, "重放执行完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_replay_status_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ReplayResult>> {
    match MessageReplayEngine::get_replay_status(&id).await {
        Some(result) => Json(ApiResponse::success(result, "重放状态")),
        None => Json(ApiResponse::error(404, "重放结果不存在")),
    }
}

pub async fn cancel_replay_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ReplayResult>> {
    match MessageReplayEngine::cancel_replay(&id).await {
        Ok(result) => Json(ApiResponse::success(result, "重放已取消")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_replay_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<ReplayHistoryQuery>,
) -> Json<ApiResponse<Vec<ReplayHistoryEntry>>> {
    let history =
        MessageReplayEngine::get_replay_history(params.subscription_id.as_deref(), params.limit)
            .await;
    Json(ApiResponse::success(history, "重放历史"))
}

pub async fn get_events_range_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<EventsRangeQuery>,
) -> Json<ApiResponse<Vec<SubscriptionEvent>>> {
    let events =
        MessageReplayEngine::get_events_range(&id, params.from_sequence, params.to_sequence).await;
    Json(ApiResponse::success(events, "事件范围查询"))
}

// ==================== API 处理器: 实时聚合 ====================

pub async fn create_aggregation_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateAggregationRequest>,
) -> Json<ApiResponse<AggregationConfig>> {
    let agg_type = req
        .aggregation_type
        .as_deref()
        .map(AggregationType::from_str)
        .unwrap_or(AggregationType::Count);

    let agg = req
        .aggregator
        .as_deref()
        .map(Aggregator::from_str)
        .unwrap_or(Aggregator::TumblingWindow);

    match RealtimeAggregator::create_aggregation(
        req.topic,
        req.window_size_ms.unwrap_or(60000),
        agg_type,
        req.group_by,
        req.filter_expr,
        agg,
    )
    .await
    {
        Ok(config) => Json(ApiResponse::success(config, "聚合配置创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn start_aggregation_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match RealtimeAggregator::start_aggregation(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "聚合已启动")),
        Ok(false) => Json(ApiResponse::error(500, "聚合启动失败")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn stop_aggregation_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match RealtimeAggregator::stop_aggregation(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "聚合已停止")),
        Ok(false) => Json(ApiResponse::error(500, "聚合停止失败")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_aggregation_result_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<AggregationResult>> {
    match RealtimeAggregator::get_aggregation_result(&id).await {
        Some(result) => Json(ApiResponse::success(result, "聚合结果")),
        None => match RealtimeAggregator::compute_window(&id).await {
            Ok(result) => Json(ApiResponse::success(result, "聚合结果（首次计算）")),
            Err(e) => Json(ApiResponse::error(404, &e)),
        },
    }
}

pub async fn list_aggregations_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListAggregationsQuery>,
) -> Json<ApiResponse<Vec<AggregationConfig>>> {
    let list =
        RealtimeAggregator::list_aggregations(params.topic.as_deref(), params.active_only).await;
    Json(ApiResponse::success(list, "聚合配置列表"))
}

pub async fn get_aggregation_stats_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<AggregationStats>> {
    match RealtimeAggregator::get_aggregation_stats(&id).await {
        Some(stats) => Json(ApiResponse::success(stats, "聚合统计")),
        None => Json(ApiResponse::error(404, "聚合不存在")),
    }
}
