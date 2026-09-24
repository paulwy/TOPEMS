//! V43.0 Track B: GraphQL 订阅增强（自 graphql_schema.rs 拆分）
//!
//! 订阅会话管理 + 过滤 + 实时推送增强：
//! 1. 订阅过滤（FilterOperator / FilterCondition / SubscriptionFilter / apply_filter）
//! 2. 实时数据推送（DataChangeEvent / UpdateType）
//! 3. 订阅会话管理（SubscriptionSession / register_session / remove_session / touch_session）
//! 4. 订阅重连与恢复（SubscriptionCheckpoint / BufferedEvent / push_buffered_event）
//! 5. 订阅统计（ChannelStat / SubscriptionStats / record_event_published）
//! 6. GraphQL Gql 输出类型与转换函数
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_subscription_enhanced::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。
//! `SubscriptionChannel`（V39.0 基础类型）仍定义于 `graphql_schema.rs`，此处经模块路径引用。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;

use crate::modules::graphql_schema::SubscriptionChannel;

// ---------- 1. 订阅过滤增强 ----------

/// 过滤操作符
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FilterOperator {
    Eq,
    Ne,
    Gt,
    Lt,
    Gte,
    Lte,
    Contains,
    In,
    NotIn,
    Regex,
}

/// 过滤条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    pub field: String,
    pub operator: FilterOperator,
    pub value: serde_json::Value,
}

/// 订阅过滤器
/// 支持字段级过滤、条件过滤、去重
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SubscriptionFilter {
    pub include_fields: Option<Vec<String>>,
    pub exclude_fields: Option<Vec<String>>,
    pub conditions: Option<Vec<FilterCondition>>,
    pub deduplicate: bool,
    pub dedup_key: Option<String>,
}

/// 检查单个过滤条件
fn check_condition(event: &serde_json::Value, condition: &FilterCondition) -> bool {
    let field_value = get_json_field(event, &condition.field);
    let cond_value = &condition.value;

    match condition.operator {
        FilterOperator::Eq => field_value == cond_value,
        FilterOperator::Ne => field_value != cond_value,
        FilterOperator::Gt => {
            compare_json_values(field_value, cond_value) == Some(std::cmp::Ordering::Greater)
        }
        FilterOperator::Lt => {
            compare_json_values(field_value, cond_value) == Some(std::cmp::Ordering::Less)
        }
        FilterOperator::Gte => {
            matches!(
                compare_json_values(field_value, cond_value),
                Some(std::cmp::Ordering::Greater) | Some(std::cmp::Ordering::Equal)
            )
        }
        FilterOperator::Lte => {
            matches!(
                compare_json_values(field_value, cond_value),
                Some(std::cmp::Ordering::Less) | Some(std::cmp::Ordering::Equal)
            )
        }
        FilterOperator::Contains => match (field_value.as_str(), cond_value.as_str()) {
            (Some(f), Some(c)) => f.contains(c),
            _ => false,
        },
        FilterOperator::In => match cond_value.as_array() {
            Some(arr) => arr.iter().any(|v| v == field_value),
            None => false,
        },
        FilterOperator::NotIn => match cond_value.as_array() {
            Some(arr) => !arr.iter().any(|v| v == field_value),
            None => true,
        },
        FilterOperator::Regex => match (field_value.as_str(), cond_value.as_str()) {
            (Some(f), Some(pattern)) => {
                let pattern_lower = pattern.to_lowercase();
                f.to_lowercase().contains(&pattern_lower)
            }
            _ => false,
        },
    }
}

/// 简易 JSON 值比较（数字和字符串）
fn compare_json_values(a: &serde_json::Value, b: &serde_json::Value) -> Option<std::cmp::Ordering> {
    match (a, b) {
        (serde_json::Value::Number(na), serde_json::Value::Number(nb)) => {
            let fa = na.as_f64()?;
            let fb = nb.as_f64()?;
            fa.partial_cmp(&fb)
        }
        (serde_json::Value::String(sa), serde_json::Value::String(sb)) => Some(sa.cmp(sb)),
        _ => None,
    }
}

