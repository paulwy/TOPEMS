//! V47.0 BFF Phase 17: GraphQL 实时数据流 + 增量更新 + 状态同步（自 graphql_schema.rs 拆分）
//!
//! 1. 实时数据流增强：RealtimeDataStream（实时订阅 / 数据流缓冲 / 推送统计）
//! 2. 增量更新引擎：IncrementalUpdateEngine（增量变更 / 快照 / 合并）
//! 3. 状态同步管理器：StateSyncManager（会话状态 / 冲突检测 / 同步）
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_realtime_stream::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。
//! `uuid_simple` 定义于 `graphql_edge_v2.rs`（V46.0 区域），此处经模块路径引用。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Mutex;

use crate::modules::graphql_edge_v2::uuid_simple;

// Phase 17 新增：
// - RealtimeDataStream：实时数据流增强（注册流 / 发布更新 / 快照 / 压缩）
// - IncrementalUpdateEngine：增量更新引擎（计算 delta / 应用 / 批量 / 对账）
// - StateSyncManager：状态同步管理器（会话 / 冲突 / 历史）
// - 三个新 Subscription：realtime_data_stream / incremental_updates / sync_state_changed

// ---------- Part 1: 实时数据流增强（RealtimeDataStream） ----------

/// V47.0: 实时流更新类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StreamUpdateTypeGql {
    Insert,
    Update,
    Delete,
    Sync,
    Snapshot,
}

/// V47.0: 实时流配置
#[derive(SimpleObject, Clone)]
pub struct RealtimeStreamConfigGql {
    pub buffer_size: i64,
    pub flush_interval_ms: i64,
    pub max_concurrent_streams: i32,
    pub compression_enabled: bool,
}

/// V47.0: 实时流更新事件
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct RealtimeStreamUpdateGql {
    pub update_id: String,
    pub stream_type: StreamUpdateTypeGql,
    pub entity_type: String,
    pub entity_id: String,
    pub changed_fields: Vec<String>,
    pub old_values: serde_json::Value,
    pub new_values: serde_json::Value,
    pub timestamp: String,
    pub sequence_number: i64,
}

/// V47.0: 实时流统计信息
#[derive(SimpleObject, Clone)]
pub struct RealtimeStreamStatsGql {
    pub entity_type: String,
    pub total_updates: i64,
    pub buffered_updates: i64,
    pub current_sequence: i64,
    pub snapshot_count: i64,
    pub last_update_at: Option<String>,
}

/// V47.0: 流快照（用于新客户端初始化）
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct StreamSnapshotGql {
    pub snapshot_id: String,
    pub entity_type: String,
    pub sequence_number: i64,
    pub data: serde_json::Value,
    pub created_at: String,
}

// --- 内部状态 ---

#[derive(Clone)]
struct RealtimeStreamConfigData {
    buffer_size: u64,
    flush_interval_ms: u64,
    max_concurrent_streams: u32,
    compression_enabled: bool,
}

