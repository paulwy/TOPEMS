//! V44.0 Track E: GraphQL 生产级监控（自 graphql_schema.rs 拆分）
//!
//! 生产级可观测性：
//! 1. 全链路查询追踪（QueryTraceGql / start_trace / start_span / end_span / end_trace / list_traces）
//! 2. 实时指标（MetricsWindow / GraphqlMetricsGql / record_query_metric / record_error_metric / get_metrics）
//! 3. 告警集成（AlertLevel / AlertType / AlertChannelType / AlertRule / add/update/delete/test/acknowledge/resolve / check_alerts）
//! 4. 监控仪表盘 API（MonitoringDashboardStatsGql / QueryLatencyDistributionGql / TopSlowQueryGql / ErrorRateTrendGql / get_monitoring_dashboard / get_top_slow_queries / get_error_rate_trend）
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_monitoring::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。
//! `SubscriptionChannel`（V39.0 基础类型）仍定义于 `graphql_schema.rs`，此处经模块路径引用。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;

use crate::modules::graphql_federation::{simple_random_u128, simple_random_u64};
use crate::modules::graphql_schema::{get_federation_stats, global_event_bus, SubscriptionChannel};
use crate::modules::graphql_security::{get_security_event_count, get_security_events};

// ---------- 1. 全链路查询追踪 ----------

/// V44.0: Span 类型枚举
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SpanType {
    Parse,
    Validate,
    Resolve,
    CacheCheck,
    DataFetch,
    ExternalCall,
    DBQuery,
    Transform,
}

/// V44.0: 查询 Span
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct QuerySpanGql {
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub name: String,
    pub service: String,
    pub span_type: SpanType,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_ms: f64,
    pub attributes: serde_json::Value,
    pub status: String,
    pub error_message: Option<String>,
}

/// V44.0: 查询追踪
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct QueryTraceGql {
    pub trace_id: String,
    pub query_hash: Option<String>,
    pub operation_name: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_ms: f64,
    pub status: String,
    pub spans: Vec<QuerySpanGql>,
    pub error_message: Option<String>,
    pub user_id: Option<String>,
    pub client_info: Option<String>,
}

/// V44.0: 查询 Span 内部结构
#[derive(Clone)]
struct QuerySpan {
    span_id: String,
    parent_span_id: Option<String>,
    name: String,
    service: String,
    span_type: SpanType,
    start_time: DateTime<Utc>,
    end_time: Option<DateTime<Utc>>,
    duration_ms: f64,
    attributes: serde_json::Value,
    status: String,
    error_message: Option<String>,
}

impl QuerySpan {
    fn to_gql(&self) -> QuerySpanGql {
        QuerySpanGql {
            span_id: self.span_id.clone(),
            parent_span_id: self.parent_span_id.clone(),
            name: self.name.clone(),
            service: self.service.clone(),
            span_type: self.span_type,
            start_time: self.start_time.to_rfc3339(),
            end_time: self.end_time.map(|t| t.to_rfc3339()),
            duration_ms: self.duration_ms,
            attributes: self.attributes.clone(),
            status: self.status.clone(),
            error_message: self.error_message.clone(),
        }
    }
}

/// V44.0: 查询追踪内部结构
#[derive(Clone)]
struct QueryTrace {
    trace_id: String,
    query_hash: Option<String>,
    operation_name: Option<String>,
    start_time: DateTime<Utc>,
    end_time: Option<DateTime<Utc>>,
    duration_ms: f64,
    status: String,
    spans: Vec<QuerySpan>,
    error_message: Option<String>,
    user_id: Option<String>,
    client_info: Option<String>,
}

impl QueryTrace {
    fn to_gql(&self) -> QueryTraceGql {
        QueryTraceGql {
            trace_id: self.trace_id.clone(),
            query_hash: self.query_hash.clone(),
            operation_name: self.operation_name.clone(),
            start_time: self.start_time.to_rfc3339(),
            end_time: self.end_time.map(|t| t.to_rfc3339()),
            duration_ms: self.duration_ms,
            status: self.status.clone(),
            spans: self.spans.iter().map(|s| s.to_gql()).collect(),
            error_message: self.error_message.clone(),
            user_id: self.user_id.clone(),
            client_info: self.client_info.clone(),
        }
    }
}

/// V44.0: 全局追踪存储（环形缓冲，容量 5000）
static TRACES: std::sync::OnceLock<Mutex<VecDeque<QueryTrace>>> = std::sync::OnceLock::new();
const MAX_TRACES: usize = 5000;

fn traces() -> &'static Mutex<VecDeque<QueryTrace>> {
    TRACES.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// V44.0: 生成 ULID 风格的 trace_id
fn generate_trace_id() -> String {
    let timestamp = Utc::now().timestamp_millis() as u64;
    let random_part = simple_random_u128();
    format!("{:016x}{:032x}", timestamp, random_part)
}

