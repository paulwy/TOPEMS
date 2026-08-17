use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// 日志级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
}

/// 日志查询条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogQuery {
    /// 服务名过滤
    pub service: Option<String>,
    /// 日志级别过滤（最低级别）
    pub min_level: Option<LogLevel>,
    /// 时间范围
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    /// 关键字搜索
    pub keyword: Option<String>,
    /// trace_id 关联查询
    pub trace_id: Option<String>,
    /// 自定义标签过滤
    pub labels: HashMap<String, String>,
    /// 分页
    pub page: usize,
    pub page_size: usize,
}

impl Default for LogQuery {
    fn default() -> Self {
        Self {
            service: None,
            min_level: None,
            start_time: None,
            end_time: None,
            keyword: None,
            trace_id: None,
            labels: HashMap::new(),
            page: 1,
            page_size: 50,
        }
    }
}

/// 日志条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub service: String,
    pub message: String,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    pub labels: HashMap<String, String>,
    pub payload: Option<serde_json::Value>,
}

/// 查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogQueryResult {
    pub entries: Vec<LogEntry>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub total_pages: usize,
}

/// 统一日志查询接口
#[async_trait::async_trait]
pub trait LogQueryProvider: Send + Sync {
    /// 查询日志
    async fn query(&self, query: &LogQuery) -> Result<LogQueryResult, LogQueryError>;

    /// 获取日志统计
    async fn stats(&self, query: &LogQuery) -> Result<LogStats, LogQueryError>;

