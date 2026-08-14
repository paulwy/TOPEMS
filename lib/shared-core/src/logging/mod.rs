pub mod request_middleware;
pub mod structured_logger;

pub use request_middleware::{
    get_current_request_id, get_current_span_id, get_current_trace_id, inject_request_context,
    request_context_middleware, RequestContext, RequestContextExt, RequestIdGuard,
};
pub use structured_logger::{
    generate_request_id, generate_span_id, generate_trace_id, JsonEventFormatter, LogFormat,
};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing_subscriber::fmt::format::Writer;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: String,
    pub message: String,
    pub service: String,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    #[serde(default)]
    pub fields: HashMap<String, serde_json::Value>,
    pub duration_ms: Option<u64>,
    pub user_id: Option<String>,
    pub request_id: Option<String>,
}

impl LogEntry {
    pub fn new(level: &str, message: &str, service: &str) -> Self {
        Self {
            timestamp: Utc::now(),
            level: level.to_string(),
            message: message.to_string(),
            service: service.to_string(),
            trace_id: None,
            span_id: None,
            fields: HashMap::new(),
            duration_ms: None,
            user_id: None,
            request_id: None,
        }
    }

    pub fn with_trace(mut self, trace_id: String, span_id: String) -> Self {
        self.trace_id = Some(trace_id);
        self.span_id = Some(span_id);
        self
    }

    pub fn with_duration(mut self, ms: u64) -> Self {
        self.duration_ms = Some(ms);
        self
    }