fn generate_span_id() -> String {
    let id = simple_random_u64();
    format!("{:016x}", id)
}

/// V44.0: 开始新的追踪
pub fn start_trace(
    query_hash: Option<String>,
    operation_name: Option<String>,
    user_id: Option<String>,
    client_info: Option<String>,
) -> String {
    let trace_id = generate_trace_id();
    let trace = QueryTrace {
        trace_id: trace_id.clone(),
        query_hash,
        operation_name,
        start_time: Utc::now(),
        end_time: None,
        duration_ms: 0.0,
        status: "running".to_string(),
        spans: Vec::new(),
        error_message: None,
        user_id,
        client_info,
    };
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if traces_lock.len() >= MAX_TRACES {
        traces_lock.pop_front();
    }
    traces_lock.push_back(trace);
    trace_id
}

/// V44.0: 开始一个 Span
pub fn start_span(
    trace_id: &str,
    parent_span_id: Option<String>,
    name: String,
    service: String,
    span_type: SpanType,
    attributes: Option<serde_json::Value>,
) -> Option<String> {
    let span_id = generate_span_id();
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(trace) = traces_lock.iter_mut().find(|t| t.trace_id == trace_id) {
        let span = QuerySpan {
            span_id: span_id.clone(),
            parent_span_id,
            name,
            service,
            span_type,
            start_time: Utc::now(),
            end_time: None,
            duration_ms: 0.0,
            attributes: attributes.unwrap_or(serde_json::json!({})),
            status: "running".to_string(),
            error_message: None,
        };
        trace.spans.push(span);
        Some(span_id)
    } else {
        None
    }
}

/// V44.0: 结束一个 Span
pub fn end_span(trace_id: &str, span_id: &str, error: Option<String>) {
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(trace) = traces_lock.iter_mut().find(|t| t.trace_id == trace_id) {
        if let Some(span) = trace.spans.iter_mut().find(|s| s.span_id == span_id) {
            let end = Utc::now();
            span.end_time = Some(end);
            span.duration_ms =
                (end - span.start_time).num_microseconds().unwrap_or(0) as f64 / 1000.0;
            span.status = if error.is_some() {
                "error".to_string()
            } else {
                "ok".to_string()
            };
            span.error_message = error;
        }
    }
}

/// V44.0: 结束追踪
pub fn end_trace(trace_id: &str, error: Option<String>) {
    let mut traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(trace) = traces_lock.iter_mut().find(|t| t.trace_id == trace_id) {
        let end = Utc::now();
        trace.end_time = Some(end);
        trace.duration_ms =
            (end - trace.start_time).num_microseconds().unwrap_or(0) as f64 / 1000.0;
        trace.status = if error.is_some() {
            "error".to_string()
        } else {
            "ok".to_string()
        };
        trace.error_message = error;
    }
}

/// V44.0: 获取单个追踪
pub fn get_trace(trace_id: &str) -> Option<QueryTraceGql> {
    let traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    traces_lock
        .iter()
        .find(|t| t.trace_id == trace_id)
        .map(|t| t.to_gql())
}

/// V44.0: 列出追踪（支持过滤）
pub fn list_traces(
    query_hash: Option<String>,
    operation_name: Option<String>,
    status: Option<String>,
    limit: Option<usize>,
) -> Vec<QueryTraceGql> {
    let traces_lock = traces().lock().unwrap_or_else(|e| e.into_inner());
    let limit = limit.unwrap_or(100);
    traces_lock
        .iter()
        .rev()
        .filter(|t| {
            if let Some(ref qh) = query_hash {
                if t.query_hash.as_deref() != Some(qh.as_str()) {
                    return false;
                }
            }
            if let Some(ref op) = operation_name {
                if t.operation_name.as_deref() != Some(op.as_str()) {
                    return false;
                }
            }
            if let Some(ref s) = status {
                if t.status != *s {
                    return false;
                }
            }
            true
        })
        .take(limit)
        .map(|t| t.to_gql())
        .collect()
}

// ---------- 2. 实时指标 ----------

/// V44.0: 指标窗口大小
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MetricsWindow {
    OneMinute,
    FiveMinutes,
    FifteenMinutes,
    OneHour,
}

impl MetricsWindow {
    fn duration_seconds(&self) -> i64 {
        match self {
            Self::OneMinute => 60,
            Self::FiveMinutes => 300,
            Self::FifteenMinutes => 900,
            Self::OneHour => 3600,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::OneMinute => "1m",
            Self::FiveMinutes => "5m",
            Self::FifteenMinutes => "15m",
            Self::OneHour => "1h",
        }
    }
}

/// V44.0: 按操作分组的指标
#[derive(SimpleObject, Clone)]
pub struct OperationMetricGql {
    pub operation_name: String,
    pub count: u64,
    pub avg_duration_ms: f64,
    pub p95_ms: f64,
    pub error_count: u64,
    pub cache_hit_rate: f64,
}