/// 按点分隔路径获取 JSON 字段值
fn get_json_field<'a>(value: &'a serde_json::Value, path: &str) -> &'a serde_json::Value {
    let mut current = value;
    for segment in path.split('.') {
        match current.get(segment) {
            Some(v) => current = v,
            None => return &serde_json::Value::Null,
        }
    }
    current
}

/// 字段过滤：保留指定字段
fn filter_include_fields(event: serde_json::Value, fields: &[String]) -> serde_json::Value {
    if let serde_json::Value::Object(map) = event {
        let mut filtered = serde_json::Map::new();
        for field in fields {
            if let Some(v) = map.get(field) {
                filtered.insert(field.clone(), v.clone());
            }
        }
        serde_json::Value::Object(filtered)
    } else {
        event
    }
}

/// 字段过滤：排除指定字段
fn filter_exclude_fields(event: serde_json::Value, fields: &[String]) -> serde_json::Value {
    if let serde_json::Value::Object(mut map) = event {
        for field in fields {
            map.remove(field);
        }
        serde_json::Value::Object(map)
    } else {
        event
    }
}

/// 应用订阅过滤器
/// 返回过滤后的事件，若被过滤掉则返回 None
pub fn apply_filter(
    event: serde_json::Value,
    filter: &SubscriptionFilter,
) -> Option<serde_json::Value> {
    if let Some(conditions) = &filter.conditions {
        for condition in conditions {
            if !check_condition(&event, condition) {
                return None;
            }
        }
    }

    let mut result = event;

    if let Some(include) = &filter.include_fields {
        result = filter_include_fields(result, include);
    }

    if let Some(exclude) = &filter.exclude_fields {
        result = filter_exclude_fields(result, exclude);
    }

    Some(result)
}

// ---------- 2. 实时数据推送 ----------

/// 更新类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpdateType {
    Created,
    Updated,
    Deleted,
    Delta,
    Full,
}

/// 数据变更事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataChangeEvent {
    pub entity_type: String,
    pub entity_id: String,
    pub update_type: UpdateType,
    pub data: Option<serde_json::Value>,
    pub delta: Option<serde_json::Value>,
    pub version: u64,
    pub timestamp: String,
    pub source: String,
}

// ---------- 3. 订阅会话管理 ----------

/// 订阅信息
#[derive(Debug, Clone)]
pub struct SubscriptionInfo {
    pub id: String,
    pub operation_name: Option<String>,
    pub query: String,
    pub variables: Option<serde_json::Value>,
    pub channel: SubscriptionChannel,
    pub filter: Option<SubscriptionFilter>,
    pub created_at: DateTime<Utc>,
    pub events_received: u64,
    pub last_event_at: Option<DateTime<Utc>>,
}

/// 订阅会话
/// 一个 WebSocket 连接对应一个会话，可包含多个订阅（多路复用）
#[derive(Debug, Clone)]
pub struct SubscriptionSession {
    pub session_id: String,
    pub connection_id: String,
    pub user_id: Option<String>,
    pub subscriptions: HashMap<String, SubscriptionInfo>,
    pub connected_at: DateTime<Utc>,
    pub last_active: DateTime<Utc>,
}

/// 全局订阅会话存储
static SUBSCRIPTION_SESSIONS: std::sync::OnceLock<Mutex<HashMap<String, SubscriptionSession>>> =
    std::sync::OnceLock::new();

fn subscription_sessions() -> &'static Mutex<HashMap<String, SubscriptionSession>> {
    SUBSCRIPTION_SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// 注册订阅会话
pub fn register_session(session: SubscriptionSession) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.insert(session.session_id.clone(), session);
    tracing::debug!(
        "[subscription] 会话已注册，当前活跃会话: {}",
        sessions.len()
    );
}

