//! 性能监控中间件
//!
//! 记录 API 请求的耗时，生成性能统计数据

use axum::{extract::Request, middleware::Next, response::Response};
use serde::Serialize;
use std::time::Instant;
use tracing::{info, warn};

/// 性能监控数据结构
#[derive(Debug, Clone)]
pub struct PerformanceMetric {
    pub endpoint: String,
    pub method: String,
    pub duration_ms: u64,
    pub status_code: u16,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// 性能统计数据存储
#[derive(Debug, Clone, Serialize)]
pub struct PerformanceStats {
    pub total_requests: u64,
    pub total_duration_ms: u64,
    pub avg_duration_ms: f64,
    pub slow_requests_count: u64,
    pub slow_requests_threshold_ms: u64,
}

impl Default for PerformanceStats {
    fn default() -> Self {
        Self {
            total_requests: 0,
            total_duration_ms: 0,
            avg_duration_ms: 0.0,
            slow_requests_count: 0,
            slow_requests_threshold_ms: 1000, // 默认 1 秒为慢请求
        }
    }
}

/// 全局性能统计
pub static GLOBAL_PERFORMANCE_STATS: once_cell::sync::Lazy<std::sync::Mutex<PerformanceStats>> =
    once_cell::sync::Lazy::new(|| std::sync::Mutex::new(PerformanceStats::default()));

/// 性能监控中间件
pub async fn performance_middleware(request: Request, next: Next) -> Response {
    let start = Instant::now();
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    let response = next.run(request).await;

    let duration = start.elapsed();
    let duration_ms = duration.as_millis() as u64;
    let status_code = response.status().as_u16();

    // 记录性能指标
    record_performance_metric(&path, &method, duration_ms, status_code);

    response
}

/// 记录性能指标
fn record_performance_metric(endpoint: &str, method: &str, duration_ms: u64, status_code: u16) {
    let mut stats = GLOBAL_PERFORMANCE_STATS.lock().unwrap();

    stats.total_requests += 1;
    stats.total_duration_ms += duration_ms;

    // 计算平均响应时间
    if stats.total_requests > 0 {
        stats.avg_duration_ms = stats.total_duration_ms as f64 / stats.total_requests as f64;
    }

    // 检测慢请求
    if duration_ms > stats.slow_requests_threshold_ms {
        stats.slow_requests_count += 1;
        warn!(
            "Slow request detected: {} {} took {}ms (threshold: {}ms)",
            method, endpoint, duration_ms, stats.slow_requests_threshold_ms
        );
    }

    info!(
        "Request: {} {} - Status: {} - Duration: {}ms",
        method, endpoint, status_code, duration_ms
    );
}

/// 获取性能统计数据
pub fn get_performance_stats() -> PerformanceStats {
    GLOBAL_PERFORMANCE_STATS.lock().unwrap().clone()
}

/// 重置性能统计
pub fn reset_performance_stats() {
    let mut stats = GLOBAL_PERFORMANCE_STATS.lock().unwrap();
    *stats = PerformanceStats::default();
}

/// 设置慢请求阈值
pub fn set_slow_request_threshold(threshold_ms: u64) {
    let mut stats = GLOBAL_PERFORMANCE_STATS.lock().unwrap();
    stats.slow_requests_threshold_ms = threshold_ms;
}
