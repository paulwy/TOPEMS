use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Default)]
pub struct PerformanceMetrics {
    pub request_count: Arc<AtomicU64>,
    pub success_count: Arc<AtomicU64>,
    pub error_count: Arc<AtomicU64>,
    pub total_duration_ms: Arc<AtomicU64>,
}

impl PerformanceMetrics {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_request(&self, duration: Duration, success: bool) {
        self.request_count.fetch_add(1, Ordering::Relaxed);
        self.total_duration_ms
            .fetch_add(duration.as_millis() as u64, Ordering::Relaxed);

        if success {
            self.success_count.fetch_add(1, Ordering::Relaxed);
        } else {
            self.error_count.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn get_stats(&self) -> MetricsSnapshot {
        let request_count = self.request_count.load(Ordering::Relaxed);
        let success_count = self.success_count.load(Ordering::Relaxed);
        let error_count = self.error_count.load(Ordering::Relaxed);
        let total_duration_ms = self.total_duration_ms.load(Ordering::Relaxed);

        let success_rate = if request_count > 0 {
            (success_count as f64 / request_count as f64) * 100.0
        } else {
            100.0
        };

        let avg_duration_ms = if request_count > 0 {
            total_duration_ms as f64 / request_count as f64
        } else {
            0.0
        };

        MetricsSnapshot {
            request_count,
            success_count,
            error_count,
            success_rate,
            avg_duration_ms,
        }
    }

    pub fn reset(&self) {
        self.request_count.store(0, Ordering::Relaxed);
        self.success_count.store(0, Ordering::Relaxed);
        self.error_count.store(0, Ordering::Relaxed);
        self.total_duration_ms.store(0, Ordering::Relaxed);
    }
}

#[derive(Debug, Clone)]
pub struct MetricsSnapshot {
    pub request_count: u64,
    pub success_count: u64,
    pub error_count: u64,
    pub success_rate: f64,
    pub avg_duration_ms: f64,
}

pub struct RequestTimer {
    start: Instant,
    metrics: PerformanceMetrics,
    success: bool,
}

impl RequestTimer {
    pub fn new(metrics: PerformanceMetrics) -> Self {
        Self {
            start: Instant::now(),
            metrics,
            success: true,
        }
    }

    pub fn set_success(&mut self, success: bool) {
        self.success = success;
    }