/// V44.0: 按服务分组的指标
#[derive(SimpleObject, Clone)]
pub struct ServiceMetricGql {
    pub service_name: String,
    pub request_count: u64,
    pub avg_latency_ms: f64,
    pub error_count: u64,
}

/// V44.0: GraphQL 实时指标
#[derive(SimpleObject, Clone)]
pub struct GraphqlMetricsGql {
    pub qps: f64,
    pub latency_p50_ms: f64,
    pub latency_p95_ms: f64,
    pub latency_p99_ms: f64,
    pub error_rate: f64,
    pub cache_hit_rate: f64,
    pub total_queries: u64,
    pub total_errors: u64,
    pub total_cache_hits: u64,
    pub total_cache_misses: u64,
    pub active_subscriptions: u64,
    pub ws_connections: u64,
    pub by_operation: Vec<OperationMetricGql>,
    pub by_service: Vec<ServiceMetricGql>,
    pub window_start: String,
    pub window_end: String,
    pub window_size: String,
}

/// V44.0: 查询记录（用于滑动窗口统计）
#[derive(Clone)]
struct QueryRecord {
    timestamp: DateTime<Utc>,
    operation_name: Option<String>,
    duration_ms: f64,
    success: bool,
    cache_hit: bool,
    service: Option<String>,
}

/// V44.0: 指标收集器内部状态
struct MetricsCollectorState {
    query_records: VecDeque<QueryRecord>,
    total_queries: u64,
    total_errors: u64,
    total_cache_hits: u64,
    total_cache_misses: u64,
    active_subscriptions: u64,
    ws_connections: u64,
    by_operation_stats: HashMap<String, OperationStats>,
    by_service_stats: HashMap<String, ServiceStats>,
}

#[derive(Clone, Default)]
struct OperationStats {
    count: u64,
    total_duration_ms: f64,
    error_count: u64,
    cache_hits: u64,
    cache_misses: u64,
    durations: Vec<f64>,
}

#[derive(Clone, Default)]
struct ServiceStats {
    request_count: u64,
    total_latency_ms: f64,
    error_count: u64,
}

static METRICS_COLLECTOR: std::sync::OnceLock<Mutex<MetricsCollectorState>> =
    std::sync::OnceLock::new();

fn metrics_collector() -> &'static Mutex<MetricsCollectorState> {
    METRICS_COLLECTOR.get_or_init(|| {
        Mutex::new(MetricsCollectorState {
            query_records: VecDeque::new(),
            total_queries: 0,
            total_errors: 0,
            total_cache_hits: 0,
            total_cache_misses: 0,
            active_subscriptions: 0,
            ws_connections: 0,
            by_operation_stats: HashMap::new(),
            by_service_stats: HashMap::new(),
        })
    })
}

const MAX_QUERY_RECORDS: usize = 10000;

/// V44.0: 记录查询指标
pub fn record_query_metric(
    operation_name: Option<String>,
    duration_ms: f64,
    success: bool,
    cache_hit: bool,
    service: Option<String>,
) {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_queries += 1;
    if !success {
        state.total_errors += 1;
    }
    if cache_hit {
        state.total_cache_hits += 1;
    } else {
        state.total_cache_misses += 1;
    }

    let record = QueryRecord {
        timestamp: Utc::now(),
        operation_name: operation_name.clone(),
        duration_ms,
        success,
        cache_hit,
        service: service.clone(),
    };

    if state.query_records.len() >= MAX_QUERY_RECORDS {
        state.query_records.pop_front();
    }
    state.query_records.push_back(record);

    if let Some(ref op) = operation_name {
        let stats = state.by_operation_stats.entry(op.clone()).or_default();
        stats.count += 1;
        stats.total_duration_ms += duration_ms;
        if !success {
            stats.error_count += 1;
        }
        if cache_hit {
            stats.cache_hits += 1;
        } else {
            stats.cache_misses += 1;
        }
        stats.durations.push(duration_ms);
        if stats.durations.len() > 1000 {
            stats.durations.remove(0);
        }
    }

    if let Some(ref svc) = service {
        let stats = state.by_service_stats.entry(svc.clone()).or_default();
        stats.request_count += 1;
        stats.total_latency_ms += duration_ms;
        if !success {
            stats.error_count += 1;
        }
    }
}

/// V44.0: 记录错误
pub fn record_error_metric() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_errors += 1;
}

/// V44.0: 记录缓存命中
pub fn record_cache_hit_metric() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_cache_hits += 1;
}

/// V44.0: 记录缓存未命中
pub fn record_cache_miss_metric() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.total_cache_misses += 1;
}

/// V44.0: 设置活跃订阅数
pub fn set_active_subscriptions(count: u64) {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.active_subscriptions = count;
}

