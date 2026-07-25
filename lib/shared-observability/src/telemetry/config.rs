use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TelemetryExporter {
    Otlp,
    Stdout,
}

impl TelemetryExporter {
    fn from_env() -> Self {
        std::env::var("OTEL_EXPORTER")
            .map(|v| match v.to_lowercase().as_str() {
                "otlp" => TelemetryExporter::Otlp,
                "stdout" => TelemetryExporter::Stdout,
                _ => TelemetryExporter::Otlp,
            })
            .unwrap_or(TelemetryExporter::Otlp)
    }
}

#[derive(Debug, Clone)]
pub struct TelemetryConfig {
    pub service_name: String,
    pub service_version: String,
    pub exporter: TelemetryExporter,
    pub otlp_endpoint: String,
    pub sampling_rate: f64,
    pub metrics_enabled: bool,
}

impl TelemetryConfig {
    pub fn from_env(service_name: &str) -> Self {
        let sampling_rate = std::env::var("OTEL_TRACES_SAMPLER_ARG")
            .ok()
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(1.0);

        let metrics_enabled = std::env::var("OTEL_METRICS_ENABLED")
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
            .unwrap_or(false);

        Self {
            service_name: service_name.to_string(),
            service_version: std::env::var("SERVICE_VERSION")
                .unwrap_or_else(|_| "0.1.0".to_string()),
            exporter: TelemetryExporter::from_env(),
            otlp_endpoint: std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:4317".to_string()),
            sampling_rate,
            metrics_enabled,
        }
    }

    pub fn new(service_name: impl Into<String>) -> Self {
        Self {
            service_name: service_name.into(),
            service_version: "0.1.0".to_string(),
            exporter: TelemetryExporter::Otlp,
            otlp_endpoint: "http://localhost:4317".to_string(),
            sampling_rate: 1.0,
            metrics_enabled: false,
        }
    }

    pub fn with_exporter(mut self, exporter: TelemetryExporter) -> Self {
        self.exporter = exporter;
        self
    }

    pub fn with_endpoint(mut self, endpoint: impl Into<String>) -> Self {
        self.otlp_endpoint = endpoint.into();
        self
    }

    pub fn with_sampling_rate(mut self, rate: f64) -> Self {
        self.sampling_rate = rate.clamp(0.0, 1.0);
        self
    }

    pub fn with_version(mut self, version: impl Into<String>) -> Self {
        self.service_version = version.into();
        self
    }
}

impl Default for TelemetryConfig {
    fn default() -> Self {
        Self::new("topems-service")
    }
}
