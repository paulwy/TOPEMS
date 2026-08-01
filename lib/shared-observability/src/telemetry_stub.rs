//! OpenTelemetry 桩实现模块
//!
//! 当 `otel` feature 未启用时，提供兼容的 API 桩实现，
//! 确保上层代码无需修改即可编译。

use axum::{
    extract::Request,
    http::HeaderMap,
    middleware::Next,
    response::Response,
    Router,
};

pub async fn telemetry_middleware(request: Request, next: Next) -> Response {
    next.run(request).await
}

pub fn init_telemetry(service_name: &str) -> TelemetryGuard {
    topems_shared_core::logging::init_logging(service_name);
    TelemetryGuard { otel_enabled: false }
}

pub struct TelemetryGuard {
    pub otel_enabled: bool,
}

impl Drop for TelemetryGuard {
    fn drop(&mut self) {}
}

pub fn get_current_trace_context() -> (Option<String>, Option<String>) {
    (None, None)
}

pub fn inject_trace_context(_headers: &mut HeaderMap) {}

#[derive(Debug, Clone, Default)]
pub enum TelemetryExporter {
    #[default]
    Stdout,
    Otlp,
}

#[derive(Debug, Clone)]
pub struct TelemetryConfig {
    pub service_name: String,
    pub service_version: String,
    pub exporter: TelemetryExporter,
    pub endpoint: String,
    pub sampling_rate: f64,
}

impl TelemetryConfig {
    pub fn from_env(service_name: &str) -> Self {
        Self::new(service_name)
    }

    pub fn new(service_name: impl Into<String>) -> Self {
        Self {
            service_name: service_name.into(),
            service_version: env!("CARGO_PKG_VERSION").to_string(),
            exporter: TelemetryExporter::default(),
            endpoint: "http://localhost:4317".to_string(),
            sampling_rate: 1.0,
        }
    }

    pub fn with_exporter(mut self, exporter: TelemetryExporter) -> Self {
        self.exporter = exporter;
        self
    }

    pub fn with_endpoint(mut self, endpoint: impl Into<String>) -> Self {
        self.endpoint = endpoint.into();
        self
    }

    pub fn with_sampling_rate(mut self, rate: f64) -> Self {
        self.sampling_rate = rate;
        self
    }

    pub fn with_version(mut self, version: impl Into<String>) -> Self {
        self.service_version = version.into();
        self
    }
}

pub trait TelemetryExt {
    fn with_telemetry(self) -> Self;
}

impl<S> TelemetryExt for Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    fn with_telemetry(self) -> Self {
        self
    }
}