impl Default for RealtimeStreamConfigData {
    fn default() -> Self {
        Self {
            buffer_size: 1024,
            flush_interval_ms: 100,
            max_concurrent_streams: 16,
            compression_enabled: true,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RealtimeStreamUpdateData {
    pub update_id: String,
    pub stream_type: StreamUpdateTypeGql,
    pub entity_type: String,
    pub entity_id: String,
    pub changed_fields: Vec<String>,
    pub old_values: serde_json::Value,
    pub new_values: serde_json::Value,
    pub timestamp: DateTime<Utc>,
    pub sequence_number: i64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct StreamSnapshotData {
    pub snapshot_id: String,
    pub entity_type: String,
    pub sequence_number: i64,
    pub data: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

struct RealtimeStreamManagerState {
    config: RealtimeStreamConfigData,
    streams: HashMap<String, RealtimeStreamConfigData>,
    updates: HashMap<String, VecDeque<RealtimeStreamUpdateData>>,
    snapshots: HashMap<String, Vec<StreamSnapshotData>>,
    sequences: HashMap<String, i64>,
    total_updates: u64,
}

impl RealtimeStreamManagerState {
    fn new() -> Self {
        let mut streams = HashMap::new();
        let mut updates = HashMap::new();
        let mut sequences = HashMap::new();
        for et in ["order", "inventory", "master_data", "notification"] {
            streams.insert(et.to_string(), RealtimeStreamConfigData::default());
            updates.insert(et.to_string(), VecDeque::new());
            sequences.insert(et.to_string(), 0);
        }
        Self {
            config: RealtimeStreamConfigData::default(),
            streams,
            updates,
            snapshots: HashMap::new(),
            sequences,
            total_updates: 0,
        }
    }
}

static REALTIME_STREAM_STATE: std::sync::OnceLock<Mutex<RealtimeStreamManagerState>> =
    std::sync::OnceLock::new();

fn realtime_stream_state() -> &'static Mutex<RealtimeStreamManagerState> {
    REALTIME_STREAM_STATE.get_or_init(|| Mutex::new(RealtimeStreamManagerState::new()))
}

/// V47.0: 实时数据流管理器
pub struct RealtimeStreamManager;

impl RealtimeStreamManager {
    /// 注册数据流（entity_type → stream 配置）
    pub fn register_stream(entity_type: &str, config: RealtimeStreamConfigGql) -> bool {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let data = RealtimeStreamConfigData {
            buffer_size: config.buffer_size as u64,
            flush_interval_ms: config.flush_interval_ms as u64,
            max_concurrent_streams: config.max_concurrent_streams as u32,
            compression_enabled: config.compression_enabled,
        };
        state.streams.insert(entity_type.to_string(), data);
        state.updates.entry(entity_type.to_string()).or_default();
        state.sequences.entry(entity_type.to_string()).or_insert(0);
        true
    }

    /// 发布实时更新
    pub fn publish_update(
        entity_type: &str,
        entity_id: &str,
        stream_type: StreamUpdateTypeGql,
        changed_fields: Vec<String>,
        old_values: serde_json::Value,
        new_values: serde_json::Value,
    ) -> Option<RealtimeStreamUpdateGql> {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if !state.streams.contains_key(entity_type) {
            return None;
        }
        let seq = state.sequences.entry(entity_type.to_string()).or_insert(0);
        *seq += 1;
        let update = RealtimeStreamUpdateData {
            update_id: uuid_simple(),
            stream_type,
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            changed_fields,
            old_values,
            new_values,
            timestamp: Utc::now(),
            sequence_number: *seq,
        };
        let gql = Self::update_to_gql(&update);
        let buffer = state.config.buffer_size as usize;
        let queue = state.updates.entry(entity_type.to_string()).or_default();
        queue.push_back(update);
        while queue.len() > buffer {
            queue.pop_front();
        }
        state.total_updates += 1;
        Some(gql)
    }

    /// 获取指定流的增量更新（since_sequence 之后的更新）
    pub fn get_stream_updates(
        entity_type: &str,
        since_sequence: i64,
        limit: Option<u32>,
    ) -> Vec<RealtimeStreamUpdateGql> {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(100) as usize;
        state
            .updates
            .get(entity_type)
            .map(|q| {
                q.iter()
                    .filter(|u| u.sequence_number > since_sequence)
                    .take(limit)
                    .map(Self::update_to_gql)
                    .collect()
            })
            .unwrap_or_default()
    }

    /// 获取流统计信息
    pub fn get_stream_stats(entity_type: &str) -> Option<RealtimeStreamStatsGql> {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let buffered = state
            .updates
            .get(entity_type)
            .map(|q| q.len() as i64)
            .unwrap_or(0);
        let current_seq = state.sequences.get(entity_type).copied().unwrap_or(0);
        let snapshot_count = state
            .snapshots
            .get(entity_type)
            .map(|s| s.len() as i64)
            .unwrap_or(0);
        let last_update_at = state
            .updates
            .get(entity_type)
            .and_then(|q| q.back())
            .map(|u| u.timestamp.to_rfc3339());
        Some(RealtimeStreamStatsGql {
            entity_type: entity_type.to_string(),
            total_updates: state.total_updates as i64,
            buffered_updates: buffered,
            current_sequence: current_seq,
            snapshot_count,
            last_update_at,
        })
    }

    /// 创建快照（用于新客户端初始化）
    pub fn create_snapshot(entity_type: &str, data: serde_json::Value) -> StreamSnapshotGql {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let seq = state.sequences.get(entity_type).copied().unwrap_or(0);
        let snapshot = StreamSnapshotData {
            snapshot_id: uuid_simple(),
            entity_type: entity_type.to_string(),
            sequence_number: seq,
            data,
            created_at: Utc::now(),
        };
        let gql = Self::snapshot_to_gql(&snapshot);
        state
            .snapshots
            .entry(entity_type.to_string())
            .or_default()
            .push(snapshot);
        gql
    }

    /// 获取快照（snapshot_id 为 None 时返回最新快照）
    pub fn get_snapshot(entity_type: &str, snapshot_id: Option<&str>) -> Option<StreamSnapshotGql> {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let snapshots = state.snapshots.get(entity_type)?;
        if let Some(id) = snapshot_id {
            snapshots
                .iter()
                .find(|s| s.snapshot_id == id)
                .map(Self::snapshot_to_gql)
        } else {
            snapshots.last().map(Self::snapshot_to_gql)
        }
    }

    /// 压缩流（清理旧数据，保留最新快照）
    pub fn compact_stream(entity_type: &str) -> bool {
        let mut state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if let Some(queue) = state.updates.get_mut(entity_type) {
            queue.clear();
        }
        if let Some(snapshots) = state.snapshots.get_mut(entity_type) {
            if snapshots.len() > 1 {
                let last = snapshots.pop().unwrap();
                snapshots.clear();
                snapshots.push(last);
            }
        }
        true
    }

    /// 获取当前流全局配置
    pub fn get_config() -> RealtimeStreamConfigGql {
        let state = realtime_stream_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        RealtimeStreamConfigGql {
            buffer_size: state.config.buffer_size as i64,
            flush_interval_ms: state.config.flush_interval_ms as i64,
            max_concurrent_streams: state.config.max_concurrent_streams as i32,
            compression_enabled: state.config.compression_enabled,
        }
    }

    fn update_to_gql(u: &RealtimeStreamUpdateData) -> RealtimeStreamUpdateGql {
        RealtimeStreamUpdateGql {
            update_id: u.update_id.clone(),
            stream_type: u.stream_type,
            entity_type: u.entity_type.clone(),
            entity_id: u.entity_id.clone(),
            changed_fields: u.changed_fields.clone(),
            old_values: u.old_values.clone(),
            new_values: u.new_values.clone(),
            timestamp: u.timestamp.to_rfc3339(),
            sequence_number: u.sequence_number,
        }
    }

    fn snapshot_to_gql(s: &StreamSnapshotData) -> StreamSnapshotGql {
        StreamSnapshotGql {
            snapshot_id: s.snapshot_id.clone(),
            entity_type: s.entity_type.clone(),
            sequence_number: s.sequence_number,
            data: s.data.clone(),
            created_at: s.created_at.to_rfc3339(),
        }
    }
}

// ---------- Part 2: 增量更新引擎（IncrementalUpdateEngine） ----------

/// V47.0: 增量更新操作类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpdateOperationGql {
    Set,
    Add,
    Remove,
    Move,
    Merge,
    Replace,
}

/// V47.0: 字段增量
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct FieldDeltaGql {
    pub field_path: String,
    pub operation: UpdateOperationGql,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
}

/// V47.0: 增量更新
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct IncrementalUpdateGql {
    pub update_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub version: i64,
    pub delta: serde_json::Value,
    pub base_version: i64,
    pub timestamp: String,
}

/// V47.0: 增量更新统计
#[derive(SimpleObject, Clone)]
pub struct IncrementalStatsGql {
    pub total_updates: i64,
    pub pending_updates: i64,
    pub applied_updates: i64,
    pub rejected_updates: i64,
    pub last_reconcile_at: Option<String>,
}

/// V47.0: 对账结果
#[derive(SimpleObject, Clone)]
pub struct ReconcileResultGql {
    pub client_version: i64,
    pub server_version: i64,
    pub in_sync: bool,
    pub missing_updates: i64,
}

// --- 内部状态 ---

#[derive(Clone, Serialize, Deserialize)]
pub struct IncrementalUpdateData {
    pub update_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub version: i64,
    pub delta: serde_json::Value,
    pub base_version: i64,
    pub timestamp: DateTime<Utc>,
    pub applied: bool,
    pub valid: bool,
}

struct IncrementalUpdateEngineState {
    updates: Vec<IncrementalUpdateData>,
    total_updates: u64,
    applied_updates: u64,
    rejected_updates: u64,
    last_reconcile_at: Option<DateTime<Utc>>,
}

impl IncrementalUpdateEngineState {
    fn new() -> Self {
        Self {
            updates: Vec::new(),
            total_updates: 0,
            applied_updates: 0,
            rejected_updates: 0,
            last_reconcile_at: None,
        }
    }
}

static INCREMENTAL_UPDATE_STATE: std::sync::OnceLock<Mutex<IncrementalUpdateEngineState>> =
    std::sync::OnceLock::new();

fn incremental_update_state() -> &'static Mutex<IncrementalUpdateEngineState> {
    INCREMENTAL_UPDATE_STATE.get_or_init(|| Mutex::new(IncrementalUpdateEngineState::new()))
}

/// V47.0: 增量更新引擎
pub struct IncrementalUpdateEngine;

impl IncrementalUpdateEngine {
    /// 计算两个版本间的增量
    pub fn compute_delta(
        entity_type: &str,
        entity_id: &str,
        base_version: i64,
        old_values: serde_json::Value,
        new_values: serde_json::Value,
    ) -> IncrementalUpdateGql {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.total_updates += 1;
        let version = base_version + 1;
        let delta = Self::diff_values(&old_values, &new_values);
        let update = IncrementalUpdateData {
            update_id: uuid_simple(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            version,
            delta,
            base_version,
            timestamp: Utc::now(),
            applied: false,
            valid: true,
        };
        let gql = Self::update_to_gql(&update);
        state.updates.push(update);
        gql
    }

    /// 应用增量到基础数据
    pub fn apply_delta(
        entity_type: &str,
        entity_id: &str,
        update_id: &str,
        base: serde_json::Value,
    ) -> Option<serde_json::Value> {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let idx = state.updates.iter().position(|u| {
            u.update_id == update_id && u.entity_type == entity_type && u.entity_id == entity_id
        })?;
        if !state.updates[idx].valid {
            state.rejected_updates += 1;
            return None;
        }
        let delta = state.updates[idx].delta.clone();
        state.updates[idx].applied = true;
        state.applied_updates += 1;
        Some(Self::merge_delta(base, delta))
    }

    /// 批量应用增量（自 since_version 起）
    pub fn batch_apply(
        entity_type: &str,
        entity_id: &str,
        base: serde_json::Value,
        since_version: i64,
    ) -> serde_json::Value {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let mut current = base;
        let mut applied_count: u64 = 0;
        for i in 0..state.updates.len() {
            let matches = state.updates[i].entity_type == entity_type
                && state.updates[i].entity_id == entity_id
                && state.updates[i].base_version >= since_version
                && state.updates[i].valid;
            if matches {
                let delta = state.updates[i].delta.clone();
                current = Self::merge_delta(current, delta);
                state.updates[i].applied = true;
                applied_count += 1;
            }
        }
        state.applied_updates += applied_count;
        current
    }

    /// 验证增量是否合法
    pub fn validate_delta(delta: &serde_json::Value) -> bool {
        if !delta.is_object() {
            return false;
        }
        if let Some(obj) = delta.as_object() {
            if obj.is_empty() {
                return false;
            }
            for key in obj.keys() {
                if key.is_empty() {
                    return false;
                }
            }
            return true;
        }
        false
    }

    /// 对账（检测客户端与服务端版本差异）
    pub fn reconcile(
        entity_type: &str,
        entity_id: &str,
        client_version: i64,
    ) -> ReconcileResultGql {
        let mut state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state.last_reconcile_at = Some(Utc::now());
        let server_version = state
            .updates
            .iter()
            .filter(|u| u.entity_type == entity_type && u.entity_id == entity_id)
            .map(|u| u.version)
            .max()
            .unwrap_or(0);
        let missing = state
            .updates
            .iter()
            .filter(|u| {
                u.entity_type == entity_type
                    && u.entity_id == entity_id
                    && u.version > client_version
            })
            .count() as i64;
        ReconcileResultGql {
            client_version,
            server_version,
            in_sync: client_version >= server_version,
            missing_updates: missing,
        }
    }

    /// 获取待应用的增量更新
    pub fn get_pending_updates(
        entity_type: &str,
        entity_id: &str,
        since_version: i64,
    ) -> Vec<IncrementalUpdateGql> {
        let state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        state
            .updates
            .iter()
            .filter(|u| {
                u.entity_type == entity_type
                    && u.entity_id == entity_id
                    && u.version > since_version
                    && !u.applied
            })
            .map(Self::update_to_gql)
            .collect()
    }

    /// 获取增量更新统计
    pub fn get_stats() -> IncrementalStatsGql {
        let state = incremental_update_state()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let pending = state.updates.iter().filter(|u| !u.applied).count() as i64;
        IncrementalStatsGql {
            total_updates: state.total_updates as i64,
            pending_updates: pending,
            applied_updates: state.applied_updates as i64,
            rejected_updates: state.rejected_updates as i64,
            last_reconcile_at: state.last_reconcile_at.map(|t| t.to_rfc3339()),
        }
    }

    /// 计算两个 JSON 对象的差异（仅顶层字段）
    fn diff_values(old: &serde_json::Value, new: &serde_json::Value) -> serde_json::Value {
        let mut delta = serde_json::Map::new();
        if let (Some(old_obj), Some(new_obj)) = (old.as_object(), new.as_object()) {
            for (key, new_val) in new_obj {
                let old_val = old_obj.get(key).unwrap_or(&serde_json::Value::Null);
                if old_val != new_val {
                    delta.insert(key.clone(), new_val.clone());
                }
            }
            for key in old_obj.keys() {
                if !new_obj.contains_key(key) {
                    delta.insert(key.clone(), serde_json::Value::Null);
                }
            }
        } else if old != new {
            return new.clone();
        }
        serde_json::Value::Object(delta)
    }

    /// 将 delta 合并到基础数据
    fn merge_delta(base: serde_json::Value, delta: serde_json::Value) -> serde_json::Value {
        let mut result = base;
        if let (Some(result_obj), Some(delta_obj)) = (result.as_object_mut(), delta.as_object()) {
            for (key, val) in delta_obj {
                if val.is_null() {
                    result_obj.remove(key);
                } else {
                    result_obj.insert(key.clone(), val.clone());
                }
            }
        } else if !delta.is_null() {
            result = delta;
        }
        result
    }

    fn update_to_gql(u: &IncrementalUpdateData) -> IncrementalUpdateGql {
        IncrementalUpdateGql {
            update_id: u.update_id.clone(),
            entity_type: u.entity_type.clone(),
            entity_id: u.entity_id.clone(),
            version: u.version,
            delta: u.delta.clone(),
            base_version: u.base_version,
            timestamp: u.timestamp.to_rfc3339(),
        }
    }
}

// ---------- Part 3: 状态同步管理器（StateSyncManager） ----------

/// V47.0: 同步状态
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncStateGql {
    InSync,
    Syncing,
    Conflict,
    Error,
    Offline,
}

/// V47.0: 冲突解决策略
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictResolutionStrategyGql {
    ServerWins,
    ClientWins,
    LastWriteWins,
    Manual,
    Merge,
}

/// V47.0: 同步冲突
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SyncConflictGql {
    pub conflict_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub client_version: i64,
    pub server_version: i64,
    pub conflict_fields: Vec<String>,
    pub resolution_strategy: ConflictResolutionStrategyGql,
}

/// V47.0: 同步会话
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct SyncSessionGql {
    pub session_id: String,
    pub client_id: String,
    pub last_sync_version: i64,
    pub current_version: i64,
    pub pending_updates: i64,
    pub sync_state: SyncStateGql,
    pub started_at: String,
    pub last_sync_at: Option<String>,
}

/// V47.0: 同步统计
#[derive(SimpleObject, Clone)]
pub struct SyncStatsGql {
    pub total_sessions: i64,
    pub active_sessions: i64,
    pub total_conflicts: i64,
    pub resolved_conflicts: i64,
    pub registered_entities: i64,
    pub total_syncs: i64,
}

// --- 内部状态 ---

#[derive(Clone, Serialize, Deserialize)]
pub struct SyncSessionData {
    pub session_id: String,
    pub client_id: String,
    pub last_sync_version: i64,
    pub current_version: i64,
    pub pending_updates: i64,
    pub sync_state: SyncStateGql,
    pub started_at: DateTime<Utc>,
    pub last_sync_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SyncConflictData {
    pub conflict_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub client_version: i64,
    pub server_version: i64,
    pub conflict_fields: Vec<String>,
    pub resolution_strategy: ConflictResolutionStrategyGql,
    pub resolved: bool,
}

struct StateSyncManagerState {
    sessions: Vec<SyncSessionData>,
    conflicts: Vec<SyncConflictData>,
    registered_entities: HashSet<String>,
    total_syncs: u64,
}

impl StateSyncManagerState {
    fn new() -> Self {
        let mut registered_entities = HashSet::new();
        for et in ["order", "inventory", "master_data", "user_profile"] {
            registered_entities.insert(et.to_string());
        }
        Self {
            sessions: Vec::new(),
            conflicts: Vec::new(),
            registered_entities,
            total_syncs: 0,
        }
    }
}

static STATE_SYNC_STATE: std::sync::OnceLock<Mutex<StateSyncManagerState>> =
    std::sync::OnceLock::new();

fn state_sync_state() -> &'static Mutex<StateSyncManagerState> {
    STATE_SYNC_STATE.get_or_init(|| Mutex::new(StateSyncManagerState::new()))
}

/// V47.0: 状态同步管理器
pub struct StateSyncManager;

impl StateSyncManager {
    /// 启动同步会话
    pub fn start_sync(client_id: &str, last_sync_version: i64) -> SyncSessionGql {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let now = Utc::now();
        let session = SyncSessionData {
            session_id: uuid_simple(),
            client_id: client_id.to_string(),
            last_sync_version,
            current_version: last_sync_version,
            pending_updates: 0,
            sync_state: SyncStateGql::Syncing,
            started_at: now,
            last_sync_at: None,
        };
        let gql = Self::session_to_gql(&session);
        state.sessions.push(session);
        state.total_syncs += 1;
        gql
    }

    /// 获取同步状态
    pub fn get_sync_state(session_id: &str) -> Option<SyncSessionGql> {
        let state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        state
            .sessions
            .iter()
            .find(|s| s.session_id == session_id)
            .map(Self::session_to_gql)
    }

    /// 解决冲突
    pub fn resolve_conflict(
        conflict_id: &str,
        strategy: ConflictResolutionStrategyGql,
    ) -> Option<SyncConflictGql> {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let conflict = state
            .conflicts
            .iter_mut()
            .find(|c| c.conflict_id == conflict_id)?;
        conflict.resolution_strategy = strategy;
        conflict.resolved = true;
        Some(Self::conflict_to_gql(conflict))
    }

    /// 获取同步历史（可按 client_id 过滤）
    pub fn get_sync_history(client_id: Option<&str>, limit: Option<u32>) -> Vec<SyncSessionGql> {
        let state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let limit = limit.unwrap_or(50) as usize;
        state
            .sessions
            .iter()
            .filter(|s| client_id.map(|c| s.client_id == c).unwrap_or(true))
            .rev()
            .take(limit)
            .map(Self::session_to_gql)
            .collect()
    }

    /// 注册需要同步的实体类型
    pub fn register_entity(entity_type: &str) -> bool {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        state.registered_entities.insert(entity_type.to_string());
        true
    }

    /// 获取同步统计
    pub fn get_sync_stats() -> SyncStatsGql {
        let state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let active = state
            .sessions
            .iter()
            .filter(|s| s.sync_state == SyncStateGql::Syncing)
            .count() as i64;
        let total_conflicts = state.conflicts.len() as i64;
        let resolved = state.conflicts.iter().filter(|c| c.resolved).count() as i64;
        SyncStatsGql {
            total_sessions: state.sessions.len() as i64,
            active_sessions: active,
            total_conflicts,
            resolved_conflicts: resolved,
            registered_entities: state.registered_entities.len() as i64,
            total_syncs: state.total_syncs as i64,
        }
    }

    /// 创建冲突记录（用于检测到版本不一致时登记）
    pub fn create_conflict(
        entity_type: &str,
        entity_id: &str,
        client_version: i64,
        server_version: i64,
        conflict_fields: Vec<String>,
    ) -> SyncConflictGql {
        let mut state = state_sync_state().lock().unwrap_or_else(|e| e.into_inner());
        let conflict = SyncConflictData {
            conflict_id: uuid_simple(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            client_version,
            server_version,
            conflict_fields,
            resolution_strategy: ConflictResolutionStrategyGql::Manual,
            resolved: false,
        };
        let gql = Self::conflict_to_gql(&conflict);
        state.conflicts.push(conflict);
        gql
    }

    fn session_to_gql(s: &SyncSessionData) -> SyncSessionGql {
        SyncSessionGql {
            session_id: s.session_id.clone(),
            client_id: s.client_id.clone(),
            last_sync_version: s.last_sync_version,
            current_version: s.current_version,
            pending_updates: s.pending_updates,
            sync_state: s.sync_state,
            started_at: s.started_at.to_rfc3339(),
            last_sync_at: s.last_sync_at.map(|t| t.to_rfc3339()),
        }
    }

    fn conflict_to_gql(c: &SyncConflictData) -> SyncConflictGql {
        SyncConflictGql {
            conflict_id: c.conflict_id.clone(),
            entity_type: c.entity_type.clone(),
            entity_id: c.entity_id.clone(),
            client_version: c.client_version,
            server_version: c.server_version,
            conflict_fields: c.conflict_fields.clone(),
            resolution_strategy: c.resolution_strategy,
        }
    }
}
