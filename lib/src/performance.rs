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