/// V44.0: 设置 WS 连接数
pub fn set_ws_connections(count: u64) {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.ws_connections = count;
}

/// V44.0: 计算百分位
fn percentile(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = (sorted.len() as f64 * p / 100.0) as usize;
    let idx = idx.min(sorted.len() - 1);
    sorted[idx]
}

/// V44.0: 获取指定窗口的指标
pub fn get_metrics(window: MetricsWindow) -> GraphqlMetricsGql {
    let state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let window_records: Vec<&QueryRecord> = state
        .query_records
        .iter()
        .filter(|r| r.timestamp >= window_start)
        .collect();

    let count = window_records.len() as f64;
    let qps = if window.duration_seconds() > 0 {
        count / window.duration_seconds() as f64
    } else {
        0.0
    };

    let mut durations: Vec<f64> = window_records.iter().map(|r| r.duration_ms).collect();
    durations.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let latency_p50 = percentile(&durations, 50.0);
    let latency_p95 = percentile(&durations, 95.0);
    let latency_p99 = percentile(&durations, 99.0);

    let error_count = window_records.iter().filter(|r| !r.success).count() as f64;
    let error_rate = if count > 0.0 {
        error_count / count * 100.0
    } else {
        0.0
    };

    let cache_hit_count = window_records.iter().filter(|r| r.cache_hit).count() as f64;
    let cache_total =
        cache_hit_count + window_records.iter().filter(|r| !r.cache_hit).count() as f64;
    let cache_hit_rate = if cache_total > 0.0 {
        cache_hit_count / cache_total * 100.0
    } else {
        0.0
    };

    let mut by_operation_map: HashMap<String, OperationStats> = HashMap::new();
    for record in &window_records {
        if let Some(ref op) = record.operation_name {
            let stats = by_operation_map.entry(op.clone()).or_default();
            stats.count += 1;
            stats.total_duration_ms += record.duration_ms;
            if !record.success {
                stats.error_count += 1;
            }
            if record.cache_hit {
                stats.cache_hits += 1;
            } else {
                stats.cache_misses += 1;
            }
            stats.durations.push(record.duration_ms);
        }
    }

    let mut by_operation: Vec<OperationMetricGql> = by_operation_map
        .into_iter()
        .map(|(name, stats)| {
            let avg_duration = if stats.count > 0 {
                stats.total_duration_ms / stats.count as f64
            } else {
                0.0
            };
            let mut sorted_durations = stats.durations.clone();
            sorted_durations.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            let p95 = percentile(&sorted_durations, 95.0);
            let cache_total_op = stats.cache_hits + stats.cache_misses;
            let cache_hit_rate_op = if cache_total_op > 0 {
                stats.cache_hits as f64 / cache_total_op as f64 * 100.0
            } else {
                0.0
            };
            OperationMetricGql {
                operation_name: name,
                count: stats.count,
                avg_duration_ms: avg_duration,
                p95_ms: p95,
                error_count: stats.error_count,
                cache_hit_rate: cache_hit_rate_op,
            }
        })
        .collect();
    by_operation.sort_by(|a, b| b.count.cmp(&a.count));

    let mut by_service_map: HashMap<String, ServiceStats> = HashMap::new();
    for record in &window_records {
        if let Some(ref svc) = record.service {
            let stats = by_service_map.entry(svc.clone()).or_default();
            stats.request_count += 1;
            stats.total_latency_ms += record.duration_ms;
            if !record.success {
                stats.error_count += 1;
            }
        }
    }

    let mut by_service: Vec<ServiceMetricGql> = by_service_map
        .into_iter()
        .map(|(name, stats)| {
            let avg_latency = if stats.request_count > 0 {
                stats.total_latency_ms / stats.request_count as f64
            } else {
                0.0
            };
            ServiceMetricGql {
                service_name: name,
                request_count: stats.request_count,
                avg_latency_ms: avg_latency,
                error_count: stats.error_count,
            }
        })
        .collect();
    by_service.sort_by(|a, b| b.request_count.cmp(&a.request_count));

    GraphqlMetricsGql {
        qps,
        latency_p50_ms: latency_p50,
        latency_p95_ms: latency_p95,
        latency_p99_ms: latency_p99,
        error_rate,
        cache_hit_rate,
        total_queries: state.total_queries,
        total_errors: state.total_errors,
        total_cache_hits: state.total_cache_hits,
        total_cache_misses: state.total_cache_misses,
        active_subscriptions: state.active_subscriptions,
        ws_connections: state.ws_connections,
        by_operation,
        by_service,
        window_start: window_start.to_rfc3339(),
        window_end: now.to_rfc3339(),
        window_size: window.as_str().to_string(),
    }
}

/// V44.0: 重置指标
pub fn reset_metrics() {
    let mut state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    state.query_records.clear();
    state.total_queries = 0;
    state.total_errors = 0;
    state.total_cache_hits = 0;
    state.total_cache_misses = 0;
    state.by_operation_stats.clear();
    state.by_service_stats.clear();
}

