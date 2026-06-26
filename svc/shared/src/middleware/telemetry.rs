//! OpenTelemetry Telemetry Middleware
//! 
//! Provides distributed tracing and metrics collection.

use std::time::Instant;
use tracing::{info_span, Span};

/// Request tracing context
#[derive(Clone)]
pub struct TraceContext {
    pub trace_id: String,
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub service_name: String,
    pub operation: String,
}

impl TraceContext {
    pub fn new(service_name: impl Into<String>, operation: impl Into<String>) -> Self {
        Self {
            trace_id: uuid::Uuid::new_v4().to_string(),
            span_id: uuid::Uuid::new_v4().to_string(),
            parent_span_id: None,
            service_name: service_name.into(),
            operation: operation.into(),
        }
    }

    pub fn with_parent(mut self, parent_trace_id: impl Into<String>, parent_span_id: impl Into<String>) -> Self {
        self.trace_id = parent_trace_id.into();
        self.parent_span_id = Some(parent_span_id.into());
        self
    }

    pub fn to_headers(&self) -> Vec<(String, String)> {
        vec![
            ("x-trace-id".to_string(), self.trace_id.clone()),
            ("x-span-id".to_string(), self.span_id.clone()),
            ("x-service-name".to_string(), self.service_name.clone()),
        ]
    }

    pub fn from_headers(headers: &axum::http::HeaderMap) -> Option<Self> {
        let trace_id = headers.get("x-trace-id")?.to_str().ok()?;
        let parent_span_id = headers.get("x-span-id")?.to_str().ok()?;
        let service_name = headers.get("x-service-name")?.to_str().unwrap_or("unknown");

        Some(Self {
            trace_id: trace_id.to_string(),
            span_id: uuid::Uuid::new_v4().to_string(),
            parent_span_id: Some(parent_span_id.to_string()),
            service_name: service_name.to_string(),
            operation: "request".to_string(),
        })
    }
}

/// Telemetry span for tracking operations
pub struct TelemetrySpan {
    span: Span,
    start: Instant,
    operation: String,
}

impl TelemetrySpan {
    pub fn new(name: impl Into<String>) -> Self {
        let name = name.into();
        let span = info_span!("operation", operation = %name);
        Self {
            span,
            start: Instant::now(),
            operation: name,
        }
    }

    pub fn with_attribute(self, key: impl Into<String>, value: impl Into<String>) -> Self {
        let key = key.into();
        let value = value.into();
        tracing::info!(parent: &self.span, %key, %value, "attribute");
        self
    }

    pub fn record_error(self, error: &str) {
        let duration = self.start.elapsed();
        tracing::error!(
            parent: &self.span,
            operation = %self.operation,
            error = %error,
            duration_ms = duration.as_millis() as u64,
            "operation_failed"
        );
    }

    pub fn record_success(self) {
        let duration = self.start.elapsed();
        tracing::info!(
            parent: &self.span,
            operation = %self.operation,
            duration_ms = duration.as_millis() as u64,
            "operation_completed"
        );
    }
}

/// Middleware for distributed tracing
pub async fn trace_middleware(
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let start = Instant::now();
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    // Extract or create trace context
    let trace_ctx = TraceContext::from_headers(request.headers())
        .unwrap_or_else(|| TraceContext::new("api", &format!("{} {}", method, path)));

    let span = info_span!(
        "http_request",
        trace_id = %trace_ctx.trace_id,
        span_id = %trace_ctx.span_id,
        method = %method,
        path = %path,
        service = %trace_ctx.service_name,
    );

    let _enter = span.enter();

    let response = next.run(request).await;
    let duration = start.elapsed();
    let status = response.status().as_u16();

    tracing::info!(
        status = status,
        duration_ms = duration.as_millis() as u64,
        "request_completed"
    );

    response
}

/// Record a business metric
pub fn record_metric(name: &str, value: f64, labels: &[(&str, &str)]) {
    let labels_str: String = labels
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join(",");

    tracing::info!(
        metric_name = %name,
        metric_value = %value,
        metric_labels = %labels_str,
        "business_metric"
    );
}

/// Record a custom event
pub fn record_event(event_name: &str, attributes: &[(&str, &str)]) {
    let attrs: std::collections::HashMap<String, String> = attributes
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();

    tracing::info!(
        event = %event_name,
        attributes = ?attrs,
        "custom_event"
    );
}
