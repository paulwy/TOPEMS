#![allow(dead_code)] // Reserved: V59 网关监控模块，待业务接入后启用
//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V59.0 BFF Phase 29: GraphQL 网关监控 + 性能追踪 + 异常检测
//!
//! 核心能力：
//! 1. 网关监控 (Gateway Monitoring)
//!    - GatewayMonitor: 指标记录、健康检查、仪表盘聚合
//!    - Metric: 网关指标 (Counter/Gauge/Histogram/Summary)
//!    - GatewayHealth: 网关健康状态 (latency_p99/error_rate/throughput/active_connections)
//! 2. 性能追踪 (Performance Tracing)
//!    - PerformanceTracer: GraphQL 查询追踪、Resolver 计时、慢查询检测
//!    - Trace: 查询追踪 (query_hash/duration_ms/resolver_timings/cache_hits/errors)
//!    - ResolverTiming: Resolver 执行计时 (path/duration_ms/start_time/end_time)
//! 3. 异常检测 (Anomaly Detection)
//!    - AnomalyDetector: 统计过程控制、异常检测、模型训练
//!    - Anomaly: 异常事件 (Spike/Drop/Drift/Cycle/Burst)
//!    - DetectionModel: 检测模型 (EWMA/Z-Score/Seasonal)

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

// ==================== 数据库表定义 ====================

pub const CREATE_METRICS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_metrics (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    metric_type VARCHAR(32) NOT NULL,
    value DOUBLE PRECISION NOT NULL DEFAULT 0,
    labels JSONB NOT NULL DEFAULT '{}',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_met_name ON portal_metrics(name);
CREATE INDEX IF NOT EXISTS idx_met_type ON portal_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_met_checked ON portal_metrics(checked_at DESC);
"#;

pub const CREATE_ALERT_THRESHOLDS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_alert_thresholds (
    id VARCHAR(64) PRIMARY KEY,
    metric_name VARCHAR(128) NOT NULL,
    warning_threshold DOUBLE PRECISION NOT NULL,
    critical_threshold DOUBLE PRECISION NOT NULL,
    comparison_operator VARCHAR(16) NOT NULL DEFAULT 'gt',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_at_metric ON portal_alert_thresholds(metric_name);
CREATE INDEX IF NOT EXISTS idx_at_enabled ON portal_alert_thresholds(enabled);
"#;

pub const CREATE_TRACES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_traces (
    id VARCHAR(64) PRIMARY KEY,
    query_hash VARCHAR(128),
    duration_ms BIGINT NOT NULL DEFAULT 0,
    cache_hits INT NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]',
    traced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tr_query ON portal_traces(query_hash);
CREATE INDEX IF NOT EXISTS idx_tr_duration ON portal_traces(duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_tr_traced ON portal_traces(traced_at DESC);
"#;

pub const CREATE_RESOLVER_TIMINGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_resolver_timings (
    id VARCHAR(64) PRIMARY KEY,
    trace_id VARCHAR(64) NOT NULL,
    path VARCHAR(256) NOT NULL,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_rt_trace ON portal_resolver_timings(trace_id);
CREATE INDEX IF NOT EXISTS idx_rt_path ON portal_resolver_timings(path);
CREATE INDEX IF NOT EXISTS idx_rt_duration ON portal_resolver_timings(duration_ms DESC);
"#;

pub const CREATE_ANOMALIES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_anomalies (
    id VARCHAR(64) PRIMARY KEY,
    anomaly_type VARCHAR(32) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'medium',
    metric_name VARCHAR(128) NOT NULL,
    expected_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    actual_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    deviation DOUBLE PRECISION NOT NULL DEFAULT 0,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_an_type ON portal_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_an_severity ON portal_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_an_metric ON portal_anomalies(metric_name);
CREATE INDEX IF NOT EXISTS idx_an_detected ON portal_anomalies(detected_at DESC);
"#;

pub const CREATE_DETECTION_MODELS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS portal_detection_models (
    id VARCHAR(64) PRIMARY KEY,
    metric_name VARCHAR(128) NOT NULL,
    algorithm VARCHAR(32) NOT NULL,
    threshold DOUBLE PRECISION NOT NULL DEFAULT 0,
    sensitivity DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    trained_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dm_metric ON portal_detection_models(metric_name);
CREATE INDEX IF NOT EXISTS idx_dm_algorithm ON portal_detection_models(algorithm);
"#;

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MetricType {
    Counter,
    Gauge,
    Histogram,
    Summary,
}

impl MetricType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Counter => "counter",
            Self::Gauge => "gauge",
            Self::Histogram => "histogram",
            Self::Summary => "summary",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "counter" => Some(Self::Counter),
            "gauge" => Some(Self::Gauge),
            "histogram" => Some(Self::Histogram),
            "summary" => Some(Self::Summary),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Counter, Self::Gauge, Self::Histogram, Self::Summary]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

impl HealthStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Healthy => "healthy",
            Self::Degraded => "degraded",
            Self::Unhealthy => "unhealthy",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "healthy" => Some(Self::Healthy),
            "degraded" => Some(Self::Degraded),
            "unhealthy" => Some(Self::Unhealthy),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Healthy, Self::Degraded, Self::Unhealthy]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnomalyType {
    Spike,
    Drop,
    Drift,
    Cycle,
    Burst,
}

impl AnomalyType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Spike => "spike",
            Self::Drop => "drop",
            Self::Drift => "drift",
            Self::Cycle => "cycle",
            Self::Burst => "burst",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "spike" => Some(Self::Spike),
            "drop" => Some(Self::Drop),
            "drift" => Some(Self::Drift),
            "cycle" => Some(Self::Cycle),
            "burst" => Some(Self::Burst),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![
            Self::Spike,
            Self::Drop,
            Self::Drift,
            Self::Cycle,
            Self::Burst,
        ]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnomalySeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl AnomalySeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "low" => Some(Self::Low),
            "medium" => Some(Self::Medium),
            "high" => Some(Self::High),
            "critical" => Some(Self::Critical),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Low, Self::Medium, Self::High, Self::Critical]
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DetectionAlgorithm {
    EWMA,
    ZScore,
    Seasonal,
}

impl DetectionAlgorithm {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::EWMA => "ewma",
            Self::ZScore => "z_score",
            Self::Seasonal => "seasonal",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "ewma" => Some(Self::EWMA),
            "z_score" => Some(Self::ZScore),
            "seasonal" => Some(Self::Seasonal),
            _ => None,
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::EWMA, Self::ZScore, Self::Seasonal]
    }
}

// ==================== 网关监控核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metric {
    pub id: String,
    pub name: String,
    pub metric_type: MetricType,
    pub value: f64,
    pub labels: serde_json::Value,
    pub checked_at: String,
}