// ---------- 3. 告警集成 ----------

/// V44.0: 告警级别
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AlertLevel {
    Info,
    Warning,
    Critical,
    Emergency,
}

impl AlertLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Info => "info",
            Self::Warning => "warning",
            Self::Critical => "critical",
            Self::Emergency => "emergency",
        }
    }
}

/// V44.0: 告警类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AlertType {
    HighLatency,
    HighErrorRate,
    LowCacheHit,
    HighQPS,
    SubscriptionError,
    ServiceDown,
    SecurityBreach,
}

impl AlertType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::HighLatency => "high_latency",
            Self::HighErrorRate => "high_error_rate",
            Self::LowCacheHit => "low_cache_hit",
            Self::HighQPS => "high_qps",
            Self::SubscriptionError => "subscription_error",
            Self::ServiceDown => "service_down",
            Self::SecurityBreach => "security_breach",
        }
    }
}

/// V44.0: 告警渠道类型
#[derive(async_graphql::Enum, Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AlertChannelType {
    Log,
    Webhook,
    Email,
    WebSocket,
}

/// V44.0: GraphQL 告警
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct GraphqlAlertGql {
    pub id: String,
    pub alert_type: AlertType,
    pub level: AlertLevel,
    pub message: String,
    pub value: f64,
    pub threshold: f64,
    pub started_at: String,
    pub acknowledged: bool,
    pub resolved: bool,
    pub resolved_at: Option<String>,
    pub labels: serde_json::Value,
}

/// V44.0: 告警规则
#[derive(SimpleObject, Clone)]
pub struct AlertRuleGql {
    pub id: String,
    pub name: String,
    pub alert_type: AlertType,
    pub level: AlertLevel,
    pub threshold: f64,
    pub duration_seconds: i64,
    pub window_size: String,
    pub enabled: bool,
    pub cooldown_seconds: i64,
}

/// V44.0: 告警规则输入
#[derive(async_graphql::InputObject, Clone)]
pub struct AlertRuleInput {
    pub name: String,
    pub alert_type: AlertType,
    pub level: AlertLevel,
    pub threshold: f64,
    pub duration_seconds: i64,
    pub window_size: MetricsWindow,
    pub enabled: bool,
    pub cooldown_seconds: i64,
}

/// V44.0: 告警内部结构
#[derive(Clone)]
struct GraphqlAlert {
    id: String,
    alert_type: AlertType,
    level: AlertLevel,
    message: String,
    value: f64,
    threshold: f64,
    started_at: DateTime<Utc>,
    acknowledged: bool,
    resolved: bool,
    resolved_at: Option<DateTime<Utc>>,
    labels: serde_json::Value,
}

impl GraphqlAlert {
    fn to_gql(&self) -> GraphqlAlertGql {
        GraphqlAlertGql {
            id: self.id.clone(),
            alert_type: self.alert_type,
            level: self.level,
            message: self.message.clone(),
            value: self.value,
            threshold: self.threshold,
            started_at: self.started_at.to_rfc3339(),
            acknowledged: self.acknowledged,
            resolved: self.resolved,
            resolved_at: self.resolved_at.map(|t| t.to_rfc3339()),
            labels: self.labels.clone(),
        }
    }
}

/// V44.0: 告警规则内部结构
#[derive(Clone)]
struct AlertRule {
    id: String,
    name: String,
    alert_type: AlertType,
    level: AlertLevel,
    threshold: f64,
    duration_seconds: i64,
    window_size: MetricsWindow,
    enabled: bool,
    cooldown_seconds: i64,
    last_triggered: Option<DateTime<Utc>>,
    triggered_at: Option<DateTime<Utc>>,
}

impl AlertRule {
    fn to_gql(&self) -> AlertRuleGql {
        AlertRuleGql {
            id: self.id.clone(),
            name: self.name.clone(),
            alert_type: self.alert_type,
            level: self.level,
            threshold: self.threshold,
            duration_seconds: self.duration_seconds,
            window_size: self.window_size.as_str().to_string(),
            enabled: self.enabled,
            cooldown_seconds: self.cooldown_seconds,
        }
    }
}

struct AlertManagerState {
    alerts: VecDeque<GraphqlAlert>,
    rules: Vec<AlertRule>,
    last_check: Option<DateTime<Utc>>,
}

static ALERT_MANAGER: std::sync::OnceLock<Mutex<AlertManagerState>> = std::sync::OnceLock::new();

const MAX_ALERTS: usize = 1000;

fn alert_manager() -> &'static Mutex<AlertManagerState> {
    ALERT_MANAGER.get_or_init(|| {
        Mutex::new(AlertManagerState {
            alerts: VecDeque::new(),
            rules: Vec::new(),
            last_check: None,
        })
    })
}