    pub fn finish(self) {
        let duration = self.start.elapsed();
        self.metrics.record_request(duration, self.success);
    }
}

impl Drop for RequestTimer {
    fn drop(&mut self) {
        let duration = self.start.elapsed();
        self.metrics.record_request(duration, self.success);
    }
}

#[derive(Debug, Clone)]
pub struct ApiCallMetrics {
    pub endpoint: String,
    pub duration_ms: u64,
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl ApiCallMetrics {
    pub fn new(endpoint: String, duration: Duration, status: String) -> Self {
        Self {
            endpoint,
            duration_ms: duration.as_millis() as u64,
            status,
            timestamp: chrono::Utc::now(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct DatabaseQueryMetrics {
    pub query_type: String,
    pub table_name: String,
    pub duration_ms: u64,
    pub row_count: Option<u64>,
    pub success: bool,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl DatabaseQueryMetrics {
    pub fn new(
        query_type: String,
        table_name: String,
        duration: Duration,
        row_count: Option<u64>,
        success: bool,
    ) -> Self {
        Self {
            query_type,
            table_name,
            duration_ms: duration.as_millis() as u64,
            row_count,
            success,
            timestamp: chrono::Utc::now(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct CacheMetrics {
    pub cache_hit: bool,
    pub key: String,
    pub cache_type: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl CacheMetrics {
    pub fn new(cache_hit: bool, key: String, cache_type: String) -> Self {
        Self {
            cache_hit,
            key,
            cache_type,
            timestamp: chrono::Utc::now(),
        }
    }
}

pub struct ComprehensiveMetrics {
    api_metrics: Mutex<Vec<ApiCallMetrics>>,
    db_metrics: Mutex<Vec<DatabaseQueryMetrics>>,
    cache_metrics: Mutex<Vec<CacheMetrics>>,
    cache_hits: Arc<AtomicUsize>,
    cache_misses: Arc<AtomicUsize>,
    slow_queries: Mutex<Vec<DatabaseQueryMetrics>>,
    slow_query_threshold: Duration,
}

impl ComprehensiveMetrics {
    pub fn new(slow_query_threshold: Duration) -> Self {
        Self {
            api_metrics: Mutex::new(Vec::new()),
            db_metrics: Mutex::new(Vec::new()),
            cache_metrics: Mutex::new(Vec::new()),
            cache_hits: Arc::new(AtomicUsize::new(0)),
            cache_misses: Arc::new(AtomicUsize::new(0)),
            slow_queries: Mutex::new(Vec::new()),
            slow_query_threshold,
        }
    }

    pub fn record_api_call(&self, endpoint: String, duration: Duration, status: String) {
        let mut metrics = self.api_metrics.lock();
        metrics.push(ApiCallMetrics::new(endpoint, duration, status));

        if metrics.len() > 10000 {
            metrics.drain(0..1000);
        }
    }

    pub fn record_db_query(
        &self,
        query_type: String,
        table_name: String,
        duration: Duration,
        row_count: Option<u64>,
        success: bool,
    ) {
        let mut metrics = self.db_metrics.lock();
        let db_metric =
            DatabaseQueryMetrics::new(query_type, table_name, duration, row_count, success);
        metrics.push(db_metric.clone());

        if metrics.len() > 10000 {
            metrics.drain(0..1000);
        }

        if duration > self.slow_query_threshold {
            let mut slow = self.slow_queries.lock();
            slow.push(db_metric);
            if slow.len() > 1000 {
                slow.drain(0..100);
            }
        }
    }

    pub fn record_cache_operation(&self, cache_hit: bool, key: String, cache_type: String) {
        let mut metrics = self.cache_metrics.lock();
        metrics.push(CacheMetrics::new(cache_hit, key, cache_type));

        if cache_hit {
            self.cache_hits.fetch_add(1, Ordering::Relaxed);
        } else {
            self.cache_misses.fetch_add(1, Ordering::Relaxed);
        }

        if metrics.len() > 10000 {
            metrics.drain(0..1000);
        }
    }

    pub fn get_cache_hit_rate(&self) -> f64 {
        let hits = self.cache_hits.load(Ordering::Relaxed);
        let misses = self.cache_misses.load(Ordering::Relaxed);
        let total = hits + misses;

        if total == 0 {
            1.0
        } else {
            hits as f64 / total as f64
        }
    }

    pub fn get_api_stats(&self) -> ApiStats {
        let metrics = self.api_metrics.lock();
        let mut endpoint_stats: HashMap<String, EndpointStats> = HashMap::new();

        for metric in metrics.iter() {
            let entry = endpoint_stats
                .entry(metric.endpoint.clone())
                .or_insert_with(|| EndpointStats {
                    endpoint: metric.endpoint.clone(),
                    count: 0,
                    total_duration: 0,
                    max_duration: 0,
                    error_count: 0,
                });

            entry.count += 1;
            entry.total_duration += metric.duration_ms;
            if metric.duration_ms > entry.max_duration {
                entry.max_duration = metric.duration_ms;
            }
            if metric.status.starts_with('4') || metric.status.starts_with('5') {
                entry.error_count += 1;
            }
        }

        ApiStats {
            total_requests: metrics.len(),
            endpoint_stats: endpoint_stats.values().cloned().collect(),
        }
    }

    pub fn get_db_stats(&self) -> DatabaseStats {
        let metrics = self.db_metrics.lock();
        let mut table_stats: HashMap<String, TableStats> = HashMap::new();
        let mut total_queries = 0;
        let mut total_duration = 0;
        let mut error_count = 0;

        for metric in metrics.iter() {
            total_queries += 1;
            total_duration += metric.duration_ms;
            if !metric.success {
                error_count += 1;
            }

            let entry = table_stats
                .entry(metric.table_name.clone())
                .or_insert_with(|| TableStats {
                    table_name: metric.table_name.clone(),
                    query_count: 0,
                    total_duration: 0,
                    max_duration: 0,
                    error_count: 0,
                });

            entry.query_count += 1;
            entry.total_duration += metric.duration_ms;
            if metric.duration_ms > entry.max_duration {
                entry.max_duration = metric.duration_ms;
            }
            if !metric.success {
                entry.error_count += 1;
            }
        }

        DatabaseStats {
            total_queries,
            total_duration,
            error_count,
            avg_query_duration: if total_queries > 0 {
                total_duration as f64 / total_queries as f64
            } else {
                0.0
            },
            table_stats: table_stats.values().cloned().collect(),
            slow_queries: self.slow_queries.lock().clone(),
        }
    }

    pub fn get_comprehensive_stats(&self) -> ComprehensiveStats {
        ComprehensiveStats {
            api_stats: self.get_api_stats(),
            db_stats: self.get_db_stats(),
            cache_hit_rate: self.get_cache_hit_rate(),
            cache_hits: self.cache_hits.load(Ordering::Relaxed),
            cache_misses: self.cache_misses.load(Ordering::Relaxed),
        }
    }

    pub fn reset(&self) {
        self.api_metrics.lock().clear();
        self.db_metrics.lock().clear();
        self.cache_metrics.lock().clear();
        self.slow_queries.lock().clear();
        self.cache_hits.store(0, Ordering::Relaxed);
        self.cache_misses.store(0, Ordering::Relaxed);
    }
}

#[derive(Debug, Clone)]
pub struct EndpointStats {
    pub endpoint: String,
    pub count: u64,
    pub total_duration: u64,
    pub max_duration: u64,
    pub error_count: u64,
}

#[derive(Debug, Clone)]
pub struct ApiStats {
    pub total_requests: usize,
    pub endpoint_stats: Vec<EndpointStats>,
}

#[derive(Debug, Clone)]
pub struct TableStats {
    pub table_name: String,
    pub query_count: u64,
    pub total_duration: u64,
    pub max_duration: u64,
    pub error_count: u64,
}

#[derive(Debug, Clone)]
pub struct DatabaseStats {
    pub total_queries: usize,
    pub total_duration: u64,
    pub error_count: u64,
    pub avg_query_duration: f64,
    pub table_stats: Vec<TableStats>,
    pub slow_queries: Vec<DatabaseQueryMetrics>,
}

#[derive(Debug, Clone)]
pub struct ComprehensiveStats {
    pub api_stats: ApiStats,
    pub db_stats: DatabaseStats,
    pub cache_hit_rate: f64,
    pub cache_hits: usize,
    pub cache_misses: usize,
}

pub struct DatabaseQueryTimer {
    start: Instant,
    query_type: Option<String>,
    table_name: Option<String>,
    metrics: Arc<ComprehensiveMetrics>,
}

impl DatabaseQueryTimer {
    pub fn new(metrics: Arc<ComprehensiveMetrics>, query_type: String, table_name: String) -> Self {
        Self {
            start: Instant::now(),
            query_type: Some(query_type),
            table_name: Some(table_name),
            metrics,
        }
    }

    pub fn finish(mut self, row_count: Option<u64>, success: bool) {
        let duration = self.start.elapsed();
        let query_type = self.query_type.take().unwrap_or_default();
        let table_name = self.table_name.take().unwrap_or_default();
        self.metrics
            .record_db_query(query_type, table_name, duration, row_count, success);
    }
}

impl Drop for DatabaseQueryTimer {
    fn drop(&mut self) {}
}

pub struct CacheOperationRecorder {
    key: String,
    cache_type: String,
    metrics: Arc<ComprehensiveMetrics>,
}

impl CacheOperationRecorder {
    pub fn new(metrics: Arc<ComprehensiveMetrics>, key: String, cache_type: String) -> Self {
        Self {
            key,
            cache_type,
            metrics,
        }
    }

    pub fn record_hit(&self) {
        self.metrics
            .record_cache_operation(true, self.key.clone(), self.cache_type.clone());
    }

    pub fn record_miss(&self) {
        self.metrics
            .record_cache_operation(false, self.key.clone(), self.cache_type.clone());
    }
}

pub mod v28 {
    use crate::observability::{
        AlertManager, AlertRule, AlertSeverity, SLOManager, SLOMeasurement,
    };
    use chrono::{DateTime, Utc};
    use serde::{Deserialize, Serialize};
    use sha2::Digest;
    use std::collections::{HashMap, HashSet};
    use std::sync::Arc;
    use std::time::{Duration, Instant};
    use tokio::sync::RwLock;
    use topems_shared_event::cache::{CacheStatistics, InMemoryCache};

    #[derive(Debug, Clone)]
    pub struct QueryCacheConfig {
        pub enabled: bool,
        pub default_ttl_secs: u64,
        pub slow_query_threshold_ms: u64,
        pub max_cache_size: usize,
        pub redis_url: Option<String>,
    }

    impl Default for QueryCacheConfig {
        fn default() -> Self {
            Self {
                enabled: true,
                default_ttl_secs: 300,
                slow_query_threshold_ms: 500,
                max_cache_size: 10000,
                redis_url: None,
            }
        }
    }

    pub fn generate_query_cache_key(sql: &str, params: &[&serde_json::Value]) -> String {
        let mut hasher = sha2::Sha256::new();
        hasher.update(sql.as_bytes());
        for param in params {
            if let Ok(encoded) = serde_json::to_string(param) {
                hasher.update(encoded.as_bytes());
            }
        }
        format!("query:{}", hex::encode(hasher.finalize()))
    }

    pub struct QueryCache {
        config: QueryCacheConfig,
        local_cache: InMemoryCache,
        statistics: Arc<RwLock<QueryCacheStatistics>>,
        invalidation_patterns: Arc<RwLock<HashMap<String, HashSet<String>>>>,
    }

    impl QueryCache {
        pub fn new(config: QueryCacheConfig) -> Self {
            let max_cache_size = config.max_cache_size;
            let default_ttl = config.default_ttl_secs;
            Self {
                config,
                local_cache: InMemoryCache::new(topems_shared_core::config::CacheConfig {
                    memory_cache_size: max_cache_size,
                    default_ttl,
                    ..Default::default()
                }),
                statistics: Arc::new(RwLock::new(QueryCacheStatistics::default())),
                invalidation_patterns: Arc::new(RwLock::new(HashMap::new())),
            }
        }

        pub async fn get(&self, key: &str) -> Option<String> {
            let result = self.local_cache.get(key).await;
            let mut stats = self.statistics.write().await;
            if result.is_some() {
                stats.hits += 1;
            } else {
                stats.misses += 1;
            }
            stats.total_queries += 1;
            result
        }

        pub async fn set(&self, key: String, value: String, ttl: Option<Duration>) {
            let ttl = ttl.or(Some(Duration::from_secs(self.config.default_ttl_secs)));
            self.local_cache.set(key, value, ttl).await;
        }

        pub async fn invalidate(&self, pattern: &str) -> usize {
            let count = self.local_cache.delete_by_pattern(pattern).await;
            let mut stats = self.statistics.write().await;
            stats.invalidations += 1;
            count
        }

        pub async fn register_invalidation_pattern(&self, table_name: &str, cache_pattern: &str) {
            let mut patterns = self.invalidation_patterns.write().await;
            patterns
                .entry(table_name.to_string())
                .or_default()
                .insert(cache_pattern.to_string());
        }

        pub async fn invalidate_by_table(&self, table_name: &str) -> usize {
            let patterns = self.invalidation_patterns.read().await;
            let mut total_deleted = 0;
            if let Some(cache_patterns) = patterns.get(table_name) {
                for pattern in cache_patterns {
                    total_deleted += self.invalidate(pattern).await;
                }
            }
            total_deleted
        }

        pub async fn get_statistics(&self) -> QueryCacheStatistics {
            let mut stats = self.statistics.write().await;
            let local_stats = self.local_cache.get_statistics();
            stats.hit_rate = if stats.total_queries == 0 {
                0.0
            } else {
                stats.hits as f64 / stats.total_queries as f64
            };
            stats.local_stats = local_stats;
            stats.clone()
        }
    }

    #[derive(Debug, Clone, Serialize, Deserialize, Default)]
    pub struct QueryCacheStatistics {
        pub hits: u64,
        pub misses: u64,
        pub total_queries: u64,
        pub hit_rate: f64,
        pub invalidations: u64,
        pub local_stats: CacheStatistics,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SlowQueryRecord {
        pub id: String,
        pub sql: String,
        pub params: Vec<String>,
        pub duration_ms: u64,
        pub occurred_at: DateTime<Utc>,
        pub service_name: String,
        pub trace_id: Option<String>,
        pub affected_rows: Option<u64>,
        pub is_n_plus_one: bool,
    }

    pub struct SlowQueryMonitor {
        config: QueryCacheConfig,
        slow_queries: Arc<RwLock<Vec<SlowQueryRecord>>>,
        recent_queries: Arc<RwLock<HashMap<String, Vec<Instant>>>>,
        max_history_size: usize,
        slo_manager: Option<Arc<SLOManager>>,
        alert_manager: Option<Arc<AlertManager>>,
    }

    impl SlowQueryMonitor {
        pub fn new(config: QueryCacheConfig) -> Self {
            Self {
                config,
                slow_queries: Arc::new(RwLock::new(Vec::new())),
                recent_queries: Arc::new(RwLock::new(HashMap::new())),
                max_history_size: 1000,
                slo_manager: None,
                alert_manager: None,
            }
        }

        pub fn with_observability(
            mut self,
            slo_manager: Arc<SLOManager>,
            alert_manager: Arc<AlertManager>,
        ) -> Self {
            self.slo_manager = Some(slo_manager);
            self.alert_manager = Some(alert_manager);
            self
        }

        pub async fn record_query(
            &self,
            sql: &str,
            params: &[String],
            duration_ms: u64,
            service_name: &str,
            trace_id: Option<&str>,
            affected_rows: Option<u64>,
        ) {
            let is_slow = duration_ms >= self.config.slow_query_threshold_ms;
            let is_n_plus_one = self.detect_n_plus_one(sql).await;

            if is_slow || is_n_plus_one {
                let record = SlowQueryRecord {
                    id: uuid::Uuid::new_v4().to_string(),
                    sql: sql.to_string(),
                    params: params.to_vec(),
                    duration_ms,
                    occurred_at: Utc::now(),
                    service_name: service_name.to_string(),
                    trace_id: trace_id.map(|s| s.to_string()),
                    affected_rows,
                    is_n_plus_one,
                };

                let mut slow_queries = self.slow_queries.write().await;
                slow_queries.push(record);
                while slow_queries.len() > self.max_history_size {
                    slow_queries.remove(0);
                }

                self.trigger_alert(service_name, duration_ms, is_n_plus_one)
                    .await;
            }

            self.track_recent_query(sql).await;
        }

        async fn detect_n_plus_one(&self, sql: &str) -> bool {
            let mut recent = self.recent_queries.write().await;
            let key = sql.to_string();
            let now = Instant::now();
            let timestamps = recent.entry(key).or_default();
            timestamps.push(now);
            timestamps.retain(|t| now.duration_since(*t) < Duration::from_secs(10));
            timestamps.len() >= 5
        }

        async fn track_recent_query(&self, sql: &str) {
            let mut recent = self.recent_queries.write().await;
            let key = sql.to_string();
            let now = Instant::now();
            let timestamps = recent.entry(key).or_default();
            timestamps.push(now);
            timestamps.retain(|t| now.duration_since(*t) < Duration::from_secs(60));
        }

        async fn trigger_alert(&self, service_name: &str, duration_ms: u64, is_n_plus_one: bool) {
            if let (Some(slo), Some(alert)) = (&self.slo_manager, &self.alert_manager) {
                let severity = if is_n_plus_one {
                    AlertSeverity::Critical
                } else if duration_ms > 2000 {
                    AlertSeverity::Critical
                } else {
                    AlertSeverity::Warning
                };

                let rule_name = if is_n_plus_one {
                    format!("{}_n_plus_one_detection", service_name)
                } else {
                    format!("{}_slow_query", service_name)
                };

                let alert_rule = AlertRule {
                    id: rule_name.clone(),
                    name: rule_name.clone(),
                    description: format!(
                        "{} query detection for {}",
                        if is_n_plus_one { "N+1" } else { "Slow" },
                        service_name
                    ),
                    severity,
                    expression: "".to_string(),
                    threshold: 0.0,
                    for_seconds: 0,
                    labels: HashMap::new(),
                    annotations: HashMap::new(),
                    enabled: true,
                };
                alert.add_rule(alert_rule);

                alert.fire_alert(
                    &rule_name,
                    duration_ms as f64,
                    &format!(
                        "{} query detected: {}ms{}",
                        if is_n_plus_one { "N+1" } else { "Slow" },
                        duration_ms,
                        if is_n_plus_one { " (N+1 pattern)" } else { "" }
                    ),
                );

                slo.record_measurement(SLOMeasurement {
                    slo_id: format!("{}_query_latency", service_name),
                    timestamp: Utc::now(),
                    current_value: duration_ms as f64,
                    sample_count: 1,
                    error_count: 0,
                    is_breaching: duration_ms > self.config.slow_query_threshold_ms,
                });
            }
        }

        pub async fn get_slow_queries(&self, limit: usize, offset: usize) -> Vec<SlowQueryRecord> {
            let queries = self.slow_queries.read().await;
            queries.iter().skip(offset).take(limit).cloned().collect()
        }

        pub async fn get_slow_query_stats(&self) -> SlowQueryStatistics {
            let queries = self.slow_queries.read().await;
            let now = Utc::now();
            let last_1h = now - chrono::Duration::hours(1);
            let last_24h = now - chrono::Duration::hours(24);

            let total = queries.len();
            let last_hour = queries.iter().filter(|q| q.occurred_at > last_1h).count();
            let last_day = queries.iter().filter(|q| q.occurred_at > last_24h).count();
            let n_plus_one_count = queries.iter().filter(|q| q.is_n_plus_one).count();

            let avg_duration = if total > 0 {
                queries.iter().map(|q| q.duration_ms).sum::<u64>() / total as u64
            } else {
                0
            };

            let max_duration = queries.iter().map(|q| q.duration_ms).max().unwrap_or(0);

            SlowQueryStatistics {
                total_slow_queries: total as u64,
                last_hour_count: last_hour as u64,
                last_day_count: last_day as u64,
                n_plus_one_count: n_plus_one_count as u64,
                avg_duration_ms: avg_duration,
                max_duration_ms: max_duration,
            }
        }

        pub async fn clear_history(&self) {
            let mut queries = self.slow_queries.write().await;
            queries.clear();
            let mut recent = self.recent_queries.write().await;
            recent.clear();
        }
    }

    #[derive(Debug, Clone, Serialize, Deserialize, Default)]
    pub struct SlowQueryStatistics {
        pub total_slow_queries: u64,
        pub last_hour_count: u64,
        pub last_day_count: u64,
        pub n_plus_one_count: u64,
        pub avg_duration_ms: u64,
        pub max_duration_ms: u64,
    }

    pub struct PerformanceDashboard {
        query_cache: Arc<QueryCache>,
        slow_query_monitor: Arc<SlowQueryMonitor>,
    }

    impl PerformanceDashboard {
        pub fn new(
            query_cache: Arc<QueryCache>,
            slow_query_monitor: Arc<SlowQueryMonitor>,
        ) -> Self {
            Self {
                query_cache,
                slow_query_monitor,
            }
        }

        pub async fn generate_report(&self) -> PerformanceReport {
            let cache_stats = self.query_cache.get_statistics().await;
            let slow_query_stats = self.slow_query_monitor.get_slow_query_stats().await;
            let recent_slow_queries = self.slow_query_monitor.get_slow_queries(10, 0).await;

            PerformanceReport {
                generated_at: Utc::now(),
                cache_statistics: cache_stats,
                slow_query_statistics: slow_query_stats,
                recent_slow_queries,
            }
        }

        pub async fn get_cache_stats(&self) -> QueryCacheStatistics {
            self.query_cache.get_statistics().await
        }

        pub async fn get_slow_query_stats(&self) -> SlowQueryStatistics {
            self.slow_query_monitor.get_slow_query_stats().await
        }

        pub async fn get_recent_slow_queries(&self, limit: usize) -> Vec<SlowQueryRecord> {
            self.slow_query_monitor.get_slow_queries(limit, 0).await
        }

        pub async fn invalidate_table_cache(&self, table_name: &str) -> usize {
            self.query_cache.invalidate_by_table(table_name).await
        }
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct PerformanceReport {
        pub generated_at: DateTime<Utc>,
        pub cache_statistics: QueryCacheStatistics,
        pub slow_query_statistics: SlowQueryStatistics,
        pub recent_slow_queries: Vec<SlowQueryRecord>,
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_generate_query_cache_key() {
            let val1 = serde_json::Value::Number(serde_json::Number::from(1));
            let val2 = serde_json::Value::Number(serde_json::Number::from(2));
            let key1 = generate_query_cache_key("SELECT * FROM users WHERE id = $1", &[&val1]);
            let key2 = generate_query_cache_key("SELECT * FROM users WHERE id = $1", &[&val1]);
            let key3 = generate_query_cache_key("SELECT * FROM users WHERE id = $1", &[&val2]);
            assert_eq!(key1, key2);
            assert_ne!(key1, key3);
            assert!(key1.starts_with("query:"));
            // SHA256 produces 64 hex chars, plus "query:" prefix = 70 chars
            assert!(key1.len() >= 68);
        }

        #[tokio::test]
        async fn test_query_cache_basic() {
            let config = QueryCacheConfig::default();
            let cache = QueryCache::new(config);

            let key = "test:key";
            let value = "{\"id\":1}";

            assert!(cache.get(key).await.is_none());
            cache.set(key.to_string(), value.to_string(), None).await;
            assert_eq!(cache.get(key).await, Some(value.to_string()));

            let stats = cache.get_statistics().await;
            assert_eq!(stats.hits, 1);
            assert_eq!(stats.misses, 1);
            assert_eq!(stats.total_queries, 2);
        }

        #[tokio::test]
        async fn test_query_cache_invalidation() {
            let config = QueryCacheConfig::default();
            let cache = QueryCache::new(config);

            cache
                .set("tenant1:orders:1".to_string(), "data".to_string(), None)
                .await;
            cache
                .set("tenant1:orders:2".to_string(), "data".to_string(), None)
                .await;
            cache
                .set("tenant1:users:1".to_string(), "data".to_string(), None)
                .await;

            cache
                .register_invalidation_pattern("orders", "tenant1:orders:*")
                .await;
            let deleted = cache.invalidate_by_table("orders").await;
            assert_eq!(deleted, 2);

            assert!(cache.get("tenant1:orders:1").await.is_none());
            assert!(cache.get("tenant1:users:1").await.is_some());
        }

        #[tokio::test]
        async fn test_slow_query_detection() {
            let config = QueryCacheConfig::default();
            let monitor = SlowQueryMonitor::new(config);

            monitor
                .record_query(
                    "SELECT * FROM slow_table",
                    &[],
                    600,
                    "test-service",
                    None,
                    None,
                )
                .await;

            let stats = monitor.get_slow_query_stats().await;
            assert_eq!(stats.total_slow_queries, 1);
            assert_eq!(stats.last_hour_count, 1);
        }

        #[tokio::test]
        async fn test_n_plus_one_detection() {
            let config = QueryCacheConfig::default();
            let monitor = SlowQueryMonitor::new(config);

            for i in 0..6 {
                monitor
                    .record_query(
                        "SELECT * FROM items WHERE order_id = $1",
                        &[i.to_string()],
                        10,
                        "test-service",
                        None,
                        None,
                    )
                    .await;
            }

            let stats = monitor.get_slow_query_stats().await;
            assert!(stats.n_plus_one_count >= 1);
        }

        #[tokio::test]
        async fn test_performance_dashboard() {
            let cache_config = QueryCacheConfig::default();
            let query_cache = Arc::new(QueryCache::new(cache_config.clone()));
            let slow_query_monitor = Arc::new(SlowQueryMonitor::new(cache_config));
            let dashboard = PerformanceDashboard::new(query_cache, slow_query_monitor);

            let report = dashboard.generate_report().await;
            assert_eq!(report.cache_statistics.total_queries, 0);
            assert_eq!(report.slow_query_statistics.total_slow_queries, 0);
        }
    }
}

#[cfg(test)]
mod top_level_tests {
    use super::*;

    #[test]
    fn test_performance_metrics_new_default_empty_stats() {
        let m = PerformanceMetrics::new();
        let stats = m.get_stats();
        assert_eq!(stats.request_count, 0);
        assert_eq!(stats.success_count, 0);
        assert_eq!(stats.error_count, 0);
        assert_eq!(stats.success_rate, 100.0);
        assert_eq!(stats.avg_duration_ms, 0.0);
        // Default should match new()
        let m_default = PerformanceMetrics::default();
        assert_eq!(m_default.get_stats().request_count, 0);
    }

    #[test]
    fn test_performance_metrics_record_success_and_error() {
        let m = PerformanceMetrics::new();
        m.record_request(Duration::from_millis(100), true);
        m.record_request(Duration::from_millis(200), true);
        m.record_request(Duration::from_millis(300), false);
        let stats = m.get_stats();
        assert_eq!(stats.request_count, 3);
        assert_eq!(stats.success_count, 2);
        assert_eq!(stats.error_count, 1);
        assert_eq!(stats.avg_duration_ms, 200.0);
        assert!((stats.success_rate - 66.66666).abs() < 0.01);
    }

    #[test]
    fn test_performance_metrics_reset() {
        let m = PerformanceMetrics::new();
        m.record_request(Duration::from_millis(100), true);
        m.record_request(Duration::from_millis(200), false);
        assert_eq!(m.get_stats().request_count, 2);
        m.reset();
        let stats = m.get_stats();
        assert_eq!(stats.request_count, 0);
        assert_eq!(stats.success_count, 0);
        assert_eq!(stats.error_count, 0);
        assert_eq!(stats.success_rate, 100.0);
        assert_eq!(stats.avg_duration_ms, 0.0);
    }

    #[test]
    fn test_request_timer_drop_records_failure() {
        let m = PerformanceMetrics::new();
        {
            let mut timer = RequestTimer::new(m.clone());
            timer.set_success(false);
            // Timer drops here, should record one failed request.
        }
        let stats = m.get_stats();
        assert_eq!(stats.request_count, 1);
        assert_eq!(stats.error_count, 1);
        assert_eq!(stats.success_count, 0);
    }

    #[test]
    fn test_request_timer_default_success_on_drop() {
        let m = PerformanceMetrics::new();
        {
            let _timer = RequestTimer::new(m.clone());
            // Default success=true, drop records a success.
        }
        let stats = m.get_stats();
        assert_eq!(stats.request_count, 1);
        assert_eq!(stats.success_count, 1);
    }

    #[test]
    fn test_request_timer_set_success_toggle() {
        let m = PerformanceMetrics::new();
        let mut timer = RequestTimer::new(m.clone());
        timer.set_success(false);
        assert!(!timer.success);
        timer.set_success(true);
        assert!(timer.success);
        timer.finish();
    }

    #[test]
    fn test_metrics_snapshot_clone() {
        let snapshot = MetricsSnapshot {
            request_count: 10,
            success_count: 8,
            error_count: 2,
            success_rate: 80.0,
            avg_duration_ms: 50.0,
        };
        let cloned = snapshot.clone();
        assert_eq!(cloned.request_count, 10);
        assert_eq!(cloned.success_rate, 80.0);
        assert_eq!(cloned.avg_duration_ms, 50.0);
    }

    #[test]
    fn test_api_call_metrics_new() {
        let m = ApiCallMetrics::new(
            "/api/users".to_string(),
            Duration::from_millis(42),
            "200".to_string(),
        );
        assert_eq!(m.endpoint, "/api/users");
        assert_eq!(m.duration_ms, 42);
        assert_eq!(m.status, "200");
    }

    #[test]
    fn test_database_query_metrics_new() {
        let m = DatabaseQueryMetrics::new(
            "SELECT".to_string(),
            "users".to_string(),
            Duration::from_millis(15),
            Some(100),
            true,
        );
        assert_eq!(m.query_type, "SELECT");
        assert_eq!(m.table_name, "users");
        assert_eq!(m.duration_ms, 15);
        assert_eq!(m.row_count, Some(100));
        assert!(m.success);
    }

    #[test]
    fn test_cache_metrics_new() {
        let m = CacheMetrics::new(true, "user:1".to_string(), "redis".to_string());
        assert!(m.cache_hit);
        assert_eq!(m.key, "user:1");
        assert_eq!(m.cache_type, "redis");
    }

    #[test]
    fn test_comprehensive_metrics_api_and_cache_stats() {
        let cm = ComprehensiveMetrics::new(Duration::from_millis(500));
        cm.record_api_call(
            "/api/a".to_string(),
            Duration::from_millis(10),
            "200".to_string(),
        );
        cm.record_api_call(
            "/api/a".to_string(),
            Duration::from_millis(20),
            "500".to_string(),
        );
        cm.record_api_call(
            "/api/b".to_string(),
            Duration::from_millis(30),
            "404".to_string(),
        );
        let api_stats = cm.get_api_stats();
        assert_eq!(api_stats.total_requests, 3);
        assert_eq!(api_stats.endpoint_stats.len(), 2);
        let a_stats = api_stats
            .endpoint_stats
            .iter()
            .find(|e| e.endpoint == "/api/a")
            .unwrap();
        assert_eq!(a_stats.count, 2);
        assert_eq!(a_stats.total_duration, 30);
        assert_eq!(a_stats.max_duration, 20);
        assert_eq!(a_stats.error_count, 1);

        cm.record_cache_operation(true, "k1".to_string(), "redis".to_string());
        cm.record_cache_operation(false, "k2".to_string(), "redis".to_string());
        cm.record_cache_operation(true, "k3".to_string(), "redis".to_string());
        let hit_rate = cm.get_cache_hit_rate();
        assert!((hit_rate - 2.0 / 3.0).abs() < 0.001);
    }

    #[test]
    fn test_comprehensive_metrics_db_stats_and_slow_queries() {
        let cm = ComprehensiveMetrics::new(Duration::from_millis(50));
        cm.record_db_query(
            "SELECT".to_string(),
            "users".to_string(),
            Duration::from_millis(10),
            Some(5),
            true,
        );
        cm.record_db_query(
            "UPDATE".to_string(),
            "users".to_string(),
            Duration::from_millis(100),
            None,
            false,
        );
        let db_stats = cm.get_db_stats();
        assert_eq!(db_stats.total_queries, 2);
        assert_eq!(db_stats.error_count, 1);
        assert_eq!(db_stats.avg_query_duration, 55.0);
        assert_eq!(db_stats.slow_queries.len(), 1);
        assert_eq!(db_stats.slow_queries[0].query_type, "UPDATE");
        let users_stats = db_stats
            .table_stats
            .iter()
            .find(|t| t.table_name == "users")
            .unwrap();
        assert_eq!(users_stats.query_count, 2);
        assert_eq!(users_stats.error_count, 1);
        assert_eq!(users_stats.max_duration, 100);
    }

    #[test]
    fn test_comprehensive_metrics_empty_cache_hit_rate() {
        let cm = ComprehensiveMetrics::new(Duration::from_millis(50));
        // No cache ops → total=0 → returns 1.0
        assert_eq!(cm.get_cache_hit_rate(), 1.0);
    }

    #[test]
    fn test_comprehensive_metrics_reset_and_comprehensive_stats() {
        let cm = ComprehensiveMetrics::new(Duration::from_millis(50));
        cm.record_api_call(
            "/api".to_string(),
            Duration::from_millis(10),
            "200".to_string(),
        );
        cm.record_db_query(
            "SELECT".to_string(),
            "t".to_string(),
            Duration::from_millis(5),
            None,
            true,
        );
        cm.record_cache_operation(true, "k".to_string(), "redis".to_string());
        let stats = cm.get_comprehensive_stats();
        assert_eq!(stats.api_stats.total_requests, 1);
        assert_eq!(stats.db_stats.total_queries, 1);
        assert_eq!(stats.cache_hits, 1);
        assert_eq!(stats.cache_misses, 0);
        assert_eq!(stats.cache_hit_rate, 1.0);
        cm.reset();
        let stats_after = cm.get_comprehensive_stats();
        assert_eq!(stats_after.api_stats.total_requests, 0);
        assert_eq!(stats_after.db_stats.total_queries, 0);
        assert_eq!(stats_after.cache_hits, 0);
        assert_eq!(stats_after.cache_misses, 0);
        assert_eq!(stats_after.cache_hit_rate, 1.0);
    }

    #[test]
    fn test_database_query_timer_finish_records_once() {
        let cm = Arc::new(ComprehensiveMetrics::new(Duration::from_millis(50)));
        {
            let timer =
                DatabaseQueryTimer::new(cm.clone(), "SELECT".to_string(), "orders".to_string());
            timer.finish(Some(10), true);
        }
        let db_stats = cm.get_db_stats();
        assert_eq!(db_stats.total_queries, 1);
        assert_eq!(db_stats.table_stats.len(), 1);
        assert_eq!(db_stats.table_stats[0].table_name, "orders");
    }

    #[test]
    fn test_cache_operation_recorder_hit_and_miss() {
        let cm = Arc::new(ComprehensiveMetrics::new(Duration::from_millis(50)));
        let recorder =
            CacheOperationRecorder::new(cm.clone(), "user:1".to_string(), "redis".to_string());
        recorder.record_hit();
        recorder.record_hit();
        recorder.record_miss();
        let stats = cm.get_comprehensive_stats();
        assert_eq!(stats.cache_hits, 2);
        assert_eq!(stats.cache_misses, 1);
        assert!((stats.cache_hit_rate - 2.0 / 3.0).abs() < 0.001);
    }
}