/// 移除订阅会话
pub fn remove_session(session_id: &str) -> Option<SubscriptionSession> {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let removed = sessions.remove(session_id);
    tracing::debug!(
        "[subscription] 会话已移除，当前活跃会话: {}",
        sessions.len()
    );
    removed
}

/// 获取订阅会话
pub fn get_session(session_id: &str) -> Option<SubscriptionSession> {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.get(session_id).cloned()
}

/// 列出所有订阅会话
pub fn list_sessions() -> Vec<SubscriptionSession> {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.values().cloned().collect()
}

/// 获取总订阅数
pub fn get_total_subscriptions() -> usize {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.values().map(|s| s.subscriptions.len()).sum()
}

/// 获取活跃连接数
pub fn get_active_connections() -> usize {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.len()
}

/// 向会话添加订阅
pub fn add_subscription_to_session(session_id: &str, info: SubscriptionInfo) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        session.subscriptions.insert(info.id.clone(), info);
        session.last_active = Utc::now();
    }
}

/// 从会话移除订阅
pub fn remove_subscription_from_session(session_id: &str, subscription_id: &str) -> bool {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        let removed = session.subscriptions.remove(subscription_id).is_some();
        session.last_active = Utc::now();
        removed
    } else {
        false
    }
}

/// 更新会话最后活跃时间
pub fn touch_session(session_id: &str) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        session.last_active = Utc::now();
    }
}

/// 记录订阅收到事件
pub fn record_subscription_event(session_id: &str, subscription_id: &str) {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(session_id) {
        if let Some(sub) = session.subscriptions.get_mut(subscription_id) {
            sub.events_received += 1;
            sub.last_event_at = Some(Utc::now());
        }
        session.last_active = Utc::now();
    }
}

/// 取消指定订阅（跨会话搜索）
pub fn cancel_subscription_by_id(subscription_id: &str) -> bool {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    for session in sessions.values_mut() {
        if session.subscriptions.remove(subscription_id).is_some() {
            return true;
        }
    }
    false
}

/// 取消指定连接的所有订阅
pub fn cancel_all_subscriptions_by_connection(connection_id: &str) -> u64 {
    let mut sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let mut count = 0u64;
    for session in sessions.values_mut() {
        if session.connection_id == connection_id {
            count += session.subscriptions.len() as u64;
            session.subscriptions.clear();
        }
    }
    count
}

// ---------- 4. 订阅重连与恢复 — 事件缓冲 ----------

/// 订阅检查点（用于重连恢复）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionCheckpoint {
    pub subscription_id: String,
    pub last_event_id: Option<String>,
    pub last_event_timestamp: Option<DateTime<Utc>>,
}

/// 缓冲事件
#[derive(Debug, Clone)]
pub struct BufferedEvent {
    pub id: String,
    pub channel: SubscriptionChannel,
    pub payload: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

/// 事件环形缓冲（最多 1000 条）
static EVENT_BUFFER: std::sync::OnceLock<Mutex<VecDeque<BufferedEvent>>> =
    std::sync::OnceLock::new();

const EVENT_BUFFER_CAPACITY: usize = 1000;

fn event_buffer() -> &'static Mutex<VecDeque<BufferedEvent>> {
    EVENT_BUFFER.get_or_init(|| Mutex::new(VecDeque::with_capacity(EVENT_BUFFER_CAPACITY)))
}

/// 向事件缓冲添加事件（环形缓冲，超出容量时丢弃最旧的）
pub fn push_buffered_event(channel: SubscriptionChannel, payload: serde_json::Value) -> String {
    let event_id = uuid::Uuid::new_v4().to_string();
    let buffered = BufferedEvent {
        id: event_id.clone(),
        channel,
        payload,
        timestamp: Utc::now(),
    };

    let mut buf = event_buffer().lock().unwrap_or_else(|e| e.into_inner());
    if buf.len() >= EVENT_BUFFER_CAPACITY {
        buf.pop_front();
    }
    buf.push_back(buffered);
    event_id
}