fn generate_alert_id() -> String {
    let id = simple_random_u64();
    format!("alert_{:016x}", id)
}

fn generate_rule_id() -> String {
    let id = simple_random_u64();
    format!("rule_{:016x}", id)
}

/// V44.0: 添加告警规则
pub fn add_alert_rule(input: AlertRuleInput) -> String {
    let id = generate_rule_id();
    let rule = AlertRule {
        id: id.clone(),
        name: input.name,
        alert_type: input.alert_type,
        level: input.level,
        threshold: input.threshold,
        duration_seconds: input.duration_seconds,
        window_size: input.window_size,
        enabled: input.enabled,
        cooldown_seconds: input.cooldown_seconds,
        last_triggered: None,
        triggered_at: None,
    };
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state.rules.push(rule);
    id
}

/// V44.0: 更新告警规则
pub fn update_alert_rule(id: &str, input: AlertRuleInput) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(rule) = state.rules.iter_mut().find(|r| r.id == id) {
        rule.name = input.name;
        rule.alert_type = input.alert_type;
        rule.level = input.level;
        rule.threshold = input.threshold;
        rule.duration_seconds = input.duration_seconds;
        rule.window_size = input.window_size;
        rule.enabled = input.enabled;
        rule.cooldown_seconds = input.cooldown_seconds;
        true
    } else {
        false
    }
}

/// V44.0: 删除告警规则
pub fn delete_alert_rule(id: &str) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    let before = state.rules.len();
    state.rules.retain(|r| r.id != id);
    state.rules.len() < before
}

/// V44.0: 触发告警
fn trigger_alert_internal(
    alert_type: AlertType,
    level: AlertLevel,
    message: String,
    value: f64,
    threshold: f64,
    labels: serde_json::Value,
) -> String {
    let id = generate_alert_id();
    let alert = GraphqlAlert {
        id: id.clone(),
        alert_type,
        level,
        message: message.clone(),
        value,
        threshold,
        started_at: Utc::now(),
        acknowledged: false,
        resolved: false,
        resolved_at: None,
        labels,
    };
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if state.alerts.len() >= MAX_ALERTS {
        state.alerts.pop_front();
    }
    state.alerts.push_back(alert);

    let alert_clone = state.alerts.back().unwrap().clone();
    drop(state);

    tracing::warn!(
        "[graphql-alert] 告警触发: type={:?}, level={:?}, value={}, threshold={}, message={}",
        alert_type,
        level,
        value,
        threshold,
        message
    );

    let alert_gql = alert_clone.to_gql();
    let event = serde_json::to_value(&alert_gql).unwrap_or(serde_json::json!({}));
    global_event_bus().publish(SubscriptionChannel::NotificationReceived, event);

    id
}

/// V44.0: 手动触发测试告警
pub fn test_alert(alert_type: AlertType, level: AlertLevel) -> String {
    trigger_alert_internal(
        alert_type,
        level,
        format!("Test alert for {:?}", alert_type),
        0.0,
        0.0,
        serde_json::json!({"test": true}),
    )
}

/// V44.0: 确认告警
pub fn acknowledge_alert(id: &str) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(alert) = state.alerts.iter_mut().find(|a| a.id == id) {
        alert.acknowledged = true;
        true
    } else {
        false
    }
}

/// V44.0: 解决告警
pub fn resolve_alert(id: &str) -> bool {
    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(alert) = state.alerts.iter_mut().find(|a| a.id == id) {
        alert.resolved = true;
        alert.resolved_at = Some(Utc::now());
        true
    } else {
        false
    }
}

/// V44.0: 获取告警列表
pub fn get_alerts(
    status: Option<String>,
    level: Option<AlertLevel>,
    limit: Option<usize>,
) -> Vec<GraphqlAlertGql> {
    let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    let limit = limit.unwrap_or(100);
    state
        .alerts
        .iter()
        .rev()
        .filter(|a| {
            if let Some(ref s) = status {
                match s.as_str() {
                    "active" if a.resolved => {
                        return false;
                    }
                    "resolved" if !a.resolved => {
                        return false;
                    }
                    "acknowledged" if !a.acknowledged => {
                        return false;
                    }
                    _ => {}
                }
            }
            if let Some(l) = level {
                if a.level != l {
                    return false;
                }
            }
            true
        })
        .take(limit)
        .map(|a| a.to_gql())
        .collect()
}

/// V44.0: 获取活跃告警
pub fn get_active_alerts() -> Vec<GraphqlAlertGql> {
    let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state
        .alerts
        .iter()
        .rev()
        .filter(|a| !a.resolved)
        .map(|a| a.to_gql())
        .collect()
}

/// V44.0: 获取告警规则列表
pub fn get_alert_rules() -> Vec<AlertRuleGql> {
    let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state.rules.iter().map(|r| r.to_gql()).collect()
}