    /// 按 trace_id 获取完整链路日志
    async fn get_trace_logs(&self, trace_id: &str) -> Result<Vec<LogEntry>, LogQueryError>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogStats {
    pub total_count: usize,
    pub by_level: HashMap<LogLevel, usize>,
    pub by_service: HashMap<String, usize>,
}

#[derive(Debug, thiserror::Error)]
pub enum LogQueryError {
    #[error("查询超时")]
    Timeout,
    #[error("后端不可用: {0}")]
    BackendUnavailable(String),
    #[error("查询语法错误: {0}")]
    QueryError(String),
}

/// 内存日志存储（开发环境用）
pub struct InMemoryLogStore {
    entries: Arc<RwLock<Vec<LogEntry>>>,
}

impl InMemoryLogStore {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub fn append(&self, entry: LogEntry) {
        self.entries.write().push(entry);
    }
}

impl Default for InMemoryLogStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl LogQueryProvider for InMemoryLogStore {
    async fn query(&self, query: &LogQuery) -> Result<LogQueryResult, LogQueryError> {
        let entries = self.entries.read();
        let mut filtered: Vec<LogEntry> = entries
            .iter()
            .filter(|e| {
                if let Some(svc) = &query.service {
                    if &e.service != svc {
                        return false;
                    }
                }
                if let Some(level) = query.min_level {
                    if e.level < level {
                        return false;
                    }
                }
                if let Some(start) = query.start_time {
                    if e.timestamp < start {
                        return false;
                    }
                }
                if let Some(end) = query.end_time {
                    if e.timestamp > end {
                        return false;
                    }
                }
                if let Some(keyword) = &query.keyword {
                    if !e.message.contains(keyword) {
                        return false;
                    }
                }
                if let Some(trace) = &query.trace_id {
                    if e.trace_id.as_deref() != Some(trace.as_str()) {
                        return false;
                    }
                }
                // 标签过滤：查询中的所有标签都必须在日志条目中匹配
                for (k, v) in &query.labels {
                    if e.labels.get(k).map(String::as_str) != Some(v.as_str()) {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        // 按时间倒序排列（最新的在前）
        filtered.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        let total = filtered.len();
        let page_size = query.page_size.max(1);
        let total_pages = total.div_ceil(page_size);
        let start = (query.page.saturating_sub(1)) * page_size;
        let start = start.min(total);
        let end = (start + page_size).min(total);
        let paged = if start < end {
            filtered[start..end].to_vec()
        } else {
            Vec::new()
        };

        Ok(LogQueryResult {
            entries: paged,
            total,
            page: query.page,
            page_size,
            total_pages,
        })
    }

    async fn stats(&self, query: &LogQuery) -> Result<LogStats, LogQueryError> {
        let entries = self.entries.read();
        let mut by_level: HashMap<LogLevel, usize> = HashMap::new();
        let mut by_service: HashMap<String, usize> = HashMap::new();

        let mut total_count = 0usize;
        for e in entries.iter() {
            // 应用与 query 相同的过滤条件（忽略分页）
            if let Some(svc) = &query.service {
                if &e.service != svc {
                    continue;
                }
            }
            if let Some(level) = query.min_level {
                if e.level < level {
                    continue;
                }
            }
            if let Some(start) = query.start_time {
                if e.timestamp < start {
                    continue;
                }
            }
            if let Some(end) = query.end_time {
                if e.timestamp > end {
                    continue;
                }
            }
            if let Some(keyword) = &query.keyword {
                if !e.message.contains(keyword) {
                    continue;
                }
            }
            if let Some(trace) = &query.trace_id {
                if e.trace_id.as_deref() != Some(trace.as_str()) {
                    continue;
                }
            }
            let mut labels_match = true;
            for (k, v) in &query.labels {
                if e.labels.get(k).map(String::as_str) != Some(v.as_str()) {
                    labels_match = false;
                    break;
                }
            }
            if !labels_match {
                continue;
            }

            total_count += 1;
            *by_level.entry(e.level).or_insert(0) += 1;
            *by_service.entry(e.service.clone()).or_insert(0) += 1;
        }

        Ok(LogStats {
            total_count,
            by_level,
            by_service,
        })
    }

    async fn get_trace_logs(&self, trace_id: &str) -> Result<Vec<LogEntry>, LogQueryError> {
        let entries = self.entries.read();
        let mut result: Vec<LogEntry> = entries
            .iter()
            .filter(|e| e.trace_id.as_deref() == Some(trace_id))
            .cloned()
            .collect();
        // 按时间正序排列，便于追踪链路
        result.sort_by_key(|a| a.timestamp);
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_entry(
        id: &str,
        level: LogLevel,
        service: &str,
        message: &str,
        trace_id: Option<&str>,
    ) -> LogEntry {
        LogEntry {
            id: id.to_string(),
            timestamp: Utc::now(),
            level,
            service: service.to_string(),
            message: message.to_string(),
            trace_id: trace_id.map(str::to_string),
            span_id: None,
            labels: HashMap::new(),
            payload: None,
        }
    }

    #[tokio::test]
    async fn test_in_memory_query_by_service_and_level() {
        let store = InMemoryLogStore::new();
        store.append(make_entry("1", LogLevel::Info, "svc-a", "hello", None));
        store.append(make_entry("2", LogLevel::Error, "svc-b", "boom", None));
        store.append(make_entry("3", LogLevel::Warn, "svc-a", "watch out", None));

        let mut query = LogQuery::default();
        query.service = Some("svc-a".to_string());
        let result = store.query(&query).await.unwrap();
        assert_eq!(result.total, 2);

        let mut query = LogQuery::default();
        query.min_level = Some(LogLevel::Error);
        let result = store.query(&query).await.unwrap();
        assert_eq!(result.total, 1);
        assert_eq!(result.entries[0].id, "2");
    }

    #[tokio::test]
    async fn test_in_memory_query_pagination() {
        let store = InMemoryLogStore::new();
        for i in 0..10 {
            store.append(make_entry(
                &format!("e{}", i),
                LogLevel::Info,
                "svc",
                "msg",
                None,
            ));
        }

        let mut query = LogQuery::default();
        query.page = 1;
        query.page_size = 3;
        let result = store.query(&query).await.unwrap();
        assert_eq!(result.total, 10);
        assert_eq!(result.entries.len(), 3);
        assert_eq!(result.total_pages, 4);

        // 超出范围的页码应返回空
        query.page = 100;
        let result = store.query(&query).await.unwrap();
        assert_eq!(result.entries.len(), 0);
        assert_eq!(result.total, 10);
    }

    #[tokio::test]
    async fn test_in_memory_trace_logs() {
        let store = InMemoryLogStore::new();
        store.append(make_entry(
            "1",
            LogLevel::Info,
            "svc-a",
            "a",
            Some("trace-1"),
        ));
        store.append(make_entry(
            "2",
            LogLevel::Info,
            "svc-b",
            "b",
            Some("trace-1"),
        ));
        store.append(make_entry(
            "3",
            LogLevel::Info,
            "svc-c",
            "c",
            Some("trace-2"),
        ));

        let logs = store.get_trace_logs("trace-1").await.unwrap();
        assert_eq!(logs.len(), 2);
        assert!(logs
            .iter()
            .all(|e| e.trace_id.as_deref() == Some("trace-1")));
    }

    #[tokio::test]
    async fn test_in_memory_stats() {
        let store = InMemoryLogStore::new();
        store.append(make_entry("1", LogLevel::Info, "svc-a", "hello", None));
        store.append(make_entry("2", LogLevel::Error, "svc-b", "boom", None));
        store.append(make_entry("3", LogLevel::Info, "svc-a", "world", None));

        let stats = store.stats(&LogQuery::default()).await.unwrap();
        assert_eq!(stats.total_count, 3);
        assert_eq!(stats.by_level.get(&LogLevel::Info), Some(&2));
        assert_eq!(stats.by_level.get(&LogLevel::Error), Some(&1));
        assert_eq!(stats.by_service.get("svc-a"), Some(&2));
        assert_eq!(stats.by_service.get("svc-b"), Some(&1));
    }

    #[test]
    fn test_log_level_ordering() {
        assert!(LogLevel::Trace < LogLevel::Debug);
        assert!(LogLevel::Debug < LogLevel::Info);
        assert!(LogLevel::Info < LogLevel::Warn);
        assert!(LogLevel::Warn < LogLevel::Error);
        assert!(LogLevel::Error < LogLevel::Fatal);
    }
}
