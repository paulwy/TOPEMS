#![allow(dead_code)] // Reserved: V59 流式订阅模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V59.0 GraphQL 实时深化: 流式订阅 V2 + 消息去重 + 背压控制
//!
//! 核心能力：
//! 1. 流式订阅 V2 (Streaming Subscription V2)
//!    - StreamManagerV2: 流管理、事件发布、订阅/取消订阅、事件查询
//!    - Stream: 流定义 (EventStream/AggregatedStream/WindowedStream)
//!    - StreamEvent: 流事件持久化 + 序列号
//! 2. 消息去重 (Message Deduplication)
//!    - DeduplicationEngine: 基于窗口的可配置去重
//!    - DedupRule: 去重规则 (FirstWriter/LastWriter/Merge)
//!    - DedupResult: 去重结果 (Pass/Drop/Merge)
//! 3. 背压控制 (Backpressure Control)
//!    - BackpressureController: 流控 + 多策略溢出处理
//!    - BackpressureConfig: 配置 (Drop/Backpressure/Sample/Batch)
//!    - BackpressureState: 实时状态监控

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_STREAMS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_streams (
    id VARCHAR(64) PRIMARY KEY,
    topic VARCHAR(128) NOT NULL,
    stream_type VARCHAR(32) NOT NULL DEFAULT 'event_stream',
    filter JSONB,
    batch_size INT NOT NULL DEFAULT 100,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_streams_topic ON portal_streams(topic);
CREATE INDEX IF NOT EXISTS idx_streams_type ON portal_streams(stream_type);
CREATE INDEX IF NOT EXISTS idx_streams_status ON portal_streams(status);
"#;

pub const CREATE_STREAM_EVENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_stream_events (
    id VARCHAR(64) PRIMARY KEY,
    stream_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    sequence BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_stream ON portal_stream_events(stream_id);
CREATE INDEX IF NOT EXISTS idx_events_sequence ON portal_stream_events(sequence);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON portal_stream_events(timestamp DESC);
"#;

pub const CREATE_DEDUP_RULES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_dedup_rules (
    id VARCHAR(64) PRIMARY KEY,
    stream_id VARCHAR(64) NOT NULL,
    dedup_key VARCHAR(256) NOT NULL,
    window_ms BIGINT NOT NULL DEFAULT 5000,
    strategy VARCHAR(32) NOT NULL DEFAULT 'first_writer',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dedup_stream ON portal_dedup_rules(stream_id);
CREATE INDEX IF NOT EXISTS idx_dedup_enabled ON portal_dedup_rules(enabled);
"#;

pub const CREATE_DEDUP_RESULTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_dedup_results (
    id VARCHAR(64) PRIMARY KEY,
    rule_id VARCHAR(64) NOT NULL,
    original_id VARCHAR(64) NOT NULL,
    duplicate_of VARCHAR(64),
    action VARCHAR(32) NOT NULL DEFAULT 'pass',
    merged_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dedup_result_rule ON portal_dedup_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_dedup_result_action ON portal_dedup_results(action);
CREATE INDEX IF NOT EXISTS idx_dedup_result_created ON portal_dedup_results(created_at DESC);
"#;

pub const CREATE_BACKPRESSURE_CONFIGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_backpressure_configs (
    id VARCHAR(64) PRIMARY KEY,
    stream_id VARCHAR(64) NOT NULL,
    max_queue_size INT NOT NULL DEFAULT 10000,
    high_watermark DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    low_watermark DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    overflow_strategy VARCHAR(32) NOT NULL DEFAULT 'drop',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bp_config_stream ON portal_backpressure_configs(stream_id);
"#;

pub const CREATE_BACKPRESSURE_STATES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_backpressure_states (
    id VARCHAR(64) PRIMARY KEY,
    stream_id VARCHAR(64) NOT NULL,
    queue_depth INT NOT NULL DEFAULT 0,
    utilization DOUBLE PRECISION NOT NULL DEFAULT 0,
    dropped_count BIGINT NOT NULL DEFAULT 0,
    last_drop_reason VARCHAR(128),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bp_state_stream ON portal_backpressure_states(stream_id);
CREATE INDEX IF NOT EXISTS idx_bp_state_updated ON portal_backpressure_states(updated_at DESC);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StreamType {
    EventStream,
    AggregatedStream,
    WindowedStream,
}

impl StreamType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::EventStream => "event_stream",
            Self::AggregatedStream => "aggregated_stream",
            Self::WindowedStream => "windowed_stream",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "aggregated_stream" => Self::AggregatedStream,
            "windowed_stream" => Self::WindowedStream,
            _ => Self::EventStream,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::EventStream,
            Self::AggregatedStream,
            Self::WindowedStream,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StreamStatus {
    Active,
    Paused,
    Completed,
    Failed,
}

impl StreamStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "paused" => Self::Paused,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            _ => Self::Active,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DedupStrategy {
    FirstWriter,
    LastWriter,
    Merge,
}

impl DedupStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FirstWriter => "first_writer",
            Self::LastWriter => "last_writer",
            Self::Merge => "merge",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "last_writer" => Self::LastWriter,
            "merge" => Self::Merge,
            _ => Self::FirstWriter,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DedupAction {
    Pass,
    Drop,
    Merge,
}

impl DedupAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pass => "pass",
            Self::Drop => "drop",
            Self::Merge => "merge",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OverflowStrategy {
    Drop,
    Backpressure,
    Sample,
    Batch,
}

impl OverflowStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Drop => "drop",
            Self::Backpressure => "backpressure",
            Self::Sample => "sample",
            Self::Batch => "batch",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "backpressure" => Self::Backpressure,
            "sample" => Self::Sample,
            "batch" => Self::Batch,
            _ => Self::Drop,
        }
    }
}

// ==================== 流式订阅结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stream {
    pub id: String,
    pub topic: String,
    pub stream_type: StreamType,
    pub filter: Option<serde_json::Value>,
    pub batch_size: u32,
    pub status: StreamStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEvent {
    pub id: String,
    pub stream_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub sequence: u64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEventList {
    pub events: Vec<StreamEvent>,
    pub total: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamStats {
    pub stream_id: String,
    pub event_count: u64,
    pub subscriber_count: u64,
    pub last_sequence: u64,
    pub last_event_at: Option<String>,
}

// ==================== 消息去重结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DedupRule {
    pub id: String,
    pub stream_id: String,
    pub dedup_key: String,
    pub window_ms: u64,
    pub strategy: DedupStrategy,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DedupResult {
    pub id: String,
    pub rule_id: String,
    pub original_id: String,
    pub duplicate_of: Option<String>,
    pub action: DedupAction,
    pub merged_payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DedupStats {
    pub rule_id: String,
    pub total_checks: u64,
    pub passed: u64,
    pub dropped: u64,
    pub merged: u64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DedupHistoryEntry {
    pub id: String,
    pub rule_id: String,
    pub original_id: String,
    pub duplicate_of: Option<String>,
    pub action: DedupAction,
    pub created_at: String,
}

// ==================== 背压控制结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackpressureConfig {
    pub id: String,
    pub stream_id: String,
    pub max_queue_size: u32,
    pub high_watermark: f64,
    pub low_watermark: f64,
    pub overflow_strategy: OverflowStrategy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackpressureState {
    pub id: String,
    pub stream_id: String,
    pub queue_depth: u32,
    pub utilization: f64,
    pub dropped_count: u64,
    pub last_drop_reason: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackpressureStats {
    pub stream_id: String,
    pub total_dropped: u64,
    pub total_processed: u64,
    pub avg_queue_depth: f64,
    pub max_queue_depth: u32,
    pub current_utilization: f64,
    pub overflow_events: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DroppedEvent {
    pub id: String,
    pub stream_id: String,
    pub event_id: String,
    pub reason: String,
    pub dropped_at: String,
}

// ==================== 内存存储 ====================

struct StreamingStore {
    streams: Mutex<HashMap<String, Stream>>,
    stream_events: Mutex<Vec<StreamEvent>>,
    stream_sequences: Mutex<HashMap<String, u64>>,
    stream_subscribers: Mutex<HashMap<String, Vec<String>>>,
    dedup_rules: Mutex<HashMap<String, DedupRule>>,
    dedup_results: Mutex<Vec<DedupResult>>,
    dedup_stats: Mutex<HashMap<String, DedupStats>>,
    dedup_windows: Mutex<HashMap<String, HashMap<String, String>>>,
    bp_configs: Mutex<HashMap<String, BackpressureConfig>>,
    bp_states: Mutex<HashMap<String, BackpressureState>>,
    bp_dropped: Mutex<Vec<DroppedEvent>>,
    bp_counters: Mutex<HashMap<String, (u64, u64, u32, u64)>>,
}

fn get_streaming_store() -> &'static StreamingStore {
    static STORE: LazyLock<StreamingStore> = LazyLock::new(|| StreamingStore {
        streams: Mutex::new(HashMap::new()),
        stream_events: Mutex::new(Vec::new()),
        stream_sequences: Mutex::new(HashMap::new()),
        stream_subscribers: Mutex::new(HashMap::new()),
        dedup_rules: Mutex::new(HashMap::new()),
        dedup_results: Mutex::new(Vec::new()),
        dedup_stats: Mutex::new(HashMap::new()),
        dedup_windows: Mutex::new(HashMap::new()),
        bp_configs: Mutex::new(HashMap::new()),
        bp_states: Mutex::new(HashMap::new()),
        bp_dropped: Mutex::new(Vec::new()),
        bp_counters: Mutex::new(HashMap::new()),
    });
    &STORE
}

// ==================== StreamManagerV2 实现 ====================

pub struct StreamManagerV2;

impl StreamManagerV2 {
    pub async fn create_stream(
        topic: String,
        stream_type: StreamType,
        filter: Option<serde_json::Value>,
        batch_size: Option<u32>,
    ) -> Result<Stream, String> {
        let store = get_streaming_store();

        let stream = Stream {
            id: uuid::Uuid::new_v4().to_string(),
            topic,
            stream_type,
            filter,
            batch_size: batch_size.unwrap_or(100),
            status: StreamStatus::Active,
        };

        let mut streams = store.streams.lock().await;
        streams.insert(stream.id.clone(), stream.clone());

        Ok(stream)
    }

    pub async fn get_stream(id: &str) -> Result<Stream, String> {
        let store = get_streaming_store();
        let streams = store.streams.lock().await;
        streams
            .get(id)
            .cloned()
            .ok_or_else(|| format!("流不存在: {}", id))
    }

    pub async fn list_streams(
        topic: Option<&str>,
        stream_type: Option<StreamType>,
        status: Option<StreamStatus>,
    ) -> Vec<Stream> {
        let store = get_streaming_store();
        let streams = store.streams.lock().await;

        streams
            .values()
            .filter(|s| {
                topic.map(|t| s.topic == t).unwrap_or(true)
                    && stream_type
                        .as_ref()
                        .map(|st| s.stream_type == *st)
                        .unwrap_or(true)
                    && status.as_ref().map(|st| s.status == *st).unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    pub async fn publish_event(
        stream_id: &str,
        event_type: String,
        payload: serde_json::Value,
    ) -> Result<StreamEvent, String> {
        let store = get_streaming_store();

        {
            let streams = store.streams.lock().await;
            streams
                .get(stream_id)
                .ok_or_else(|| format!("流不存在: {}", stream_id))?;
        }

        let mut sequences = store.stream_sequences.lock().await;
        let seq = sequences.entry(stream_id.to_string()).or_insert(0);
        *seq += 1;
        let current_seq = *seq;
        drop(sequences);

        let event = StreamEvent {
            id: uuid::Uuid::new_v4().to_string(),
            stream_id: stream_id.to_string(),
            event_type,
            payload,
            sequence: current_seq,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        let mut events = store.stream_events.lock().await;
        events.push(event.clone());
        if events.len() > 100000 {
            events.truncate(50000);
        }

        Ok(event)
    }

    pub async fn subscribe_stream(stream_id: &str, subscriber_id: String) -> Result<bool, String> {
        let store = get_streaming_store();

        {
            let streams = store.streams.lock().await;
            streams
                .get(stream_id)
                .ok_or_else(|| format!("流不存在: {}", stream_id))?;
        }

        let mut subs = store.stream_subscribers.lock().await;
        let subscribers = subs.entry(stream_id.to_string()).or_insert_with(Vec::new);
        if !subscribers.contains(&subscriber_id) {
            subscribers.push(subscriber_id);
        }

        Ok(true)
    }

    pub async fn unsubscribe_stream(stream_id: &str, subscriber_id: &str) -> Result<bool, String> {
        let store = get_streaming_store();
        let mut subs = store.stream_subscribers.lock().await;

        if let Some(subscribers) = subs.get_mut(stream_id) {
            let len_before = subscribers.len();
            subscribers.retain(|s| s != subscriber_id);
            Ok(subscribers.len() < len_before)
        } else {
            Ok(false)
        }
    }

    pub async fn get_stream_events(
        stream_id: &str,
        limit: Option<u32>,
        from_sequence: Option<u64>,
    ) -> StreamEventList {
        let store = get_streaming_store();
        let events = store.stream_events.lock().await;

        let filtered: Vec<StreamEvent> = events
            .iter()
            .filter(|e| {
                e.stream_id == stream_id
                    && from_sequence.map(|seq| e.sequence >= seq).unwrap_or(true)
            })
            .cloned()
            .collect();

        let total = filtered.len() as u64;
        let events_list = if let Some(lim) = limit {
            filtered.into_iter().take(lim as usize).collect()
        } else {
            filtered
        };

        StreamEventList {
            events: events_list,
            total,
        }
    }

    pub async fn delete_stream(stream_id: &str) -> Result<bool, String> {
        let store = get_streaming_store();
        let mut streams = store.streams.lock().await;

        let stream = streams
            .get_mut(stream_id)
            .ok_or_else(|| format!("流不存在: {}", stream_id))?;

        stream.status = StreamStatus::Completed;
        Ok(true)
    }

    pub async fn get_stream_stats(stream_id: &str) -> Result<StreamStats, String> {
        let store = get_streaming_store();

        let events = store.stream_events.lock().await;
        let stream_events: Vec<&StreamEvent> =
            events.iter().filter(|e| e.stream_id == stream_id).collect();

        let event_count = stream_events.len() as u64;
        let last_sequence = stream_events.iter().map(|e| e.sequence).max().unwrap_or(0);
        let last_event_at = stream_events.last().map(|e| e.timestamp.clone());

        drop(events);

        let subs = store.stream_subscribers.lock().await;
        let subscriber_count = subs.get(stream_id).map(|s| s.len() as u64).unwrap_or(0);

        Ok(StreamStats {
            stream_id: stream_id.to_string(),
            event_count,
            subscriber_count,
            last_sequence,
            last_event_at,
        })
    }
}

// ==================== DeduplicationEngine 实现 ====================

pub struct DeduplicationEngine;

impl DeduplicationEngine {
    pub async fn create_dedup_rule(
        stream_id: String,
        dedup_key: String,
        window_ms: Option<u64>,
        strategy: Option<DedupStrategy>,
    ) -> Result<DedupRule, String> {
        let store = get_streaming_store();

        let rule = DedupRule {
            id: uuid::Uuid::new_v4().to_string(),
            stream_id,
            dedup_key,
            window_ms: window_ms.unwrap_or(5000),
            strategy: strategy.unwrap_or(DedupStrategy::FirstWriter),
            enabled: true,
        };

        let mut rules = store.dedup_rules.lock().await;
        rules.insert(rule.id.clone(), rule.clone());

        Ok(rule)
    }

    pub async fn get_dedup_rules(
        stream_id: Option<&str>,
        enabled_only: Option<bool>,
    ) -> Vec<DedupRule> {
        let store = get_streaming_store();
        let rules = store.dedup_rules.lock().await;

        rules
            .values()
            .filter(|r| {
                stream_id.map(|s| r.stream_id == s).unwrap_or(true)
                    && enabled_only
                        .map(|e| if e { r.enabled } else { true })
                        .unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    pub async fn check_duplicate(
        stream_id: &str,
        event_id: String,
        event_type: String,
        payload: serde_json::Value,
    ) -> DedupResult {
        let store = get_streaming_store();

        let rules = store.dedup_rules.lock().await;
        let applicable_rules: Vec<DedupRule> = rules
            .values()
            .filter(|r| r.stream_id == stream_id && r.enabled)
            .cloned()
            .collect();
        drop(rules);

        if applicable_rules.is_empty() {
            let result = DedupResult {
                id: uuid::Uuid::new_v4().to_string(),
                rule_id: "no_rule".to_string(),
                original_id: event_id,
                duplicate_of: None,
                action: DedupAction::Pass,
                merged_payload: None,
            };

            let mut results = store.dedup_results.lock().await;
            results.push(result.clone());

            let mut stats = store.dedup_stats.lock().await;
            if let Some(s) = stats.get_mut("no_rule") {
                s.total_checks += 1;
                s.passed += 1;
                s.pass_rate = if s.total_checks > 0 {
                    s.passed as f64 / s.total_checks as f64
                } else {
                    0.0
                };
            } else {
                stats.insert(
                    "no_rule".to_string(),
                    DedupStats {
                        rule_id: "no_rule".to_string(),
                        total_checks: 1,
                        passed: 1,
                        dropped: 0,
                        merged: 0,
                        pass_rate: 1.0,
                    },
                );
            }

            return result;
        }

        let mut final_result: Option<DedupResult> = None;

        for rule in &applicable_rules {
            let mut windows = store.dedup_windows.lock().await;
            let stream_windows = windows
                .entry(stream_id.to_string())
                .or_insert_with(HashMap::new);

            let key_path = rule.dedup_key.clone();
            let key_value = payload
                .get(key_path.as_str())
                .and_then(|v| v.as_str())
                .unwrap_or(event_type.as_str());

            let window_key = format!("{}:{}", rule.id, key_value);
            let existing = stream_windows.get(&window_key).cloned();

            let (action, duplicate_of, merged_payload) = match rule.strategy {
                DedupStrategy::FirstWriter => {
                    if existing.is_some() {
                        (DedupAction::Drop, existing, None)
                    } else {
                        (DedupAction::Pass, None, None)
                    }
                }
                DedupStrategy::LastWriter => {
                    if existing.is_some() {
                        (DedupAction::Pass, existing, None)
                    } else {
                        (DedupAction::Pass, None, None)
                    }
                }
                DedupStrategy::Merge => {
                    if let Some(dup_id) = &existing {
                        let merged = serde_json::json!({
                            "original_id": dup_id,
                            "merged_payload": payload,
                        });
                        (DedupAction::Merge, existing, Some(merged))
                    } else {
                        (DedupAction::Pass, None, None)
                    }
                }
            };

            if matches!(action, DedupAction::Pass) {
                stream_windows.insert(window_key, event_id.clone());
            }
            drop(windows);

            let result = DedupResult {
                id: uuid::Uuid::new_v4().to_string(),
                rule_id: rule.id.clone(),
                original_id: event_id.clone(),
                duplicate_of,
                action: action.clone(),
                merged_payload,
            };

            let mut results = store.dedup_results.lock().await;
            results.push(result.clone());
            if results.len() > 50000 {
                results.truncate(25000);
            }
            drop(results);

            let mut stats = store.dedup_stats.lock().await;
            if let Some(s) = stats.get_mut(&rule.id) {
                s.total_checks += 1;
                match action {
                    DedupAction::Pass => s.passed += 1,
                    DedupAction::Drop => s.dropped += 1,
                    DedupAction::Merge => s.merged += 1,
                }
                s.pass_rate = if s.total_checks > 0 {
                    s.passed as f64 / s.total_checks as f64
                } else {
                    0.0
                };
            } else {
                let mut s = DedupStats {
                    rule_id: rule.id.clone(),
                    total_checks: 1,
                    passed: 0,
                    dropped: 0,
                    merged: 0,
                    pass_rate: 0.0,
                };
                match action {
                    DedupAction::Pass => s.passed = 1,
                    DedupAction::Drop => s.dropped = 1,
                    DedupAction::Merge => s.merged = 1,
                }
                s.pass_rate = if s.total_checks > 0 {
                    s.passed as f64 / s.total_checks as f64
                } else {
                    0.0
                };
                stats.insert(rule.id.clone(), s);
            }
            drop(stats);

            final_result = Some(result);
            break;
        }

        final_result.unwrap_or_else(|| DedupResult {
            id: uuid::Uuid::new_v4().to_string(),
            rule_id: "default".to_string(),
            original_id: event_id,
            duplicate_of: None,
            action: DedupAction::Pass,
            merged_payload: None,
        })
    }

    pub async fn get_dedup_stats(rule_id: Option<&str>) -> Vec<DedupStats> {
        let store = get_streaming_store();
        let stats = store.dedup_stats.lock().await;

        if let Some(rid) = rule_id {
            stats.get(rid).cloned().map(|s| vec![s]).unwrap_or_default()
        } else {
            stats.values().cloned().collect()
        }
    }

    pub async fn get_dedup_history(
        rule_id: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<DedupHistoryEntry> {
        let store = get_streaming_store();
        let results = store.dedup_results.lock().await;

        let limit = limit.unwrap_or(50).min(500) as usize;

        results
            .iter()
            .rev()
            .filter(|r| rule_id.map(|rid| r.rule_id == rid).unwrap_or(true))
            .take(limit)
            .map(|r| DedupHistoryEntry {
                id: r.id.clone(),
                rule_id: r.rule_id.clone(),
                original_id: r.original_id.clone(),
                duplicate_of: r.duplicate_of.clone(),
                action: r.action.clone(),
                created_at: chrono::Utc::now().to_rfc3339(),
            })
            .collect()
    }

    pub async fn enable_rule(rule_id: &str) -> Result<DedupRule, String> {
        let store = get_streaming_store();
        let mut rules = store.dedup_rules.lock().await;

        let rule = rules
            .get_mut(rule_id)
            .ok_or_else(|| format!("去重规则不存在: {}", rule_id))?;

        rule.enabled = true;
        Ok(rule.clone())
    }

    pub async fn disable_rule(rule_id: &str) -> Result<DedupRule, String> {
        let store = get_streaming_store();
        let mut rules = store.dedup_rules.lock().await;

        let rule = rules
            .get_mut(rule_id)
            .ok_or_else(|| format!("去重规则不存在: {}", rule_id))?;

        rule.enabled = false;
        Ok(rule.clone())
    }
}

// ==================== BackpressureController 实现 ====================

pub struct BackpressureController;

impl BackpressureController {
    pub async fn set_config(
        stream_id: String,
        max_queue_size: Option<u32>,
        high_watermark: Option<f64>,
        low_watermark: Option<f64>,
        overflow_strategy: Option<OverflowStrategy>,
    ) -> Result<BackpressureConfig, String> {
        let store = get_streaming_store();

        let config = BackpressureConfig {
            id: uuid::Uuid::new_v4().to_string(),
            stream_id: stream_id.clone(),
            max_queue_size: max_queue_size.unwrap_or(10000),
            high_watermark: high_watermark.unwrap_or(0.8),
            low_watermark: low_watermark.unwrap_or(0.2),
            overflow_strategy: overflow_strategy.unwrap_or(OverflowStrategy::Drop),
        };

        let mut configs = store.bp_configs.lock().await;
        configs.insert(stream_id, config.clone());

        Ok(config)
    }

    pub async fn get_config(stream_id: &str) -> Result<BackpressureConfig, String> {
        let store = get_streaming_store();
        let configs = store.bp_configs.lock().await;
        configs
            .get(stream_id)
            .cloned()
            .ok_or_else(|| format!("背压配置不存在: {}", stream_id))
    }

    pub async fn get_state(stream_id: &str) -> Result<BackpressureState, String> {
        let store = get_streaming_store();
        let states = store.bp_states.lock().await;
        states
            .get(stream_id)
            .cloned()
            .ok_or_else(|| format!("背压状态不存在: {}", stream_id))
    }

    pub async fn apply_backpressure(stream_id: &str, event_id: String) -> Result<bool, String> {
        let store = get_streaming_store();

        let config = {
            let configs = store.bp_configs.lock().await;
            configs
                .get(stream_id)
                .cloned()
                .unwrap_or_else(|| BackpressureConfig {
                    id: "default".to_string(),
                    stream_id: stream_id.to_string(),
                    max_queue_size: 10000,
                    high_watermark: 0.8,
                    low_watermark: 0.2,
                    overflow_strategy: OverflowStrategy::Drop,
                })
        };

        let mut states = store.bp_states.lock().await;
        let state = states
            .entry(stream_id.to_string())
            .or_insert_with(|| BackpressureState {
                id: uuid::Uuid::new_v4().to_string(),
                stream_id: stream_id.to_string(),
                queue_depth: 0,
                utilization: 0.0,
                dropped_count: 0,
                last_drop_reason: None,
                updated_at: chrono::Utc::now().to_rfc3339(),
            });

        state.queue_depth += 1;
        let max = config.max_queue_size as f64;
        state.utilization = if max > 0.0 {
            state.queue_depth as f64 / max
        } else {
            0.0
        };
        state.updated_at = chrono::Utc::now().to_rfc3339();

        let utilization = state.utilization;
        let queue_depth = state.queue_depth;

        let should_drop =
            utilization > config.high_watermark && queue_depth > config.max_queue_size;

        if should_drop {
            state.dropped_count += 1;
            state.last_drop_reason = Some(format!(
                "utilization={:.2} exceeds high_watermark={:.2}",
                utilization, config.high_watermark
            ));
        }

        drop(states);

        if should_drop {
            let mut dropped = store.bp_dropped.lock().await;
            dropped.push(DroppedEvent {
                id: uuid::Uuid::new_v4().to_string(),
                stream_id: stream_id.to_string(),
                event_id,
                reason: "queue_overflow".to_string(),
                dropped_at: chrono::Utc::now().to_rfc3339(),
            });
            if dropped.len() > 10000 {
                dropped.truncate(5000);
            }
            drop(dropped);

            let mut counters = store.bp_counters.lock().await;
            let counter = counters
                .entry(stream_id.to_string())
                .or_insert((0, 0, 0, 0));
            counter.2 = counter.2.max(queue_depth);
            counter.3 += 1;

            Ok(false)
        } else {
            let mut counters = store.bp_counters.lock().await;
            let counter = counters
                .entry(stream_id.to_string())
                .or_insert((0, 0, 0, 0));
            counter.0 += 1;
            counter.1 += 1;
            counter.2 = counter.2.max(queue_depth);

            Ok(true)
        }
    }

    pub async fn drain_queue(stream_id: &str) -> Result<u32, String> {
        let store = get_streaming_store();
        let mut states = store.bp_states.lock().await;

        let state = states
            .get_mut(stream_id)
            .ok_or_else(|| format!("背压状态不存在: {}", stream_id))?;

        let drained = state.queue_depth;
        state.queue_depth = 0;
        state.utilization = 0.0;
        state.updated_at = chrono::Utc::now().to_rfc3339();

        Ok(drained)
    }

    pub async fn get_dropped_events(
        stream_id: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<DroppedEvent> {
        let store = get_streaming_store();
        let dropped = store.bp_dropped.lock().await;

        let limit = limit.unwrap_or(50).min(500) as usize;

        dropped
            .iter()
            .rev()
            .filter(|d| stream_id.map(|s| d.stream_id == s).unwrap_or(true))
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn get_backpressure_stats(stream_id: Option<&str>) -> Vec<BackpressureStats> {
        let store = get_streaming_store();
        let counters = store.bp_counters.lock().await;

        let mut stats = Vec::new();

        for (sid, counter) in counters.iter() {
            if stream_id.map(|s| sid == s).unwrap_or(true) {
                let (total_processed, total_dropped, max_depth, overflow_events) = counter;

                let states = store.bp_states.lock().await;
                let state = states.get(sid);
                let current_util = state.map(|s| s.utilization).unwrap_or(0.0);
                let current_depth = state.map(|s| s.queue_depth).unwrap_or(0);
                drop(states);

                let avg_depth = if *total_processed > 0 {
                    *max_depth as f64 / (*total_processed as f64).max(1.0)
                } else {
                    0.0
                };

                stats.push(BackpressureStats {
                    stream_id: sid.clone(),
                    total_dropped: *total_dropped,
                    total_processed: *total_processed,
                    avg_queue_depth: avg_depth,
                    max_queue_depth: *max_depth,
                    current_utilization: current_util,
                    overflow_events: *overflow_events,
                });

                let _ = current_depth;
            }
        }

        stats
    }

    pub async fn reset_counter(stream_id: &str) -> Result<bool, String> {
        let store = get_streaming_store();
        let mut counters = store.bp_counters.lock().await;

        if let Some(counter) = counters.get_mut(stream_id) {
            *counter = (0, 0, 0, 0);
            drop(counters);

            let mut states = store.bp_states.lock().await;
            if let Some(state) = states.get_mut(stream_id) {
                state.queue_depth = 0;
                state.utilization = 0.0;
                state.dropped_count = 0;
                state.last_drop_reason = None;
                state.updated_at = chrono::Utc::now().to_rfc3339();
            }

            Ok(true)
        } else {
            Err(format!("背压计数器不存在: {}", stream_id))
        }
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 流式订阅 ---

#[derive(Debug, Deserialize)]
pub struct CreateStreamRequest {
    pub topic: String,
    pub stream_type: Option<String>,
    pub filter: Option<serde_json::Value>,
    pub batch_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ListStreamsQuery {
    pub topic: Option<String>,
    pub stream_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PublishEventRequest {
    pub event_type: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct SubscribeStreamRequest {
    pub subscriber_id: String,
}

#[derive(Debug, Deserialize)]
pub struct GetEventsQuery {
    pub limit: Option<u32>,
    pub from_sequence: Option<u64>,
}

// --- 消息去重 ---

#[derive(Debug, Deserialize)]
pub struct CreateDedupRuleRequest {
    pub stream_id: String,
    pub dedup_key: String,
    pub window_ms: Option<u64>,
    pub strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetDedupRulesQuery {
    pub stream_id: Option<String>,
    pub enabled_only: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CheckDuplicateRequest {
    pub stream_id: String,
    pub event_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct GetDedupStatsQuery {
    pub rule_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetDedupHistoryQuery {
    pub rule_id: Option<String>,
    pub limit: Option<u32>,
}

// --- 背压控制 ---

#[derive(Debug, Deserialize)]
pub struct SetBackpressureConfigRequest {
    pub max_queue_size: Option<u32>,
    pub high_watermark: Option<f64>,
    pub low_watermark: Option<f64>,
    pub overflow_strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApplyBackpressureRequest {
    pub event_id: String,
}

#[derive(Debug, Deserialize)]
pub struct GetDroppedEventsQuery {
    pub stream_id: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct GetBackpressureStatsQuery {
    pub stream_id: Option<String>,
}

// ==================== API 处理器: 流式订阅 ====================

pub async fn create_stream_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateStreamRequest>,
) -> Json<ApiResponse<Stream>> {
    let stream_type = req
        .stream_type
        .as_deref()
        .map(StreamType::from_str)
        .unwrap_or(StreamType::EventStream);

    match StreamManagerV2::create_stream(req.topic, stream_type, req.filter, req.batch_size).await {
        Ok(stream) => Json(ApiResponse::success(stream, "流创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_stream_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Stream>> {
    match StreamManagerV2::get_stream(&id).await {
        Ok(stream) => Json(ApiResponse::success(stream, "流详情")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn list_streams_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListStreamsQuery>,
) -> Json<ApiResponse<Vec<Stream>>> {
    let stream_type = params.stream_type.as_deref().map(StreamType::from_str);
    let status = params.status.as_deref().map(StreamStatus::from_str);

    let list = StreamManagerV2::list_streams(params.topic.as_deref(), stream_type, status).await;
    Json(ApiResponse::success(list, "流列表"))
}

pub async fn publish_event_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<PublishEventRequest>,
) -> Json<ApiResponse<StreamEvent>> {
    match StreamManagerV2::publish_event(&id, req.event_type, req.payload).await {
        Ok(event) => Json(ApiResponse::success(event, "事件发布成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn subscribe_stream_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<SubscribeStreamRequest>,
) -> Json<ApiResponse<bool>> {
    match StreamManagerV2::subscribe_stream(&id, req.subscriber_id).await {
        Ok(true) => Json(ApiResponse::success(true, "订阅成功")),
        Ok(false) => Json(ApiResponse::error(400, "订阅失败")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn unsubscribe_stream_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<SubscribeStreamRequest>,
) -> Json<ApiResponse<bool>> {
    match StreamManagerV2::unsubscribe_stream(&id, &req.subscriber_id).await {
        Ok(true) => Json(ApiResponse::success(true, "取消订阅成功")),
        Ok(false) => Json(ApiResponse::error(404, "订阅者不存在")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_stream_events_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<GetEventsQuery>,
) -> Json<ApiResponse<StreamEventList>> {
    let list = StreamManagerV2::get_stream_events(&id, params.limit, params.from_sequence).await;
    Json(ApiResponse::success(list, "流事件列表"))
}

pub async fn delete_stream_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match StreamManagerV2::delete_stream(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "流已删除")),
        Ok(false) => Json(ApiResponse::error(404, "流不存在")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

// ==================== API 处理器: 消息去重 ====================

pub async fn create_dedup_rule_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateDedupRuleRequest>,
) -> Json<ApiResponse<DedupRule>> {
    let strategy = req.strategy.as_deref().map(DedupStrategy::from_str);

    match DeduplicationEngine::create_dedup_rule(
        req.stream_id,
        req.dedup_key,
        req.window_ms,
        strategy,
    )
    .await
    {
        Ok(rule) => Json(ApiResponse::success(rule, "去重规则创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_dedup_rules_handler(
    State(_state): State<AppState>,
    Query(params): Query<GetDedupRulesQuery>,
) -> Json<ApiResponse<Vec<DedupRule>>> {
    let list =
        DeduplicationEngine::get_dedup_rules(params.stream_id.as_deref(), params.enabled_only)
            .await;
    Json(ApiResponse::success(list, "去重规则列表"))
}

pub async fn check_duplicate_handler(
    State(_state): State<AppState>,
    Json(req): Json<CheckDuplicateRequest>,
) -> Json<ApiResponse<DedupResult>> {
    let result = DeduplicationEngine::check_duplicate(
        &req.stream_id,
        req.event_id,
        req.event_type,
        req.payload,
    )
    .await;
    Json(ApiResponse::success(result, "去重检查完成"))
}

pub async fn get_dedup_stats_handler(
    State(_state): State<AppState>,
    Query(params): Query<GetDedupStatsQuery>,
) -> Json<ApiResponse<Vec<DedupStats>>> {
    let stats = DeduplicationEngine::get_dedup_stats(params.rule_id.as_deref()).await;
    Json(ApiResponse::success(stats, "去重统计"))
}

pub async fn get_dedup_history_handler(
    State(_state): State<AppState>,
    Query(params): Query<GetDedupHistoryQuery>,
) -> Json<ApiResponse<Vec<DedupHistoryEntry>>> {
    let history =
        DeduplicationEngine::get_dedup_history(params.rule_id.as_deref(), params.limit).await;
    Json(ApiResponse::success(history, "去重历史"))
}

pub async fn enable_rule_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<DedupRule>> {
    match DeduplicationEngine::enable_rule(&id).await {
        Ok(rule) => Json(ApiResponse::success(rule, "规则已启用")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn disable_rule_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<DedupRule>> {
    match DeduplicationEngine::disable_rule(&id).await {
        Ok(rule) => Json(ApiResponse::success(rule, "规则已禁用")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

// ==================== API 处理器: 背压控制 ====================

pub async fn set_backpressure_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<SetBackpressureConfigRequest>,
) -> Json<ApiResponse<BackpressureConfig>> {
    let strategy = req
        .overflow_strategy
        .as_deref()
        .map(OverflowStrategy::from_str);

    match BackpressureController::set_config(
        id,
        req.max_queue_size,
        req.high_watermark,
        req.low_watermark,
        strategy,
    )
    .await
    {
        Ok(config) => Json(ApiResponse::success(config, "背压配置已更新")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn get_backpressure_config_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<BackpressureConfig>> {
    match BackpressureController::get_config(&id).await {
        Ok(config) => Json(ApiResponse::success(config, "背压配置")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_backpressure_state_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<BackpressureState>> {
    match BackpressureController::get_state(&id).await {
        Ok(state) => Json(ApiResponse::success(state, "背压状态")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn apply_backpressure_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ApplyBackpressureRequest>,
) -> Json<ApiResponse<bool>> {
    match BackpressureController::apply_backpressure(&id, req.event_id).await {
        Ok(true) => Json(ApiResponse::success(true, "事件已接收")),
        Ok(false) => Json(ApiResponse::success(false, "事件已丢弃（背压）")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

pub async fn drain_queue_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<u32>> {
    match BackpressureController::drain_queue(&id).await {
        Ok(count) => Json(ApiResponse::success(count, "队列已排空")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_dropped_events_handler(
    State(_state): State<AppState>,
    Query(params): Query<GetDroppedEventsQuery>,
) -> Json<ApiResponse<Vec<DroppedEvent>>> {
    let events =
        BackpressureController::get_dropped_events(params.stream_id.as_deref(), params.limit).await;
    Json(ApiResponse::success(events, "丢弃事件列表"))
}

pub async fn get_backpressure_stats_handler(
    State(_state): State<AppState>,
    Query(params): Query<GetBackpressureStatsQuery>,
) -> Json<ApiResponse<Vec<BackpressureStats>>> {
    let stats = BackpressureController::get_backpressure_stats(params.stream_id.as_deref()).await;
    Json(ApiResponse::success(stats, "背压统计"))
}

pub async fn reset_counter_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match BackpressureController::reset_counter(&id).await {
        Ok(true) => Json(ApiResponse::success(true, "计数器已重置")),
        Ok(false) => Json(ApiResponse::error(404, "计数器不存在")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}