/// V44.0: 检查告警规则
pub fn check_alerts() {
    let rules_to_check = {
        let state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
        state.rules.clone()
    };

    for rule in rules_to_check {
        if !rule.enabled {
            continue;
        }

        let metrics = get_metrics(rule.window_size);
        let value = match rule.alert_type {
            AlertType::HighLatency => metrics.latency_p95_ms,
            AlertType::HighErrorRate => metrics.error_rate,
            AlertType::LowCacheHit => metrics.cache_hit_rate,
            AlertType::HighQPS => metrics.qps,
            AlertType::SubscriptionError => metrics.active_subscriptions as f64,
            AlertType::ServiceDown => metrics.ws_connections as f64,
            AlertType::SecurityBreach => get_security_event_count() as f64,
        };

        let should_trigger = match rule.alert_type {
            AlertType::LowCacheHit => value < rule.threshold,
            _ => value > rule.threshold,
        };

        if should_trigger {
            let now = Utc::now();
            let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
            if let Some(rule_mut) = state.rules.iter_mut().find(|r| r.id == rule.id) {
                if rule_mut.triggered_at.is_none() {
                    rule_mut.triggered_at = Some(now);
                }

                let triggered_duration = now - rule_mut.triggered_at.unwrap_or(now);

                if triggered_duration.num_seconds() >= rule.duration_seconds {
                    let in_cooldown = if let Some(last) = rule_mut.last_triggered {
                        (now - last).num_seconds() < rule.cooldown_seconds
                    } else {
                        false
                    };

                    if !in_cooldown {
                        rule_mut.last_triggered = Some(now);
                        let message = format!(
                            "Alert '{}' triggered: {:.2} {} threshold {:.2}",
                            rule.name,
                            value,
                            if matches!(rule.alert_type, AlertType::LowCacheHit) {
                                "below"
                            } else {
                                "exceeds"
                            },
                            rule.threshold
                        );
                        drop(state);
                        trigger_alert_internal(
                            rule.alert_type,
                            rule.level,
                            message,
                            value,
                            rule.threshold,
                            serde_json::json!({"rule_id": rule.id, "rule_name": rule.name}),
                        );
                    }
                }
            }
        } else {
            let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
            if let Some(rule_mut) = state.rules.iter_mut().find(|r| r.id == rule.id) {
                rule_mut.triggered_at = None;
            }
        }
    }

    let mut state = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    state.last_check = Some(Utc::now());
}

// ---------- 4. 监控仪表盘 API ----------

/// V44.0: 监控仪表盘概览统计
#[derive(SimpleObject, Clone)]
pub struct MonitoringDashboardStatsGql {
    pub total_queries: u64,
    pub total_errors: u64,
    pub total_traces: u64,
    pub total_alerts: u64,
    pub active_alerts: u64,
    pub active_ws_connections: u64,
    pub active_subscriptions: u64,
    pub qps: f64,
    pub error_rate: f64,
    pub avg_latency_ms: f64,
    pub p95_latency_ms: f64,
    pub cache_hit_rate: f64,
    pub security_events_last_hour: u64,
    pub federation_cache_hits: u64,
    pub federation_cache_misses: u64,
}

/// V44.0: 查询延迟分布
#[derive(SimpleObject, Clone)]
pub struct QueryLatencyDistributionGql {
    pub buckets: Vec<f64>,
    pub counts: Vec<u64>,
    pub total_count: u64,
}

/// V44.0: 慢查询 Top N
#[derive(SimpleObject, Clone)]
pub struct TopSlowQueryGql {
    pub query_hash: Option<String>,
    pub operation_name: Option<String>,
    pub avg_duration_ms: f64,
    pub count: u64,
    pub total_time_ms: f64,
    pub max_duration_ms: f64,
}

/// V44.0: 错误率趋势
#[derive(SimpleObject, Clone)]
pub struct ErrorRateTrendGql {
    pub timestamps: Vec<String>,
    pub error_rates: Vec<f64>,
    pub total_requests: Vec<u64>,
    pub error_counts: Vec<u64>,
    pub interval_seconds: i64,
}

