//! Prometheus Metrics Middleware
//! 
//! Provides HTTP metrics and custom business metrics collection.

use std::sync::Arc;
use std::time::Instant;
use prometheus::{CounterVec, Gauge, GaugeVec, HistogramOpts, HistogramVec, Registry, TextEncoder, Encoder};

/// HTTP metrics collector
#[derive(Clone)]
pub struct HttpMetrics {
    pub request_count: CounterVec,
    pub request_duration: HistogramVec,
    pub request_size: HistogramVec,
    pub response_size: HistogramVec,
    pub active_requests: Gauge,
}

impl HttpMetrics {
    pub fn new(registry: &Registry) -> Result<Self, prometheus::Error> {
        let request_count = CounterVec::new(
            prometheus::Opts::new("http_requests_total", "Total HTTP requests"),
            &["method", "path", "status"],
        )?;
        registry.register(Box::new(request_count.clone()))?;

        let request_duration = HistogramVec::new(
            HistogramOpts::new("http_request_duration_seconds", "HTTP request duration"),
            &["method", "path"],
        )?;
        registry.register(Box::new(request_duration.clone()))?;

        let request_size = HistogramVec::new(
            HistogramOpts::new("http_request_size_bytes", "HTTP request size"),
            &["method", "path"],
        )?;
        registry.register(Box::new(request_size.clone()))?;

        let response_size = HistogramVec::new(
            HistogramOpts::new("http_response_size_bytes", "HTTP response size"),
            &["method", "path"],
        )?;
        registry.register(Box::new(response_size.clone()))?;

        let active_requests = Gauge::new("http_active_requests", "Active HTTP requests")?;
        registry.register(Box::new(active_requests.clone()))?;

        Ok(Self {
            request_count,
            request_duration,
            request_size,
            response_size,
            active_requests,
        })
    }

    pub fn record_request(&self, method: &str, path: &str, status: u16, duration: std::time::Duration) {
        let status_str = status.to_string();
        self.request_count
            .with_label_values(&[method, path, &status_str])
            .inc();
        self.request_duration
            .with_label_values(&[method, path])
            .observe(duration.as_secs_f64());
    }

    pub fn increment_active(&self) {
        self.active_requests.inc();
    }

    pub fn decrement_active(&self) {
        self.active_requests.dec();
    }
}

/// Business metrics collector
#[derive(Clone)]
pub struct BusinessMetrics {
    registry: Registry,
}

impl BusinessMetrics {
    pub fn new() -> Self {
        Self {
            registry: Registry::new(),
        }
    }

    pub fn create_counter(&self, name: &str, help: &str, labels: &[&str]) -> Result<CounterVec, prometheus::Error> {
        let counter = CounterVec::new(
            prometheus::Opts::new(name, help),
            labels,
        )?;
        self.registry.register(Box::new(counter.clone()))?;
        Ok(counter)
    }

    pub fn create_gauge(&self, name: &str, help: &str, labels: &[&str]) -> Result<GaugeVec, prometheus::Error> {
        let gauge = GaugeVec::new(
            prometheus::Opts::new(name, help),
            labels,
        )?;
        self.registry.register(Box::new(gauge.clone()))?;
        Ok(gauge)
    }

    pub fn create_histogram(&self, name: &str, help: &str, labels: &[&str]) -> Result<HistogramVec, prometheus::Error> {
        let histogram = HistogramVec::new(
            HistogramOpts::new(name, help),
            labels,
        )?;
        self.registry.register(Box::new(histogram.clone()))?;
        Ok(histogram)
    }

    pub fn gather(&self) -> Result<String, String> {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = Vec::new();
        encoder.encode(&metric_families, &mut buffer)
            .map_err(|e| format!("Failed to encode metrics: {}", e))?;
        String::from_utf8(buffer)
            .map_err(|e| format!("Invalid UTF-8 in metrics: {}", e))
    }
}

/// Metrics middleware for Axum
pub async fn metrics_middleware(
    metrics: Arc<HttpMetrics>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let start = Instant::now();
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    metrics.increment_active();

    let response = next.run(request).await;
    let duration = start.elapsed();
    let status = response.status().as_u16();

    metrics.decrement_active();
    metrics.record_request(&method, &path, status, duration);

    response
}

/// Default HTTP metrics endpoint handler
pub async fn metrics_handler() -> Result<String, String> {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buffer = Vec::new();
    encoder.encode(&metric_families, &mut buffer)
        .map_err(|e| format!("Failed to encode metrics: {}", e))?;
    String::from_utf8(buffer)
        .map_err(|e| format!("Invalid UTF-8: {}", e))
}