impl Metric {
    pub fn new(
        name: String,
        metric_type: MetricType,
        value: f64,
        labels: serde_json::Value,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            metric_type,
            value,
            labels,
            checked_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayHealth {
    pub status: HealthStatus,
    pub latency_p99: f64,
    pub error_rate: f64,
    pub throughput: f64,
    pub active_connections: u64,
    pub checked_at: String,
}

impl Default for GatewayHealth {
    fn default() -> Self {
        Self {
            status: HealthStatus::Healthy,
            latency_p99: 0.0,
            error_rate: 0.0,
            throughput: 0.0,
            active_connections: 0,
            checked_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dashboard {
    pub total_metrics: usize,
    pub metrics_by_type: HashMap<String, usize>,
    pub avg_latency_p99: f64,
    pub avg_error_rate: f64,
    pub total_throughput: f64,
    pub active_connections: u64,
    pub health_status: HealthStatus,
    pub alerts_count: usize,
}

// ==================== 性能追踪核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolverTiming {
    pub path: String,
    pub duration_ms: u64,
    pub start_time: String,
    pub end_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trace {
    pub id: String,
    pub query_hash: Option<String>,
    pub duration_ms: u64,
    pub resolver_timings: Vec<ResolverTiming>,
    pub cache_hits: u32,
    pub errors: Vec<String>,
    pub traced_at: String,
}

impl Trace {
    pub fn new(query_hash: Option<String>) -> Self {
        let now = chrono::Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            query_hash,
            duration_ms: 0,
            resolver_timings: Vec::new(),
            cache_hits: 0,
            errors: Vec::new(),
            traced_at: now.to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSummary {
    pub total_traces: usize,
    pub avg_duration_ms: f64,
    pub p95_duration_ms: f64,
    pub p99_duration_ms: f64,
    pub slow_queries_count: usize,
    pub cache_hit_rate: f64,
    pub error_rate: f64,
    pub top_slow_queries: Vec<Trace>,
}

// ==================== 异常检测核心结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anomaly {
    pub id: String,
    pub anomaly_type: AnomalyType,
    pub severity: AnomalySeverity,
    pub metric_name: String,
    pub expected_value: f64,
    pub actual_value: f64,
    pub deviation: f64,
    pub detected_at: String,
}

impl Anomaly {
    pub fn new(
        anomaly_type: AnomalyType,
        severity: AnomalySeverity,
        metric_name: String,
        expected_value: f64,
        actual_value: f64,
        deviation: f64,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            anomaly_type,
            severity,
            metric_name,
            expected_value,
            actual_value,
            deviation,
            detected_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionModel {
    pub id: String,
    pub metric_name: String,
    pub algorithm: DetectionAlgorithm,
    pub threshold: f64,
    pub sensitivity: f64,
    pub trained_at: Option<String>,
}

impl Default for DetectionModel {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            metric_name: String::new(),
            algorithm: DetectionAlgorithm::ZScore,
            threshold: 3.0,
            sensitivity: 0.05,
            trained_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnomalySummary {
    pub total_anomalies: usize,
    pub by_type: HashMap<String, usize>,
    pub by_severity: HashMap<String, usize>,
    pub by_metric: HashMap<String, usize>,
    pub critical_count: usize,
    pub high_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertThreshold {
    pub id: String,
    pub metric_name: String,
    pub warning_threshold: f64,
    pub critical_threshold: f64,
    pub comparison_operator: String,
    pub enabled: bool,
}

impl Default for AlertThreshold {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            metric_name: String::new(),
            warning_threshold: 0.0,
            critical_threshold: 0.0,
            comparison_operator: "gt".to_string(),
            enabled: true,
        }
    }
}

// ==================== 内存存储 ====================

struct MonitoringStore {
    metrics: Mutex<Vec<Metric>>,
    alert_thresholds: Mutex<Vec<AlertThreshold>>,
    traces: Mutex<Vec<Trace>>,
    resolver_timings: Mutex<Vec<ResolverTiming>>,
    anomalies: Mutex<Vec<Anomaly>>,
    detection_models: Mutex<Vec<DetectionModel>>,
    latency_history: Mutex<Vec<f64>>,
    error_rate_history: Mutex<Vec<f64>>,
    throughput_history: Mutex<Vec<f64>>,
    active_connections: Mutex<u64>,
    slow_query_threshold_ms: Mutex<u64>,
}

fn get_monitoring_store() -> &'static MonitoringStore {
    static STORE: LazyLock<MonitoringStore> = LazyLock::new(|| MonitoringStore {
        metrics: Mutex::new(Vec::new()),
        alert_thresholds: Mutex::new(Vec::new()),
        traces: Mutex::new(Vec::new()),
        resolver_timings: Mutex::new(Vec::new()),
        anomalies: Mutex::new(Vec::new()),
        detection_models: Mutex::new(Vec::new()),
        latency_history: Mutex::new(Vec::new()),
        error_rate_history: Mutex::new(Vec::new()),
        throughput_history: Mutex::new(Vec::new()),
        active_connections: Mutex::new(0),
        slow_query_threshold_ms: Mutex::new(1000),
    });
    &STORE
}

// ==================== GatewayMonitor 实现 ====================

pub struct GatewayMonitor;

impl GatewayMonitor {
    pub async fn record_metric(metric: Metric) -> Metric {
        let store = get_monitoring_store();
        let mut metrics = store.metrics.lock().await;
        metrics.push(metric.clone());
        if metrics.len() > 10000 {
            metrics.truncate(5000);
        }
        metric
    }

    pub async fn get_metrics(
        name: Option<&str>,
        metric_type: Option<MetricType>,
        limit: Option<u32>,
    ) -> Vec<Metric> {
        let store = get_monitoring_store();
        let metrics = store.metrics.lock().await;
        let limit = limit.unwrap_or(100).min(1000) as usize;

        metrics
            .iter()
            .filter(|m| {
                name.map_or(true, |n| m.name == n)
                    && metric_type.as_ref().map_or(true, |t| m.metric_type == *t)
            })
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn get_health() -> GatewayHealth {
        let store = get_monitoring_store();

        let latencies = store.latency_history.lock().await;
        let error_rates = store.error_rate_history.lock().await;
        let throughputs = store.throughput_history.lock().await;
        let connections = store.active_connections.lock().await;

        let latency_p99 = Self::percentile(&latencies, 99.0);
        let error_rate = if error_rates.is_empty() {
            0.0
        } else {
            error_rates.iter().sum::<f64>() / error_rates.len() as f64
        };
        let throughput = if throughputs.is_empty() {
            0.0
        } else {
            throughputs.iter().sum::<f64>() / throughputs.len() as f64
        };
        let active_connections = *connections;

        let status = if error_rate > 0.1 || latency_p99 > 5000.0 {
            HealthStatus::Unhealthy
        } else if error_rate > 0.05 || latency_p99 > 2000.0 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        };

        GatewayHealth {
            status,
            latency_p99,
            error_rate,
            throughput,
            active_connections,
            checked_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub async fn get_dashboard() -> Dashboard {
        let store = get_monitoring_store();

        let metrics = store.metrics.lock().await;
        let latencies = store.latency_history.lock().await;
        let error_rates = store.error_rate_history.lock().await;
        let throughputs = store.throughput_history.lock().await;
        let connections = store.active_connections.lock().await;
        let thresholds = store.alert_thresholds.lock().await;

        let mut metrics_by_type = HashMap::new();
        for metric in metrics.iter() {
            *metrics_by_type
                .entry(metric.metric_type.as_str().to_string())
                .or_insert(0) += 1;
        }

        let avg_latency_p99 = Self::percentile(&latencies, 99.0);
        let avg_error_rate = if error_rates.is_empty() {
            0.0
        } else {
            error_rates.iter().sum::<f64>() / error_rates.len() as f64
        };
        let total_throughput = if throughputs.is_empty() {
            0.0
        } else {
            throughputs.iter().sum::<f64>()
        };

        let health = Self::get_health().await;

        Dashboard {
            total_metrics: metrics.len(),
            metrics_by_type,
            avg_latency_p99,
            avg_error_rate,
            total_throughput,
            active_connections: *connections,
            health_status: health.status,
            alerts_count: thresholds.iter().filter(|t| t.enabled).count(),
        }
    }

    pub async fn get_metric_history(
        metric_name: &str,
        from: Option<&str>,
        to: Option<&str>,
    ) -> Vec<Metric> {
        let store = get_monitoring_store();
        let metrics = store.metrics.lock().await;

        metrics
            .iter()
            .filter(|m| {
                m.name == metric_name
                    && from.map_or(true, |f| m.checked_at.as_str() >= f)
                    && to.map_or(true, |t| m.checked_at.as_str() <= t)
            })
            .cloned()
            .collect()
    }

    pub async fn set_alert_threshold(threshold: AlertThreshold) -> AlertThreshold {
        let store = get_monitoring_store();
        let mut thresholds = store.alert_thresholds.lock().await;

        if let Some(existing) = thresholds
            .iter_mut()
            .find(|t| t.metric_name == threshold.metric_name)
        {
            existing.warning_threshold = threshold.warning_threshold;
            existing.critical_threshold = threshold.critical_threshold;
            existing.comparison_operator = threshold.comparison_operator;
            existing.enabled = threshold.enabled;
            existing.clone()
        } else {
            thresholds.push(threshold.clone());
            threshold
        }
    }

    pub async fn get_alert_thresholds(metric_name: Option<&str>) -> Vec<AlertThreshold> {
        let store = get_monitoring_store();
        let thresholds = store.alert_thresholds.lock().await;

        if let Some(name) = metric_name {
            thresholds
                .iter()
                .filter(|t| t.metric_name == name)
                .cloned()
                .collect()
        } else {
            thresholds.clone()
        }
    }

    pub async fn record_latency(latency_ms: f64) {
        let store = get_monitoring_store();
        let mut latencies = store.latency_history.lock().await;
        latencies.push(latency_ms);
        if latencies.len() > 5000 {
            latencies.truncate(2500);
        }
    }

    pub async fn record_error_rate(rate: f64) {
        let store = get_monitoring_store();
        let mut error_rates = store.error_rate_history.lock().await;
        error_rates.push(rate);
        if error_rates.len() > 5000 {
            error_rates.truncate(2500);
        }
    }

    pub async fn record_throughput(tp: f64) {
        let store = get_monitoring_store();
        let mut throughputs = store.throughput_history.lock().await;
        throughputs.push(tp);
        if throughputs.len() > 5000 {
            throughputs.truncate(2500);
        }
    }

    pub async fn set_active_connections(n: u64) {
        let store = get_monitoring_store();
        let mut connections = store.active_connections.lock().await;
        *connections = n;
    }

    fn percentile(data: &[f64], p: f64) -> f64 {
        if data.is_empty() {
            return 0.0;
        }
        let mut sorted: Vec<f64> = data.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let idx = (p / 100.0 * sorted.len() as f64).round() as usize;
        sorted[idx.min(sorted.len() - 1)]
    }
}

// ==================== PerformanceTracer 实现 ====================

pub struct PerformanceTracer;

impl PerformanceTracer {
    pub async fn start_trace(query_hash: Option<String>) -> Trace {
        let trace = Trace::new(query_hash);
        let store = get_monitoring_store();
        let mut traces = store.traces.lock().await;
        traces.push(trace.clone());
        if traces.len() > 5000 {
            traces.truncate(2500);
        }
        trace
    }

    pub async fn end_trace(trace_id: &str) -> Result<Trace, String> {
        let store = get_monitoring_store();
        let mut traces = store.traces.lock().await;

        let trace = traces
            .iter_mut()
            .find(|t| t.id == trace_id)
            .ok_or_else(|| format!("Trace '{}' 不存在", trace_id))?;

        let resolver_total: u64 = trace.resolver_timings.iter().map(|r| r.duration_ms).sum();
        trace.duration_ms = resolver_total.max(1);

        Ok(trace.clone())
    }

    pub async fn add_resolver_timing(
        trace_id: &str,
        path: String,
        duration_ms: u64,
        start_time: String,
        end_time: String,
    ) -> Result<ResolverTiming, String> {
        let store = get_monitoring_store();
        let mut traces = store.traces.lock().await;

        let trace = traces
            .iter_mut()
            .find(|t| t.id == trace_id)
            .ok_or_else(|| format!("Trace '{}' 不存在", trace_id))?;

        let timing = ResolverTiming {
            path,
            duration_ms,
            start_time,
            end_time,
        };

        trace.resolver_timings.push(timing.clone());

        let mut all_timings = store.resolver_timings.lock().await;
        all_timings.push(timing.clone());
        if all_timings.len() > 50000 {
            all_timings.truncate(25000);
        }

        Ok(timing)
    }

    pub async fn get_trace(trace_id: &str) -> Option<Trace> {
        let store = get_monitoring_store();
        let traces = store.traces.lock().await;
        traces.iter().find(|t| t.id == trace_id).cloned()
    }

    pub async fn list_traces(query_hash: Option<&str>, limit: Option<u32>) -> Vec<Trace> {
        let store = get_monitoring_store();
        let traces = store.traces.lock().await;
        let limit = limit.unwrap_or(50).min(500) as usize;

        traces
            .iter()
            .filter(|t| query_hash.map_or(true, |h| t.query_hash.as_deref() == Some(h)))
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn get_slow_queries(threshold_ms: Option<u64>, limit: Option<u32>) -> Vec<Trace> {
        let store = get_monitoring_store();
        let traces = store.traces.lock().await;
        let limit = limit.unwrap_or(50).min(500) as usize;

        let threshold = match threshold_ms {
            Some(t) => t,
            None => {
                let t = store.slow_query_threshold_ms.lock().await;
                *t
            }
        };

        let mut slow: Vec<Trace> = traces
            .iter()
            .filter(|t| t.duration_ms > threshold)
            .cloned()
            .collect();

        slow.sort_by(|a, b| b.duration_ms.cmp(&a.duration_ms));
        slow.truncate(limit);
        slow
    }

    pub async fn get_performance_summary() -> PerformanceSummary {
        let store = get_monitoring_store();
        let traces = store.traces.lock().await;

        let total = traces.len();
        let mut durations: Vec<u64> = traces.iter().map(|t| t.duration_ms).collect();
        durations.sort();

        let avg = if durations.is_empty() {
            0.0
        } else {
            durations.iter().map(|&d| d as f64).sum::<f64>() / durations.len() as f64
        };

        let p95 = if durations.is_empty() {
            0.0
        } else {
            let idx = (0.95 * durations.len() as f64).round() as usize;
            durations[idx.min(durations.len() - 1)] as f64
        };

        let p99 = if durations.is_empty() {
            0.0
        } else {
            let idx = (0.99 * durations.len() as f64).round() as usize;
            durations[idx.min(durations.len() - 1)] as f64
        };

        let slow_threshold = {
            let t = store.slow_query_threshold_ms.lock().await;
            *t
        };

        let slow_count = traces
            .iter()
            .filter(|t| t.duration_ms > slow_threshold)
            .count();

        let total_cache_hits: u32 = traces.iter().map(|t| t.cache_hits).sum();
        let total_resolvers: u32 = traces.iter().map(|t| t.resolver_timings.len() as u32).sum();
        let cache_hit_rate = if total_resolvers > 0 {
            total_cache_hits as f64 / total_resolvers as f64
        } else {
            0.0
        };

        let total_errors: usize = traces.iter().map(|t| t.errors.len()).sum();
        let error_rate = if total > 0 {
            total_errors as f64 / total as f64
        } else {
            0.0
        };

        let mut top_slow: Vec<Trace> = traces
            .iter()
            .filter(|t| t.duration_ms > slow_threshold)
            .cloned()
            .collect();
        top_slow.sort_by(|a, b| b.duration_ms.cmp(&a.duration_ms));
        top_slow.truncate(10);

        PerformanceSummary {
            total_traces: total,
            avg_duration_ms: avg,
            p95_duration_ms: p95,
            p99_duration_ms: p99,
            slow_queries_count: slow_count,
            cache_hit_rate,
            error_rate,
            top_slow_queries: top_slow,
        }
    }

    pub async fn export_traces(
        format: &str,
        query_hash: Option<&str>,
    ) -> Result<serde_json::Value, String> {
        let store = get_monitoring_store();
        let traces = store.traces.lock().await;

        let filtered: Vec<&Trace> = traces
            .iter()
            .filter(|t| query_hash.map_or(true, |h| t.query_hash.as_deref() == Some(h)))
            .collect();

        match format {
            "json" => {
                let json =
                    serde_json::to_value(&filtered).map_err(|e| format!("序列化失败: {}", e))?;
                Ok(json)
            }
            "summary" => {
                let total = filtered.len();
                let avg_dur = if filtered.is_empty() {
                    0.0
                } else {
                    filtered.iter().map(|t| t.duration_ms as f64).sum::<f64>() / total as f64
                };
                let total_errors: usize = filtered.iter().map(|t| t.errors.len()).sum();
                Ok(serde_json::json!({
                    "total_traces": total,
                    "avg_duration_ms": avg_dur,
                    "total_errors": total_errors,
                    "exported_at": chrono::Utc::now().to_rfc3339(),
                }))
            }
            _ => Err(format!("不支持的导出格式: {}", format)),
        }
    }

    pub async fn set_slow_query_threshold(threshold_ms: u64) {
        let store = get_monitoring_store();
        let mut t = store.slow_query_threshold_ms.lock().await;
        *t = threshold_ms;
    }
}

// ==================== AnomalyDetector 实现 ====================

pub struct AnomalyDetector;

impl AnomalyDetector {
    pub async fn detect_anomalies(metric_name: &str, model_id: Option<&str>) -> Vec<Anomaly> {
        let store = get_monitoring_store();
        let metrics = store.metrics.lock().await;

        let metric_values: Vec<f64> = metrics
            .iter()
            .filter(|m| m.name == metric_name)
            .map(|m| m.value)
            .collect();

        if metric_values.is_empty() {
            return Vec::new();
        }

        let model = if let Some(mid) = model_id {
            let models = store.detection_models.lock().await;
            models.iter().find(|m| m.id == mid).cloned()
        } else {
            let models = store.detection_models.lock().await;
            models
                .iter()
                .find(|m| m.metric_name == metric_name)
                .cloned()
        };

        let model = match model {
            Some(m) => m,
            None => return Vec::new(),
        };

        let mean = metric_values.iter().sum::<f64>() / metric_values.len() as f64;
        let variance = if metric_values.len() > 1 {
            metric_values
                .iter()
                .map(|v| (v - mean).powi(2))
                .sum::<f64>()
                / (metric_values.len() - 1) as f64
        } else {
            0.0
        };
        let std_dev = variance.sqrt();

        let mut anomalies = Vec::new();

        for value in &metric_values {
            let deviation = if std_dev > 0.0 {
                (value - mean).abs() / std_dev
            } else {
                0.0
            };

            if deviation > model.threshold {
                let anomaly_type = if *value > mean {
                    AnomalyType::Spike
                } else {
                    AnomalyType::Drop
                };

                let severity = if deviation > model.threshold * 2.0 {
                    AnomalySeverity::Critical
                } else if deviation > model.threshold * 1.5 {
                    AnomalySeverity::High
                } else {
                    AnomalySeverity::Medium
                };

                anomalies.push(Anomaly::new(
                    anomaly_type,
                    severity,
                    metric_name.to_string(),
                    mean,
                    *value,
                    deviation,
                ));
            }
        }

        if !anomalies.is_empty() {
            let mut stored = store.anomalies.lock().await;
            stored.extend(anomalies.clone());
            if stored.len() > 5000 {
                stored.truncate(2500);
            }
        }

        anomalies
    }

    pub async fn get_anomalies(
        anomaly_type: Option<AnomalyType>,
        severity: Option<AnomalySeverity>,
        metric_name: Option<&str>,
        limit: Option<u32>,
    ) -> Vec<Anomaly> {
        let store = get_monitoring_store();
        let anomalies = store.anomalies.lock().await;
        let limit = limit.unwrap_or(50).min(500) as usize;

        anomalies
            .iter()
            .filter(|a| {
                anomaly_type.as_ref().map_or(true, |t| a.anomaly_type == *t)
                    && severity.as_ref().map_or(true, |s| a.severity == *s)
                    && metric_name.map_or(true, |m| a.metric_name == m)
            })
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub async fn create_model(model: DetectionModel) -> DetectionModel {
        let store = get_monitoring_store();
        let mut models = store.detection_models.lock().await;
        models.push(model.clone());
        model
    }

    pub async fn update_model(id: &str, updates: DetectionModel) -> Result<DetectionModel, String> {
        let store = get_monitoring_store();
        let mut models = store.detection_models.lock().await;

        let model = models
            .iter_mut()
            .find(|m| m.id == id)
            .ok_or_else(|| format!("检测模型 '{}' 不存在", id))?;

        model.metric_name = updates.metric_name;
        model.algorithm = updates.algorithm;
        model.threshold = updates.threshold;
        model.sensitivity = updates.sensitivity;

        Ok(model.clone())
    }

    pub async fn get_models(metric_name: Option<&str>) -> Vec<DetectionModel> {
        let store = get_monitoring_store();
        let models = store.detection_models.lock().await;

        if let Some(name) = metric_name {
            models
                .iter()
                .filter(|m| m.metric_name == name)
                .cloned()
                .collect()
        } else {
            models.clone()
        }
    }

    pub async fn get_anomaly_summary() -> AnomalySummary {
        let store = get_monitoring_store();
        let anomalies = store.anomalies.lock().await;

        let mut by_type = HashMap::new();
        let mut by_severity = HashMap::new();
        let mut by_metric = HashMap::new();
        let mut critical_count = 0usize;
        let mut high_count = 0usize;

        for a in anomalies.iter() {
            *by_type
                .entry(a.anomaly_type.as_str().to_string())
                .or_insert(0) += 1;
            *by_severity
                .entry(a.severity.as_str().to_string())
                .or_insert(0) += 1;
            *by_metric.entry(a.metric_name.clone()).or_insert(0) += 1;

            if a.severity == AnomalySeverity::Critical {
                critical_count += 1;
            }
            if a.severity == AnomalySeverity::High {
                high_count += 1;
            }
        }

        AnomalySummary {
            total_anomalies: anomalies.len(),
            by_type,
            by_severity,
            by_metric,
            critical_count,
            high_count,
        }
    }

    pub async fn train_model(model_id: &str) -> Result<DetectionModel, String> {
        let store = get_monitoring_store();
        let mut models = store.detection_models.lock().await;

        let model = models
            .iter_mut()
            .find(|m| m.id == model_id)
            .ok_or_else(|| format!("检测模型 '{}' 不存在", model_id))?;

        let metrics = store.metrics.lock().await;
        let relevant_metrics: Vec<f64> = metrics
            .iter()
            .filter(|m| m.name == model.metric_name)
            .map(|m| m.value)
            .collect();

        if relevant_metrics.len() < 5 {
            return Err("数据点不足，至少需要 5 个数据点".to_string());
        }

        let mean = relevant_metrics.iter().sum::<f64>() / relevant_metrics.len() as f64;
        let variance = if relevant_metrics.len() > 1 {
            relevant_metrics
                .iter()
                .map(|v| (v - mean).powi(2))
                .sum::<f64>()
                / (relevant_metrics.len() - 1) as f64
        } else {
            0.0
        };
        let std_dev = variance.sqrt();

        model.threshold = std_dev * 3.0;
        model.trained_at = Some(chrono::Utc::now().to_rfc3339());

        Ok(model.clone())
    }
}

// ==================== 请求 / 响应结构 ====================

// --- 网关监控请求 ---

#[derive(Debug, Deserialize)]
pub struct RecordMetricRequest {
    pub name: String,
    pub metric_type: Option<String>,
    pub value: f64,
    pub labels: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct MetricsQuery {
    pub name: Option<String>,
    pub metric_type: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct MetricHistoryQuery {
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetThresholdRequest {
    pub metric_name: String,
    pub warning_threshold: f64,
    pub critical_threshold: f64,
    pub comparison_operator: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ThresholdsQuery {
    pub metric_name: Option<String>,
}

// --- 性能追踪请求 ---

#[derive(Debug, Deserialize)]
pub struct StartTraceRequest {
    pub query_hash: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EndTraceRequest {
    pub trace_id: String,
}

#[derive(Debug, Deserialize)]
pub struct AddResolverTimingRequest {
    pub trace_id: String,
    pub path: String,
    pub duration_ms: u64,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListTracesQuery {
    pub query_hash: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct SlowQueriesQuery {
    pub threshold_ms: Option<u64>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ExportTracesRequest {
    pub format: Option<String>,
    pub query_hash: Option<String>,
}

// --- 异常检测请求 ---

#[derive(Debug, Deserialize)]
pub struct DetectAnomaliesRequest {
    pub metric_name: String,
    pub model_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AnomaliesQuery {
    pub anomaly_type: Option<String>,
    pub severity: Option<String>,
    pub metric_name: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModelRequest {
    pub metric_name: String,
    pub algorithm: Option<String>,
    pub threshold: Option<f64>,
    pub sensitivity: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModelRequest {
    pub metric_name: Option<String>,
    pub algorithm: Option<String>,
    pub threshold: Option<f64>,
    pub sensitivity: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct ModelsQuery {
    pub metric_name: Option<String>,
}

// ==================== API 处理器: 网关监控 ====================

pub async fn record_metric_handler(
    State(_state): State<AppState>,
    Json(req): Json<RecordMetricRequest>,
) -> Json<ApiResponse<Metric>> {
    let mtype = req
        .metric_type
        .as_deref()
        .and_then(MetricType::from_str)
        .unwrap_or(MetricType::Gauge);

    let metric = Metric::new(
        req.name,
        mtype,
        req.value,
        req.labels.unwrap_or_else(|| serde_json::json!({})),
    );

    let recorded = GatewayMonitor::record_metric(metric).await;
    Json(ApiResponse::success(recorded, "指标记录成功"))
}

pub async fn get_metrics_handler(
    State(_state): State<AppState>,
    Query(params): Query<MetricsQuery>,
) -> Json<ApiResponse<Vec<Metric>>> {
    let mtype = params.metric_type.as_deref().and_then(MetricType::from_str);

    let metrics = GatewayMonitor::get_metrics(params.name.as_deref(), mtype, params.limit).await;
    Json(ApiResponse::success(metrics, "指标列表"))
}

pub async fn get_health_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<GatewayHealth>> {
    let health = GatewayMonitor::get_health().await;
    Json(ApiResponse::success(health, "网关健康状态"))
}

pub async fn get_dashboard_handler(State(_state): State<AppState>) -> Json<ApiResponse<Dashboard>> {
    let dashboard = GatewayMonitor::get_dashboard().await;
    Json(ApiResponse::success(dashboard, "仪表盘数据"))
}

pub async fn get_metric_history_handler(
    State(_state): State<AppState>,
    Path(metric_name): Path<String>,
    Query(params): Query<MetricHistoryQuery>,
) -> Json<ApiResponse<Vec<Metric>>> {
    let history = GatewayMonitor::get_metric_history(
        &metric_name,
        params.from.as_deref(),
        params.to.as_deref(),
    )
    .await;
    Json(ApiResponse::success(history, "指标历史"))
}

pub async fn set_threshold_handler(
    State(_state): State<AppState>,
    Json(req): Json<SetThresholdRequest>,
) -> Json<ApiResponse<AlertThreshold>> {
    let threshold = AlertThreshold {
        id: uuid::Uuid::new_v4().to_string(),
        metric_name: req.metric_name,
        warning_threshold: req.warning_threshold,
        critical_threshold: req.critical_threshold,
        comparison_operator: req.comparison_operator.unwrap_or_else(|| "gt".to_string()),
        enabled: req.enabled.unwrap_or(true),
    };

    let saved = GatewayMonitor::set_alert_threshold(threshold).await;
    Json(ApiResponse::success(saved, "告警阈值设置成功"))
}

pub async fn get_thresholds_handler(
    State(_state): State<AppState>,
    Query(params): Query<ThresholdsQuery>,
) -> Json<ApiResponse<Vec<AlertThreshold>>> {
    let thresholds = GatewayMonitor::get_alert_thresholds(params.metric_name.as_deref()).await;
    Json(ApiResponse::success(thresholds, "告警阈值列表"))
}

// ==================== API 处理器: 性能追踪 ====================

pub async fn start_trace_handler(
    State(_state): State<AppState>,
    Json(req): Json<StartTraceRequest>,
) -> Json<ApiResponse<Trace>> {
    let trace = PerformanceTracer::start_trace(req.query_hash).await;
    Json(ApiResponse::success(trace, "追踪已启动"))
}

pub async fn end_trace_handler(
    State(_state): State<AppState>,
    Json(req): Json<EndTraceRequest>,
) -> Json<ApiResponse<Trace>> {
    match PerformanceTracer::end_trace(&req.trace_id).await {
        Ok(trace) => Json(ApiResponse::success(trace, "追踪已结束")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn add_resolver_timing_handler(
    State(_state): State<AppState>,
    Json(req): Json<AddResolverTimingRequest>,
) -> Json<ApiResponse<ResolverTiming>> {
    let start_time = req
        .start_time
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
    let end_time = req
        .end_time
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    match PerformanceTracer::add_resolver_timing(
        &req.trace_id,
        req.path,
        req.duration_ms,
        start_time,
        end_time,
    )
    .await
    {
        Ok(timing) => Json(ApiResponse::success(timing, "Resolver 计时已添加")),
        Err(e) => Json(ApiResponse::error(404, &e)),
    }
}

pub async fn get_trace_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Trace>> {
    match PerformanceTracer::get_trace(&id).await {
        Some(trace) => Json(ApiResponse::success(trace, "追踪详情")),
        None => Json(ApiResponse::error(404, "追踪不存在")),
    }
}

pub async fn list_traces_handler(
    State(_state): State<AppState>,
    Query(params): Query<ListTracesQuery>,
) -> Json<ApiResponse<Vec<Trace>>> {
    let traces = PerformanceTracer::list_traces(params.query_hash.as_deref(), params.limit).await;
    Json(ApiResponse::success(traces, "追踪列表"))
}

pub async fn get_slow_queries_handler(
    State(_state): State<AppState>,
    Query(params): Query<SlowQueriesQuery>,
) -> Json<ApiResponse<Vec<Trace>>> {
    let slow = PerformanceTracer::get_slow_queries(params.threshold_ms, params.limit).await;
    Json(ApiResponse::success(slow, "慢查询列表"))
}

pub async fn get_performance_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<PerformanceSummary>> {
    let summary = PerformanceTracer::get_performance_summary().await;
    Json(ApiResponse::success(summary, "性能汇总"))
}

pub async fn export_traces_handler(
    State(_state): State<AppState>,
    Json(req): Json<ExportTracesRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let format = req.format.unwrap_or_else(|| "json".to_string());
    match PerformanceTracer::export_traces(&format, req.query_hash.as_deref()).await {
        Ok(data) => Json(ApiResponse::success(data, "追踪数据导出成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

// ==================== API 处理器: 异常检测 ====================

pub async fn detect_anomalies_handler(
    State(_state): State<AppState>,
    Json(req): Json<DetectAnomaliesRequest>,
) -> Json<ApiResponse<Vec<Anomaly>>> {
    let anomalies =
        AnomalyDetector::detect_anomalies(&req.metric_name, req.model_id.as_deref()).await;
    Json(ApiResponse::success(anomalies, "异常检测完成"))
}

pub async fn get_anomalies_handler(
    State(_state): State<AppState>,
    Query(params): Query<AnomaliesQuery>,
) -> Json<ApiResponse<Vec<Anomaly>>> {
    let atype = params
        .anomaly_type
        .as_deref()
        .and_then(AnomalyType::from_str);
    let severity = params
        .severity
        .as_deref()
        .and_then(AnomalySeverity::from_str);

    let anomalies = AnomalyDetector::get_anomalies(
        atype,
        severity,
        params.metric_name.as_deref(),
        params.limit,
    )
    .await;
    Json(ApiResponse::success(anomalies, "异常事件列表"))
}

pub async fn create_model_handler(
    State(_state): State<AppState>,
    Json(req): Json<CreateModelRequest>,
) -> Json<ApiResponse<DetectionModel>> {
    let algorithm = req
        .algorithm
        .as_deref()
        .and_then(DetectionAlgorithm::from_str)
        .unwrap_or(DetectionAlgorithm::ZScore);

    let model = DetectionModel {
        id: uuid::Uuid::new_v4().to_string(),
        metric_name: req.metric_name,
        algorithm,
        threshold: req.threshold.unwrap_or(3.0),
        sensitivity: req.sensitivity.unwrap_or(0.05),
        trained_at: None,
    };

    let created = AnomalyDetector::create_model(model).await;
    Json(ApiResponse::success(created, "检测模型创建成功"))
}

pub async fn update_model_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateModelRequest>,
) -> Json<ApiResponse<DetectionModel>> {
    let current = match AnomalyDetector::get_models(Some(&id))
        .await
        .first()
        .cloned()
    {
        Some(m) => m,
        None => return Json(ApiResponse::error(404, "检测模型不存在")),
    };

    let algorithm = req
        .algorithm
        .as_deref()
        .and_then(DetectionAlgorithm::from_str)
        .unwrap_or(current.algorithm);

    let updates = DetectionModel {
        id: id.clone(),
        metric_name: req.metric_name.unwrap_or(current.metric_name),
        algorithm,
        threshold: req.threshold.unwrap_or(current.threshold),
        sensitivity: req.sensitivity.unwrap_or(current.sensitivity),
        trained_at: current.trained_at,
    };

    match AnomalyDetector::update_model(&id, updates).await {
        Ok(model) => Json(ApiResponse::success(model, "检测模型更新成功")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

pub async fn get_models_handler(
    State(_state): State<AppState>,
    Query(params): Query<ModelsQuery>,
) -> Json<ApiResponse<Vec<DetectionModel>>> {
    let models = AnomalyDetector::get_models(params.metric_name.as_deref()).await;
    Json(ApiResponse::success(models, "检测模型列表"))
}

pub async fn get_anomaly_summary_handler(
    State(_state): State<AppState>,
) -> Json<ApiResponse<AnomalySummary>> {
    let summary = AnomalyDetector::get_anomaly_summary().await;
    Json(ApiResponse::success(summary, "异常检测汇总"))
}

pub async fn train_model_handler(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<DetectionModel>> {
    match AnomalyDetector::train_model(&id).await {
        Ok(model) => Json(ApiResponse::success(model, "模型训练完成")),
        Err(e) => Json(ApiResponse::error(400, &e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: serde::Serialize + for<'d> serde::Deserialize<'d>>(value: &T) -> bool {
        let json = serde_json::to_value(value).unwrap();
        let back: T = serde_json::from_value(json.clone()).unwrap();
        let json2 = serde_json::to_value(&back).unwrap();
        json == json2
    }

    // ---- MetricType ----

    #[test]
    fn metric_type_roundtrip_all() {
        for v in MetricType::all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn metric_type_as_str_from_str() {
        for v in MetricType::all() {
            let s = v.as_str();
            assert_eq!(MetricType::from_str(s), Some(v.clone()));
        }
        assert_eq!(MetricType::from_str("__unknown__"), None);
    }

    // ---- HealthStatus ----

    #[test]
    fn health_status_roundtrip_all() {
        for v in HealthStatus::all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn health_status_as_str_from_str() {
        for v in HealthStatus::all() {
            let s = v.as_str();
            assert_eq!(HealthStatus::from_str(s), Some(v.clone()));
        }
        assert_eq!(HealthStatus::from_str("__unknown__"), None);
    }

    // ---- AnomalyType ----

    #[test]
    fn anomaly_type_roundtrip_all() {
        for v in AnomalyType::all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn anomaly_type_as_str_from_str() {
        for v in AnomalyType::all() {
            let s = v.as_str();
            assert_eq!(AnomalyType::from_str(s), Some(v.clone()));
        }
        assert_eq!(AnomalyType::from_str("__unknown__"), None);
    }

    // ---- AnomalySeverity ----

    #[test]
    fn anomaly_severity_roundtrip_all() {
        for v in AnomalySeverity::all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn anomaly_severity_as_str_from_str() {
        for v in AnomalySeverity::all() {
            let s = v.as_str();
            assert_eq!(AnomalySeverity::from_str(s), Some(v.clone()));
        }
        assert_eq!(AnomalySeverity::from_str("__unknown__"), None);
    }

    // ---- DetectionAlgorithm ----

    #[test]
    fn detection_algorithm_roundtrip_all() {
        for v in DetectionAlgorithm::all() {
            assert!(roundtrip(&v), "roundtrip failed for {:?}", v);
        }
    }

    #[test]
    fn detection_algorithm_as_str_from_str() {
        for v in DetectionAlgorithm::all() {
            let s = v.as_str();
            assert_eq!(DetectionAlgorithm::from_str(s), Some(v.clone()));
        }
        assert_eq!(DetectionAlgorithm::from_str("__unknown__"), None);
    }

    #[test]
    fn enum_all_nonempty() {
        assert!(!MetricType::all().is_empty());
        assert!(!HealthStatus::all().is_empty());
        assert!(!AnomalyType::all().is_empty());
        assert!(!AnomalySeverity::all().is_empty());
        assert!(!DetectionAlgorithm::all().is_empty());
    }

    // ---- struct roundtrip ----

    #[test]
    fn struct_roundtrip_metric() {
        let v = Metric {
            id: "m1".into(),
            name: "test_metric".into(),
            metric_type: MetricType::Counter,
            value: 42.0,
            labels: serde_json::json!({"host": "a"}),
            checked_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_gateway_health() {
        let v = GatewayHealth::default();
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_dashboard() {
        let v = Dashboard {
            total_metrics: 10,
            metrics_by_type: [(MetricType::Counter.as_str().to_string(), 1usize)]
                .into_iter()
                .collect(),
            avg_latency_p99: 50.0,
            avg_error_rate: 0.01,
            total_throughput: 1000.0,
            active_connections: 50,
            health_status: HealthStatus::Healthy,
            alerts_count: 3,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_resolver_timing() {
        let v = ResolverTiming {
            path: "Query.user".into(),
            duration_ms: 15,
            start_time: "2025-01-01T00:00:00Z".into(),
            end_time: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_trace() {
        let v = Trace {
            id: "t1".into(),
            query_hash: Some("abc".into()),
            duration_ms: 100,
            resolver_timings: vec![],
            cache_hits: 2,
            errors: vec![],
            traced_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_performance_summary() {
        let v = PerformanceSummary {
            total_traces: 1000,
            avg_duration_ms: 45.0,
            p95_duration_ms: 120.0,
            p99_duration_ms: 200.0,
            slow_queries_count: 5,
            cache_hit_rate: 0.85,
            error_rate: 0.02,
            top_slow_queries: vec![],
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_anomaly() {
        let v = Anomaly {
            id: "a1".into(),
            anomaly_type: AnomalyType::Spike,
            severity: AnomalySeverity::High,
            metric_name: "latency_p99".into(),
            expected_value: 50.0,
            actual_value: 500.0,
            deviation: 10.0,
            detected_at: "2025-01-01T00:00:00Z".into(),
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_detection_model() {
        let v = DetectionModel::default();
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_anomaly_summary() {
        let v = AnomalySummary {
            total_anomalies: 7,
            by_type: [("spike".into(), 2usize)].into_iter().collect(),
            by_severity: [("high".into(), 3usize)].into_iter().collect(),
            by_metric: [("latency".into(), 1usize)].into_iter().collect(),
            critical_count: 1,
            high_count: 3,
        };
        assert!(roundtrip(&v));
    }

    #[test]
    fn struct_roundtrip_alert_threshold() {
        let v = AlertThreshold::default();
        assert!(roundtrip(&v));
    }
}
