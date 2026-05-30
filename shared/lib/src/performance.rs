use std::time::{Duration, Instant};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct PerformanceMetrics {
    pub request_count: Arc<AtomicU64>,
    pub success_count: Arc<AtomicU64>,
    pub error_count: Arc<AtomicU64>,
    pub total_duration_ms: Arc<AtomicU64>,
}

impl PerformanceMetrics {
    pub fn new() -> Self {
        Self {
            request_count: Arc::new(AtomicU64::new(0)),
            success_count: Arc::new(AtomicU64::new(0)),
            error_count: Arc::new(AtomicU64::new(0)),
            total_duration_ms: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn record_request(&self, duration: Duration, success: bool) {
        self.request_count.fetch_add(1, Ordering::Relaxed);
        self.total_duration_ms.fetch_add(duration.as_millis() as u64, Ordering::Relaxed);
        
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

pub struct ApiCallMetrics {
    endpoint: String,
    duration_ms: u64,
    status: &'static str,
    timestamp: chrono::DateTime<chrono::Utc>,
}

impl ApiCallMetrics {
    pub fn new(endpoint: String, duration: Duration, status: &'static str) -> Self {
        Self {
            endpoint,
            duration_ms: duration.as_millis() as u64,
            status,
            timestamp: chrono::Utc::now(),
        }
    }
}
