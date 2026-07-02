pub mod structured_logger;

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

pub fn create_log_filter(service: &str, level: &str) -> EnvFilter {
    EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(format!("{}={},info", service, level)))
}

pub fn init_logging(service_name: &str) {
    let log_format = LogFormat::from_env();

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(format!("{},info", service_name)));

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
}
