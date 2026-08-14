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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exporter_serialization_otlp() {
        let json = serde_json::to_string(&TelemetryExporter::Otlp).unwrap();
        assert!(json.contains("Otlp"));
        let back: TelemetryExporter = serde_json::from_str(&json).unwrap();
        assert_eq!(back, TelemetryExporter::Otlp);
    }

    #[test]
    fn test_exporter_serialization_stdout() {
        let json = serde_json::to_string(&TelemetryExporter::Stdout).unwrap();
        assert!(json.contains("Stdout"));
        let back: TelemetryExporter = serde_json::from_str(&json).unwrap();
        assert_eq!(back, TelemetryExporter::Stdout);
    }

    #[test]
    fn test_exporter_from_env_otlp() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        std::env::set_var("OTEL_EXPORTER", "otlp");
        let exporter = TelemetryExporter::from_env();
        assert_eq!(exporter, TelemetryExporter::Otlp);
        std::env::remove_var("OTEL_EXPORTER");
    }

    #[test]
    fn test_exporter_from_env_stdout_case_insensitive() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        std::env::set_var("OTEL_EXPORTER", "STDOUT");
        let exporter = TelemetryExporter::from_env();
        assert_eq!(exporter, TelemetryExporter::Stdout);
        std::env::remove_var("OTEL_EXPORTER");
    }

    #[test]
    fn test_exporter_from_env_unknown_falls_back_to_otlp() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        std::env::set_var("OTEL_EXPORTER", "unknown-value");
        let exporter = TelemetryExporter::from_env();
        assert_eq!(exporter, TelemetryExporter::Otlp);
        std::env::remove_var("OTEL_EXPORTER");
    }

    #[test]
    fn test_exporter_from_env_missing_defaults_to_otlp() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        std::env::remove_var("OTEL_EXPORTER");
        let exporter = TelemetryExporter::from_env();
        assert_eq!(exporter, TelemetryExporter::Otlp);
    }

    #[test]
    fn test_new_defaults() {
        let cfg = TelemetryConfig::new("my-svc");
        assert_eq!(cfg.service_name, "my-svc");
        assert_eq!(cfg.exporter, TelemetryExporter::Otlp);
        assert_eq!(cfg.otlp_endpoint, "http://localhost:4317");
        assert_eq!(cfg.sampling_rate, 1.0);
        assert_eq!(cfg.service_version, "0.1.0");
        assert!(!cfg.metrics_enabled);
    }

    #[test]
    fn test_new_with_impl_into_string() {
        let cfg = TelemetryConfig::new(String::from("owned-svc"));
        assert_eq!(cfg.service_name, "owned-svc");
    }

    #[test]
    fn test_builder_chain() {
        let cfg = TelemetryConfig::new("my-svc")
            .with_exporter(TelemetryExporter::Stdout)
            .with_endpoint("http://collector:4317")
            .with_sampling_rate(0.1)
            .with_version("2.0.0");

        assert_eq!(cfg.service_name, "my-svc");
        assert_eq!(cfg.exporter, TelemetryExporter::Stdout);
        assert_eq!(cfg.otlp_endpoint, "http://collector:4317");
        assert_eq!(cfg.sampling_rate, 0.1);
        assert_eq!(cfg.service_version, "2.0.0");
        assert!(!cfg.metrics_enabled);
    }

    #[test]
    fn test_with_sampling_rate_clamps() {
        let cfg_low = TelemetryConfig::new("s").with_sampling_rate(-0.5);
        assert_eq!(cfg_low.sampling_rate, 0.0);
        let cfg_high = TelemetryConfig::new("s").with_sampling_rate(5.0);
        assert_eq!(cfg_high.sampling_rate, 1.0);
        let cfg_mid = TelemetryConfig::new("s").with_sampling_rate(0.5);
        assert_eq!(cfg_mid.sampling_rate, 0.5);
    }

    #[test]
    fn test_default_impl() {
        let cfg = TelemetryConfig::default();
        assert_eq!(cfg.service_name, "topems-service");
        assert_eq!(cfg.exporter, TelemetryExporter::Otlp);
        assert_eq!(cfg.sampling_rate, 1.0);
    }

    #[test]
    fn test_from_env_reads_all_vars() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        std::env::set_var("OTEL_EXPORTER", "stdout");
        std::env::set_var("OTEL_EXPORTER_OTLP_ENDPOINT", "http://custom:4317");
        std::env::set_var("OTEL_TRACES_SAMPLER_ARG", "0.25");
        std::env::set_var("OTEL_METRICS_ENABLED", "true");
        std::env::set_var("SERVICE_VERSION", "3.2.1");

        let cfg = TelemetryConfig::from_env("test-svc");
        assert_eq!(cfg.service_name, "test-svc");
        assert_eq!(cfg.exporter, TelemetryExporter::Stdout);
        assert_eq!(cfg.otlp_endpoint, "http://custom:4317");
        assert_eq!(cfg.sampling_rate, 0.25);
        assert_eq!(cfg.service_version, "3.2.1");
        assert!(cfg.metrics_enabled);

        std::env::remove_var("OTEL_EXPORTER");
        std::env::remove_var("OTEL_EXPORTER_OTLP_ENDPOINT");
        std::env::remove_var("OTEL_TRACES_SAMPLER_ARG");
        std::env::remove_var("OTEL_METRICS_ENABLED");
        std::env::remove_var("SERVICE_VERSION");
    }

    #[test]
    fn test_from_env_falls_back_when_missing() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        std::env::remove_var("OTEL_EXPORTER");
        std::env::remove_var("OTEL_EXPORTER_OTLP_ENDPOINT");
        std::env::remove_var("OTEL_TRACES_SAMPLER_ARG");
        std::env::remove_var("OTEL_METRICS_ENABLED");
        std::env::remove_var("SERVICE_VERSION");

        let cfg = TelemetryConfig::from_env("test-svc");
        assert_eq!(cfg.service_name, "test-svc");
        assert_eq!(cfg.exporter, TelemetryExporter::Otlp);
        assert_eq!(cfg.otlp_endpoint, "http://localhost:4317");
        assert_eq!(cfg.sampling_rate, 1.0);
        assert_eq!(cfg.service_version, "0.1.0");
        assert!(!cfg.metrics_enabled);
    }

    #[test]
    fn test_from_env_invalid_sampling_rate_falls_back() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        std::env::set_var("OTEL_TRACES_SAMPLER_ARG", "not-a-number");
        let cfg = TelemetryConfig::from_env("s");
        assert_eq!(cfg.sampling_rate, 1.0);
        std::env::remove_var("OTEL_TRACES_SAMPLER_ARG");
    }

    #[test]
    fn test_from_env_metrics_enabled_truthy_variants() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        for val in ["true", "TRUE", "True", "1"] {
            std::env::set_var("OTEL_METRICS_ENABLED", val);
            let cfg = TelemetryConfig::from_env("s");
            assert!(
                cfg.metrics_enabled,
                "expected metrics_enabled=true for value {val}"
            );
            std::env::remove_var("OTEL_METRICS_ENABLED");
        }
    }

    #[test]
    fn test_from_env_metrics_enabled_falsy() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK.lock().unwrap();
        for val in ["false", "0", "no", ""] {
            std::env::set_var("OTEL_METRICS_ENABLED", val);
            let cfg = TelemetryConfig::from_env("s");
            assert!(!cfg.metrics_enabled, "expected false for value {val}");
            std::env::remove_var("OTEL_METRICS_ENABLED");
        }
    }

    #[test]
    fn test_config_clone_and_debug() {
        let cfg = TelemetryConfig::new("clone-test");
        let cloned = cfg.clone();
        assert_eq!(cloned.service_name, "clone-test");
        let debug = format!("{cfg:?}");
        assert!(debug.contains("clone-test"));
    }

}