/// 获取指定频道在指定时间之后的缓冲事件
pub fn get_buffered_events_since(
    channel: SubscriptionChannel,
    since: Option<&DateTime<Utc>>,
) -> Vec<BufferedEvent> {
    let buf = event_buffer().lock().unwrap_or_else(|e| e.into_inner());
    buf.iter()
        .filter(|e| e.channel == channel)
        .filter(|e| match since {
            Some(s) => e.timestamp > *s,
            None => true,
        })
        .cloned()
        .collect()
}

/// 获取缓冲事件数量
pub fn get_buffered_event_count() -> usize {
    let buf = event_buffer().lock().unwrap_or_else(|e| e.into_inner());
    buf.len()
}

// ---------- 5. 订阅统计 ----------

/// 频道统计
#[derive(Debug, Clone)]
pub struct ChannelStat {
    pub channel: String,
    pub subscription_count: u64,
    pub events_published: u64,
}

/// 订阅统计
#[derive(Debug, Clone)]
pub struct SubscriptionStats {
    pub total_sessions: u64,
    pub total_subscriptions: u64,
    pub active_connections: u64,
    pub events_per_second: f64,
    pub top_channels: Vec<ChannelStat>,
    pub buffered_events: u64,
    pub total_events_published: u64,
}

/// 全局事件发布计数
static TOTAL_EVENTS_PUBLISHED: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// 事件发布时间窗口（用于计算 EPS）
static EVENT_TIMESTAMPS: std::sync::OnceLock<Mutex<VecDeque<DateTime<Utc>>>> =
    std::sync::OnceLock::new();

fn event_timestamps() -> &'static Mutex<VecDeque<DateTime<Utc>>> {
    EVENT_TIMESTAMPS.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// 记录事件发布（更新计数和时间窗口）
pub fn record_event_published(_channel: SubscriptionChannel) {
    TOTAL_EVENTS_PUBLISHED.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    let now = Utc::now();
    let mut timestamps = event_timestamps().lock().unwrap_or_else(|e| e.into_inner());
    timestamps.push_back(now);
    // 只保留最近 60 秒的时间戳
    let cutoff = now - chrono::Duration::seconds(60);
    while timestamps.front().is_some_and(|t| *t < cutoff) {
        timestamps.pop_front();
    }
}

/// 计算每秒事件数（过去 60 秒滑动窗口）
pub fn get_events_per_second() -> f64 {
    let timestamps = event_timestamps().lock().unwrap_or_else(|e| e.into_inner());
    if timestamps.len() < 2 {
        return 0.0;
    }
    let count = timestamps.len() as f64;
    let first = timestamps.front().unwrap();
    let last = timestamps.back().unwrap();
    let duration = (*last - *first).num_seconds().max(1) as f64;
    count / duration
}

/// 按频道统计订阅数
pub fn get_channel_stats() -> Vec<ChannelStat> {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let mut channel_counts: HashMap<SubscriptionChannel, u64> = HashMap::new();

    for session in sessions.values() {
        for sub in session.subscriptions.values() {
            *channel_counts.entry(sub.channel).or_insert(0) += 1;
        }
    }

    let mut stats: Vec<ChannelStat> = channel_counts
        .into_iter()
        .map(|(ch, count)| ChannelStat {
            channel: channel_name(ch),
            subscription_count: count,
            events_published: 0,
        })
        .collect();
    stats.sort_by(|a, b| b.subscription_count.cmp(&a.subscription_count));
    stats
}