/// V44.0: 获取监控仪表盘概览
pub fn get_monitoring_dashboard() -> MonitoringDashboardStatsGql {
    let metrics = get_metrics(MetricsWindow::FiveMinutes);
    let traces = traces().lock().unwrap_or_else(|e| e.into_inner());
    let alerts = alert_manager().lock().unwrap_or_else(|e| e.into_inner());
    let active_alerts = alerts.alerts.iter().filter(|a| !a.resolved).count() as u64;
    let fed_stats = get_federation_stats();

    let security_events = get_security_events(1000);
    let one_hour_ago = Utc::now() - chrono::Duration::hours(1);
    let security_events_last_hour = security_events
        .iter()
        .filter(|e| {
            DateTime::parse_from_rfc3339(&e.timestamp.to_rfc3339())
                .map(|t| t.naive_utc() > one_hour_ago.naive_utc())
                .unwrap_or(false)
        })
        .count() as u64;

    MonitoringDashboardStatsGql {
        total_queries: metrics.total_queries,
        total_errors: metrics.total_errors,
        total_traces: traces.len() as u64,
        total_alerts: alerts.alerts.len() as u64,
        active_alerts,
        active_ws_connections: metrics.ws_connections,
        active_subscriptions: metrics.active_subscriptions,
        qps: metrics.qps,
        error_rate: metrics.error_rate,
        avg_latency_ms: metrics.latency_p50_ms,
        p95_latency_ms: metrics.latency_p95_ms,
        cache_hit_rate: metrics.cache_hit_rate,
        security_events_last_hour,
        federation_cache_hits: fed_stats.cache_hits,
        federation_cache_misses: fed_stats.cache_misses,
    }
}

/// V44.0: 获取查询延迟分布
pub fn get_query_latency_distribution(window: MetricsWindow) -> QueryLatencyDistributionGql {
    let metrics_collector_state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let buckets = vec![
        1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0,
    ];
    let mut counts = vec![0u64; buckets.len() + 1];

    let mut total_count = 0u64;

    for record in &metrics_collector_state.query_records {
        if record.timestamp >= window_start {
            total_count += 1;
            let duration = record.duration_ms;
            let mut placed = false;
            for (i, bucket) in buckets.iter().enumerate() {
                if duration <= *bucket {
                    counts[i] += 1;
                    placed = true;
                    break;
                }
            }
            if !placed {
                counts[buckets.len()] += 1;
            }
        }
    }

    QueryLatencyDistributionGql {
        buckets,
        counts,
        total_count,
    }
}

/// V44.0: 获取慢查询 Top N
pub fn get_top_slow_queries(limit: Option<usize>, window: MetricsWindow) -> Vec<TopSlowQueryGql> {
    let limit = limit.unwrap_or(10);
    let metrics_collector_state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let mut by_operation: HashMap<String, SlowQueryStats> = HashMap::new();

    for record in &metrics_collector_state.query_records {
        if record.timestamp >= window_start {
            let key = record
                .operation_name
                .clone()
                .unwrap_or_else(|| "unknown".to_string());
            let stats = by_operation.entry(key).or_default();
            stats.count += 1;
            stats.total_time_ms += record.duration_ms;
            if record.duration_ms > stats.max_duration_ms {
                stats.max_duration_ms = record.duration_ms;
            }
        }
    }

    let mut result: Vec<TopSlowQueryGql> = by_operation
        .into_iter()
        .map(|(op, stats)| TopSlowQueryGql {
            query_hash: None,
            operation_name: Some(op),
            avg_duration_ms: if stats.count > 0 {
                stats.total_time_ms / stats.count as f64
            } else {
                0.0
            },
            count: stats.count,
            total_time_ms: stats.total_time_ms,
            max_duration_ms: stats.max_duration_ms,
        })
        .collect();

    result.sort_by(|a, b| {
        b.avg_duration_ms
            .partial_cmp(&a.avg_duration_ms)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    result.truncate(limit);
    result
}

#[derive(Default)]
struct SlowQueryStats {
    count: u64,
    total_time_ms: f64,
    max_duration_ms: f64,
}

/// V44.0: 获取错误率趋势
pub fn get_error_rate_trend(
    window: MetricsWindow,
    interval_seconds: Option<i64>,
) -> ErrorRateTrendGql {
    let interval = interval_seconds.unwrap_or(60);
    let metrics_collector_state = metrics_collector()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let now = Utc::now();
    let window_duration = chrono::Duration::seconds(window.duration_seconds());
    let window_start = now - window_duration;

    let num_intervals = (window.duration_seconds() / interval) as usize;
    let mut timestamps = Vec::with_capacity(num_intervals);
    let mut total_requests = vec![0u64; num_intervals];
    let mut error_counts = vec![0u64; num_intervals];
    let mut error_rates = vec![0.0f64; num_intervals];

    for i in 0..num_intervals {
        let ts = window_start + chrono::Duration::seconds(interval * i as i64);
        timestamps.push(ts.to_rfc3339());
    }

    for record in &metrics_collector_state.query_records {
        if record.timestamp >= window_start {
            let offset = (record.timestamp - window_start).num_seconds();
            let idx = (offset / interval) as usize;
            if idx < num_intervals {
                total_requests[idx] += 1;
                if !record.success {
                    error_counts[idx] += 1;
                }
            }
        }
    }

    for i in 0..num_intervals {
        if total_requests[i] > 0 {
            error_rates[i] = error_counts[i] as f64 / total_requests[i] as f64 * 100.0;
        }
    }

    ErrorRateTrendGql {
        timestamps,
        error_rates,
        total_requests,
        error_counts,
        interval_seconds: interval,
    }
}