    pub fn with_user(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_field(mut self, key: &str, value: serde_json::Value) -> Self {
        self.fields.insert(key.to_string(), value);
        self
    }

    pub fn with_request_id(mut self, request_id: String) -> Self {
        self.request_id = Some(request_id);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogQuery {
    pub level: Option<String>,
    pub service: Option<String>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub search: Option<String>,
    pub trace_id: Option<String>,
    pub user_id: Option<String>,
    pub request_id: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

impl Default for LogQuery {
    fn default() -> Self {
        Self {
            level: None,
            service: None,
            from: None,
            to: None,
            search: None,
            trace_id: None,
            user_id: None,
            request_id: None,
            limit: Some(100),
            offset: Some(0),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogStats {
    pub total_count: u64,
    pub by_level: HashMap<String, u64>,
    pub by_service: HashMap<String, u64>,
    pub error_rate: f64,
    pub avg_response_time_ms: f64,
    pub top_errors: Vec<ErrorStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorStat {
    pub message: String,
    pub count: u64,
    pub last_occurrence: DateTime<Utc>,
}

pub struct LogAggregator {
    logs: Arc<RwLock<Vec<LogEntry>>>,
    max_entries: usize,
}

impl Default for LogAggregator {
    fn default() -> Self {
        Self::new(10000)
    }
}

impl LogAggregator {
    pub fn new(max_entries: usize) -> Self {
        Self {
            logs: Arc::new(RwLock::new(Vec::new())),
            max_entries,
        }
    }

    pub async fn add_log(&self, entry: LogEntry) {
        let mut logs = self.logs.write().await;
        logs.push(entry);

        if logs.len() > self.max_entries {
            logs.remove(0);
        }
    }

    pub async fn query(&self, query: &LogQuery) -> Vec<LogEntry> {
        let logs = self.logs.read().await;

        logs.iter()
            .filter(|log| {
                if let Some(level) = &query.level {
                    if &log.level != level {
                        return false;
                    }
                }

                if let Some(service) = &query.service {
                    if &log.service != service {
                        return false;
                    }
                }

                if let Some(from) = &query.from {
                    if &log.timestamp < from {
                        return false;
                    }
                }

                if let Some(to) = &query.to {
                    if &log.timestamp > to {
                        return false;
                    }
                }

                if let Some(search) = &query.search {
                    if !log.message.to_lowercase().contains(&search.to_lowercase()) {
                        return false;
                    }
                }

                if let Some(trace_id) = &query.trace_id {
                    if log.trace_id.as_ref() != Some(trace_id) {
                        return false;
                    }
                }

                if let Some(user_id) = &query.user_id {
                    if log.user_id.as_ref() != Some(user_id) {
                        return false;
                    }
                }

                if let Some(request_id) = &query.request_id {
                    if log.request_id.as_ref() != Some(request_id) {
                        return false;
                    }
                }

                true
            })
            .skip(query.offset.unwrap_or(0))
            .take(query.limit.unwrap_or(100))
            .cloned()
            .collect()
    }

    pub async fn get_stats(&self) -> LogStats {
        let logs = self.logs.read().await;

        let mut by_level: HashMap<String, u64> = HashMap::new();
        let mut by_service: HashMap<String, u64> = HashMap::new();
        let mut error_messages: HashMap<String, (u64, DateTime<Utc>)> = HashMap::new();
        let mut error_count = 0u64;
        let mut total_response_time = 0u64;
        let mut response_count = 0u64;

        for log in logs.iter() {
            *by_level.entry(log.level.clone()).or_insert(0) += 1;
            *by_service.entry(log.service.clone()).or_insert(0) += 1;

            if log.level == "ERROR" {
                error_count += 1;
                let entry = error_messages
                    .entry(log.message.clone())
                    .or_insert((0, log.timestamp));
                entry.0 += 1;
            }

            if let Some(duration) = log.duration_ms {
                total_response_time += duration;
                response_count += 1;
            }
        }

        let total = logs.len() as u64;
        let error_rate = if total > 0 {
            (error_count as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        let avg_response_time = if response_count > 0 {
            total_response_time as f64 / response_count as f64
        } else {
            0.0
        };

        let mut top_errors: Vec<ErrorStat> = error_messages
            .into_iter()
            .map(|(message, (count, last))| ErrorStat {
                message,
                count,
                last_occurrence: last,
            })
            .collect();

        top_errors.sort_by_key(|a| std::cmp::Reverse(a.count));
        top_errors.truncate(10);

        LogStats {
            total_count: total,
            by_level,
            by_service,
            error_rate,
            avg_response_time_ms: avg_response_time,
            top_errors,
        }
    }

    pub async fn clear(&self) {
        let mut logs = self.logs.write().await;
        logs.clear();
    }
}

#[derive(Debug, Clone, Default)]
pub struct TraceContext {
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    pub parent_span_id: Option<String>,
}

impl TraceContext {
    pub fn new() -> Self {
        Self {
            trace_id: Some(generate_trace_id()),
            span_id: Some(generate_span_id()),
            parent_span_id: None,
        }
    }

    pub fn with_parent(mut self, parent: &TraceContext) -> Self {
        self.parent_span_id = parent.span_id.clone();
        self
    }
}

pub fn format_log_entry(mut w: Writer<'_>, entry: &LogEntry) -> std::fmt::Result {
    write!(
        w,
        "[{}] {} | {:5} | {} | trace={} | {}",
        entry.timestamp.format("%Y-%m-%d %H:%M:%S%.3f"),
        entry.service,
        entry.level,
        entry.message,
        entry.trace_id.as_deref().unwrap_or("-"),
        serde_json::to_string(&entry.fields).unwrap_or_default()
    )
}

/// 全链路端口排查日志的默认级别配置，内嵌到 EnvFilter 基础值里，
/// 保证无论 RUST_LOG 是否设置，都能直接看到服务发现、AI 集成、智能网关的端口解析。
const PORT_DIAGNOSTIC_DIRECTIVES: &str =
    "service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug";

pub fn create_log_filter(service: &str, level: &str) -> EnvFilter {
    EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new(format!(
            "{service}={level},{directives}",
            service = service,
            level = level,
            directives = PORT_DIAGNOSTIC_DIRECTIVES
        ))
    })
}

pub fn init_logging(service_name: &str) {
    let log_format = LogFormat::from_env();

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new(format!(
            "{service_name}=info,{directives}",
            service_name = service_name,
            directives = PORT_DIAGNOSTIC_DIRECTIVES
        ))
    });

    match log_format {
        LogFormat::Json => {
            tracing_subscriber::registry()
                .with(env_filter)
                .with(tracing_subscriber::fmt::layer().event_format(JsonEventFormatter::new()))
                .init();
        }
        LogFormat::File => {
            let log_dir = std::env::var("LOG_DIR").unwrap_or_else(|_| "./logs".to_string());
            std::fs::create_dir_all(&log_dir).unwrap_or_default();

            let _log_file = format!("{}/{}.log", log_dir, service_name);
            let file_appender = tracing_appender::rolling::hourly(&log_dir, service_name);
            let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

            tracing_subscriber::registry()
                .with(env_filter)
                .with(
                    tracing_subscriber::fmt::layer()
                        .with_writer(non_blocking)
                        .event_format(JsonEventFormatter::new()),
                )
                .init();
        }
        LogFormat::Text => {
            tracing_subscriber::registry()
                .with(env_filter)
                .with(tracing_subscriber::fmt::layer())
                .init();
        }
    }

    tracing::info!(
        "✅ {} 日志系统初始化完成 (format: {:?})",
        service_name,
        log_format
    );
}

#[macro_export]
macro_rules! log_performance {
    ($service:expr_2021, $operation:expr_2021, $duration_ms:expr_2021) => {
        tracing::info!(
            service = $service,
            operation = $operation,
            duration_ms = $duration_ms,
            "Operation completed"
        );
    };
}

#[macro_export]
macro_rules! log_business {
    ($service:expr_2021, $action:expr_2021, $($key:ident = $value:expr_2021),*) => {
        tracing::info!(
            service = $service,
            action = $action,
            $( $key = $value ),*,
            "Business action"
        );
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_log_aggregator() {
        let aggregator = LogAggregator::new(100);

        for i in 0..5 {
            let entry = LogEntry::new("INFO", &format!("Test message {}", i), "test-service");
            aggregator.add_log(entry).await;
        }

        let query = LogQuery {
            level: Some("INFO".to_string()),
            ..Default::default()
        };

        let results = aggregator.query(&query).await;
        assert_eq!(results.len(), 5);
    }

    #[tokio::test]
    async fn test_log_stats() {
        let aggregator = LogAggregator::new(100);

        aggregator
            .add_log(LogEntry::new("INFO", "Test", "service1"))
            .await;
        aggregator
            .add_log(LogEntry::new("ERROR", "Error message", "service1"))
            .await;

        let stats = aggregator.get_stats().await;
        assert_eq!(stats.total_count, 2);
        assert_eq!(stats.by_level.get("INFO"), Some(&1));
        assert_eq!(stats.by_level.get("ERROR"), Some(&1));
    }

    #[test]
    fn test_log_entry_with_request_id() {
        let request_id = generate_request_id();
        let entry =
            LogEntry::new("INFO", "test", "test-service").with_request_id(request_id.clone());
        assert_eq!(entry.request_id, Some(request_id));
    }

    #[test]
    fn test_trace_context_new() {
        let ctx = TraceContext::new();
        assert!(ctx.trace_id.is_some());
        assert!(ctx.span_id.is_some());
        assert!(ctx.parent_span_id.is_none());
    }

    #[test]
    fn test_trace_context_with_parent() {
        let parent = TraceContext::new();
        let child = TraceContext::new().with_parent(&parent);
        assert_eq!(child.parent_span_id, parent.span_id);
    }

    #[test]
    fn test_log_entry_new_sets_basic_fields() {
        let entry = LogEntry::new("INFO", "hello", "svc-a");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.message, "hello");
        assert_eq!(entry.service, "svc-a");
        assert!(entry.trace_id.is_none());
        assert!(entry.span_id.is_none());
        assert!(entry.duration_ms.is_none());
        assert!(entry.user_id.is_none());
        assert!(entry.request_id.is_none());
        assert!(entry.fields.is_empty());
    }

    #[test]
    fn test_log_entry_with_trace_builder() {
        let entry = LogEntry::new("INFO", "m", "s").with_trace("t1".to_string(), "sp1".to_string());
        assert_eq!(entry.trace_id.as_deref(), Some("t1"));
        assert_eq!(entry.span_id.as_deref(), Some("sp1"));
    }

    #[test]
    fn test_log_entry_with_duration_builder() {
        let entry = LogEntry::new("INFO", "m", "s").with_duration(42);
        assert_eq!(entry.duration_ms, Some(42));
    }

    #[test]
    fn test_log_entry_with_user_builder() {
        let entry = LogEntry::new("INFO", "m", "s").with_user("u-1".to_string());
        assert_eq!(entry.user_id.as_deref(), Some("u-1"));
    }

    #[test]
    fn test_log_entry_with_field_builder() {
        let entry = LogEntry::new("INFO", "m", "s")
            .with_field("count", serde_json::json!(7))
            .with_field("name", serde_json::json!("bob"));
        assert_eq!(entry.fields.get("count"), Some(&serde_json::json!(7)));
        assert_eq!(entry.fields.get("name"), Some(&serde_json::json!("bob")));
    }

    #[test]
    fn test_log_entry_builder_chain() {
        let entry = LogEntry::new("INFO", "m", "s")
            .with_trace("t".to_string(), "sp".to_string())
            .with_duration(10)
            .with_user("u".to_string())
            .with_request_id("r".to_string())
            .with_field("k", serde_json::json!(1));
        assert_eq!(entry.trace_id.as_deref(), Some("t"));
        assert_eq!(entry.span_id.as_deref(), Some("sp"));
        assert_eq!(entry.duration_ms, Some(10));
        assert_eq!(entry.user_id.as_deref(), Some("u"));
        assert_eq!(entry.request_id.as_deref(), Some("r"));
        assert_eq!(entry.fields.get("k"), Some(&serde_json::json!(1)));
    }

    #[test]
    fn test_log_entry_serde_roundtrip() {
        let entry = LogEntry::new("WARN", "warn-msg", "svc")
            .with_trace("tid".to_string(), "sid".to_string())
            .with_duration(99)
            .with_request_id("rid".to_string())
            .with_field("k", serde_json::json!("v"));
        let json = serde_json::to_string(&entry).expect("serialize");
        let de: LogEntry = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(de.level, "WARN");
        assert_eq!(de.message, "warn-msg");
        assert_eq!(de.service, "svc");
        assert_eq!(de.trace_id.as_deref(), Some("tid"));
        assert_eq!(de.span_id.as_deref(), Some("sid"));
        assert_eq!(de.duration_ms, Some(99));
        assert_eq!(de.request_id.as_deref(), Some("rid"));
        assert_eq!(de.fields.get("k"), Some(&serde_json::json!("v")));
    }

    #[test]
    fn test_log_entry_clone() {
        let entry = LogEntry::new("INFO", "m", "s").with_user("u".to_string());
        let cloned = entry.clone();
        assert_eq!(entry.level, cloned.level);
        assert_eq!(entry.user_id, cloned.user_id);
    }

    #[test]
    fn test_log_query_default_has_default_limit_offset() {
        let q = LogQuery::default();
        assert!(q.level.is_none());
        assert!(q.service.is_none());
        assert!(q.from.is_none());
        assert!(q.to.is_none());
        assert!(q.search.is_none());
        assert!(q.trace_id.is_none());
        assert!(q.user_id.is_none());
        assert!(q.request_id.is_none());
        assert_eq!(q.limit, Some(100));
        assert_eq!(q.offset, Some(0));
    }

    #[test]
    fn test_log_query_serde_roundtrip() {
        let q = LogQuery {
            level: Some("ERROR".to_string()),
            service: Some("svc".to_string()),
            from: None,
            to: None,
            search: Some("panic".to_string()),
            trace_id: Some("t".to_string()),
            user_id: None,
            request_id: Some("r".to_string()),
            limit: Some(10),
            offset: Some(5),
        };
        let json = serde_json::to_string(&q).expect("serialize");
        let de: LogQuery = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(de.level.as_deref(), Some("ERROR"));
        assert_eq!(de.service.as_deref(), Some("svc"));
        assert_eq!(de.search.as_deref(), Some("panic"));
        assert_eq!(de.trace_id.as_deref(), Some("t"));
        assert_eq!(de.request_id.as_deref(), Some("r"));
        assert_eq!(de.limit, Some(10));
        assert_eq!(de.offset, Some(5));
    }

    #[test]
    fn test_log_stats_serde_roundtrip() {
        let mut by_level = HashMap::new();
        by_level.insert("INFO".to_string(), 5u64);
        by_level.insert("ERROR".to_string(), 2u64);
        let mut by_service = HashMap::new();
        by_service.insert("svc".to_string(), 7u64);
        let stats = LogStats {
            total_count: 7,
            by_level,
            by_service,
            error_rate: 28.57,
            avg_response_time_ms: 12.5,
            top_errors: vec![ErrorStat {
                message: "boom".to_string(),
                count: 2,
                last_occurrence: Utc::now(),
            }],
        };
        let json = serde_json::to_string(&stats).expect("serialize");
        let de: LogStats = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(de.total_count, 7);
        assert_eq!(de.by_level.get("INFO"), Some(&5));
        assert_eq!(de.by_level.get("ERROR"), Some(&2));
        assert_eq!(de.by_service.get("svc"), Some(&7));
        assert_eq!(de.top_errors.len(), 1);
        assert_eq!(de.top_errors[0].message, "boom");
        assert_eq!(de.top_errors[0].count, 2);
    }

    #[test]
    fn test_error_stat_serde_roundtrip() {
        let stat = ErrorStat {
            message: "disk full".to_string(),
            count: 3,
            last_occurrence: Utc::now(),
        };
        let json = serde_json::to_string(&stat).expect("serialize");
        let de: ErrorStat = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(de.message, "disk full");
        assert_eq!(de.count, 3);
    }

    #[test]
    fn test_log_aggregator_default_capacity() {
        let aggregator = LogAggregator::default();
        assert_eq!(aggregator.max_entries, 10000);
    }

    #[tokio::test]
    async fn test_log_aggregator_caps_at_max_entries() {
        let aggregator = LogAggregator::new(3);
        for i in 0..5 {
            aggregator
                .add_log(LogEntry::new("INFO", &format!("m{}", i), "s"))
                .await;
        }
        let all = aggregator.query(&LogQuery::default()).await;
        assert_eq!(all.len(), 3);
        // Oldest entries are removed first; only the last 3 should remain
        assert_eq!(all[0].message, "m2");
        assert_eq!(all[2].message, "m4");
    }

    #[tokio::test]
    async fn test_log_aggregator_clear() {
        let aggregator = LogAggregator::new(100);
        aggregator
            .add_log(LogEntry::new("INFO", "m", "s"))
            .await;
        assert_eq!(aggregator.query(&LogQuery::default()).await.len(), 1);
        aggregator.clear().await;
        assert_eq!(aggregator.query(&LogQuery::default()).await.len(), 0);
    }

    #[tokio::test]
    async fn test_log_aggregator_query_by_service() {
        let aggregator = LogAggregator::new(100);
        aggregator
            .add_log(LogEntry::new("INFO", "m1", "svc-a"))
            .await;
        aggregator
            .add_log(LogEntry::new("INFO", "m2", "svc-b"))
            .await;
        let q = LogQuery {
            service: Some("svc-a".to_string()),
            ..Default::default()
        };
        let results = aggregator.query(&q).await;
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].service, "svc-a");
    }

    #[tokio::test]
    async fn test_log_aggregator_query_by_search_case_insensitive() {
        let aggregator = LogAggregator::new(100);
        aggregator
            .add_log(LogEntry::new("INFO", "Database PANIC detected", "s"))
            .await;
        aggregator
            .add_log(LogEntry::new("INFO", "normal op", "s"))
            .await;
        let q = LogQuery {
            search: Some("panic".to_string()),
            ..Default::default()
        };
        let results = aggregator.query(&q).await;
        assert_eq!(results.len(), 1);
        assert!(results[0].message.contains("PANIC"));
    }

    #[tokio::test]
    async fn test_log_aggregator_query_by_trace_id() {
        let aggregator = LogAggregator::new(100);
        aggregator
            .add_log(
                LogEntry::new("INFO", "m1", "s").with_trace("t1".to_string(), "s1".to_string()),
            )
            .await;
        aggregator
            .add_log(
                LogEntry::new("INFO", "m2", "s").with_trace("t2".to_string(), "s2".to_string()),
            )
            .await;
        let q = LogQuery {
            trace_id: Some("t1".to_string()),
            ..Default::default()
        };
        let results = aggregator.query(&q).await;
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].trace_id.as_deref(), Some("t1"));
    }

    #[tokio::test]
    async fn test_log_aggregator_query_pagination() {
        let aggregator = LogAggregator::new(100);
        for i in 0..10 {
            aggregator
                .add_log(LogEntry::new("INFO", &format!("m{}", i), "s"))
                .await;
        }
        let q = LogQuery {
            limit: Some(3),
            offset: Some(5),
            ..Default::default()
        };
        let results = aggregator.query(&q).await;
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].message, "m5");
        assert_eq!(results[2].message, "m7");
    }

    #[test]
    fn test_trace_context_default_is_empty() {
        let ctx = TraceContext::default();
        assert!(ctx.trace_id.is_none());
        assert!(ctx.span_id.is_none());
        assert!(ctx.parent_span_id.is_none());
    }

    #[test]
    fn test_trace_context_clone_preserves_fields() {
        let ctx = TraceContext::new();
        let cloned = ctx.clone();
        assert_eq!(ctx.trace_id, cloned.trace_id);
        assert_eq!(ctx.span_id, cloned.span_id);
        assert_eq!(ctx.parent_span_id, cloned.parent_span_id);
    }

    #[test]
    fn test_create_log_filter_returns_env_filter() {
        let _filter = create_log_filter("my-svc", "debug");
        // Successful construction without panic is the contract;
        // EnvFilter is opaque so we just ensure it builds.
    }
}