fn channel_name(channel: SubscriptionChannel) -> String {
    match channel {
        SubscriptionChannel::ServiceHealth => "service_health",
        SubscriptionChannel::MasterDataChanged => "master_data_changed",
        SubscriptionChannel::NotificationReceived => "notification_received",
        SubscriptionChannel::WorkflowTaskAssigned => "workflow_task_assigned",
        SubscriptionChannel::OrderStatusChanged => "order_status_changed",
        SubscriptionChannel::DataChanged => "data_changed",
    }
    .to_string()
}

/// 获取完整订阅统计
pub fn get_subscription_stats() -> SubscriptionStats {
    let sessions = subscription_sessions()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let total_subscriptions: usize = sessions.values().map(|s| s.subscriptions.len()).sum();

    let mut channel_counts: HashMap<SubscriptionChannel, u64> = HashMap::new();
    for session in sessions.values() {
        for sub in session.subscriptions.values() {
            *channel_counts.entry(sub.channel).or_insert(0) += 1;
        }
    }

    let mut top_channels: Vec<ChannelStat> = channel_counts
        .into_iter()
        .map(|(ch, count)| ChannelStat {
            channel: channel_name(ch),
            subscription_count: count,
            events_published: 0,
        })
        .collect();
    top_channels.sort_by(|a, b| b.subscription_count.cmp(&a.subscription_count));
    top_channels.truncate(10);

    SubscriptionStats {
        total_sessions: sessions.len() as u64,
        total_subscriptions: total_subscriptions as u64,
        active_connections: sessions.len() as u64,
        events_per_second: get_events_per_second(),
        top_channels,
        buffered_events: get_buffered_event_count() as u64,
        total_events_published: TOTAL_EVENTS_PUBLISHED.load(std::sync::atomic::Ordering::Relaxed),
    }
}

// ---------- 6. GraphQL Gql 类型 ----------

/// 过滤操作符 GraphQL 枚举
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterOperatorGql {
    Eq,
    Ne,
    Gt,
    Lt,
    Gte,
    Lte,
    Contains,
    In,
    NotIn,
    Regex,
}

/// 过滤条件 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct FilterConditionGql {
    pub field: String,
    pub operator: FilterOperatorGql,
    pub value: serde_json::Value,
}

/// 订阅过滤器 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionFilterGql {
    pub include_fields: Option<Vec<String>>,
    pub exclude_fields: Option<Vec<String>>,
    pub conditions: Option<Vec<FilterConditionGql>>,
    pub deduplicate: bool,
    pub dedup_key: Option<String>,
}

/// 更新类型 GraphQL 枚举
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpdateTypeGql {
    Created,
    Updated,
    Deleted,
    Delta,
    Full,
}

/// 数据变更事件 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct DataChangeEventGql {
    pub entity_type: String,
    pub entity_id: String,
    pub update_type: UpdateTypeGql,
    pub data: Option<serde_json::Value>,
    pub delta: Option<serde_json::Value>,
    pub version: u64,
    pub timestamp: String,
    pub source: String,
}

/// 订阅信息 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionInfoGql {
    pub id: String,
    pub operation_name: Option<String>,
    pub query: String,
    pub variables: Option<serde_json::Value>,
    pub channel: String,
    pub filter: Option<SubscriptionFilterGql>,
    pub created_at: String,
    pub events_received: u64,
    pub last_event_at: Option<String>,
}

/// 订阅会话 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionSessionGql {
    pub session_id: String,
    pub connection_id: String,
    pub user_id: Option<String>,
    pub subscription_count: u64,
    pub subscriptions: Vec<SubscriptionInfoGql>,
    pub connected_at: String,
    pub last_active: String,
}

/// 频道统计 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct ChannelStatGql {
    pub channel: String,
    pub subscription_count: u64,
    pub events_published: u64,
}

/// 订阅统计 GraphQL 类型
#[derive(SimpleObject, Clone)]
pub struct SubscriptionStatsGql {
    pub total_sessions: u64,
    pub total_subscriptions: u64,
    pub active_connections: u64,
    pub events_per_second: f64,
    pub top_channels: Vec<ChannelStatGql>,
    pub buffered_events: u64,
    pub total_events_published: u64,
}

// ---------- 转换函数 ----------

impl From<FilterOperator> for FilterOperatorGql {
    fn from(op: FilterOperator) -> Self {
        match op {
            FilterOperator::Eq => FilterOperatorGql::Eq,
            FilterOperator::Ne => FilterOperatorGql::Ne,
            FilterOperator::Gt => FilterOperatorGql::Gt,
            FilterOperator::Lt => FilterOperatorGql::Lt,
            FilterOperator::Gte => FilterOperatorGql::Gte,
            FilterOperator::Lte => FilterOperatorGql::Lte,
            FilterOperator::Contains => FilterOperatorGql::Contains,
            FilterOperator::In => FilterOperatorGql::In,
            FilterOperator::NotIn => FilterOperatorGql::NotIn,
            FilterOperator::Regex => FilterOperatorGql::Regex,
        }
    }
}

impl From<UpdateType> for UpdateTypeGql {
    fn from(t: UpdateType) -> Self {
        match t {
            UpdateType::Created => UpdateTypeGql::Created,
            UpdateType::Updated => UpdateTypeGql::Updated,
            UpdateType::Deleted => UpdateTypeGql::Deleted,
            UpdateType::Delta => UpdateTypeGql::Delta,
            UpdateType::Full => UpdateTypeGql::Full,
        }
    }
}

impl From<SubscriptionFilter> for SubscriptionFilterGql {
    fn from(f: SubscriptionFilter) -> Self {
        SubscriptionFilterGql {
            include_fields: f.include_fields,
            exclude_fields: f.exclude_fields,
            conditions: f.conditions.map(|conds| {
                conds
                    .into_iter()
                    .map(|c| FilterConditionGql {
                        field: c.field,
                        operator: c.operator.into(),
                        value: c.value,
                    })
                    .collect()
            }),
            deduplicate: f.deduplicate,
            dedup_key: f.dedup_key,
        }
    }
}

impl From<SubscriptionInfo> for SubscriptionInfoGql {
    fn from(info: SubscriptionInfo) -> Self {
        SubscriptionInfoGql {
            id: info.id,
            operation_name: info.operation_name,
            query: info.query,
            variables: info.variables,
            channel: channel_name(info.channel),
            filter: info.filter.map(|f| f.into()),
            created_at: info.created_at.to_rfc3339(),
            events_received: info.events_received,
            last_event_at: info.last_event_at.map(|t| t.to_rfc3339()),
        }
    }
}

impl From<SubscriptionSession> for SubscriptionSessionGql {
    fn from(session: SubscriptionSession) -> Self {
        let subscriptions: Vec<SubscriptionInfoGql> = session
            .subscriptions
            .values()
            .cloned()
            .map(|s| s.into())
            .collect();
        SubscriptionSessionGql {
            session_id: session.session_id,
            connection_id: session.connection_id,
            user_id: session.user_id,
            subscription_count: session.subscriptions.len() as u64,
            subscriptions,
            connected_at: session.connected_at.to_rfc3339(),
            last_active: session.last_active.to_rfc3339(),
        }
    }
}

impl From<ChannelStat> for ChannelStatGql {
    fn from(s: ChannelStat) -> Self {
        ChannelStatGql {
            channel: s.channel,
            subscription_count: s.subscription_count,
            events_published: s.events_published,
        }
    }
}

impl From<SubscriptionStats> for SubscriptionStatsGql {
    fn from(s: SubscriptionStats) -> Self {
        SubscriptionStatsGql {
            total_sessions: s.total_sessions,
            total_subscriptions: s.total_subscriptions,
            active_connections: s.active_connections,
            events_per_second: s.events_per_second,
            top_channels: s.top_channels.into_iter().map(|c| c.into()).collect(),
            buffered_events: s.buffered_events,
            total_events_published: s.total_events_published,
        }
    }
}
