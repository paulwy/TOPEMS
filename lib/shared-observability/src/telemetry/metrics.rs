//! OpenTelemetry Metrics 模块
//!
//! 提供 OTel Metrics 的初始化和管理，支持 OTLP 和 stdout exporter。
//! 通过环境变量 OTEL_METRICS_ENABLED=true 启用。
//! 与现有 Prometheus /metrics endpoint 并存，逐步迁移。

use opentelemetry::{global, KeyValue};
use opentelemetry_sdk::metrics::{PeriodicReader, SdkMeterProvider};
use opentelemetry_sdk::Resource;
use opentelemetry_semantic_conventions::resource as semconv;
use std::sync::Mutex;
use tracing::{info, warn};

use crate::telemetry::TelemetryExporter;

static METER_PROVIDER: Mutex<Option<opentelemetry_sdk::metrics::SdkMeterProvider>> =
    Mutex::new(None);

/// 初始化 OTel Metrics
///
/// 返回 MetricsGuard，Drop 时自动 shutdown provider。
pub fn init_metrics(service_name: &str, exporter: TelemetryExporter) -> MetricsGuard {
    let metrics_enabled = std::env::var("OTEL_METRICS_ENABLED")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);

    if !metrics_enabled {
        return MetricsGuard { enabled: false };
    }

    let service_name: &'static str = Box::leak(service_name.to_string().into_boxed_str());

    let resource = Resource::builder()
        .with_attributes(vec![
            KeyValue::new(semconv::SERVICE_NAME, service_name),
            KeyValue::new(
                semconv::SERVICE_VERSION,
                std::env::var("OTEL_SERVICE_VERSION").unwrap_or_else(|_| "unknown".to_string()),
            ),
            KeyValue::new(semconv::TELEMETRY_SDK_NAME, "opentelemetry"),
            KeyValue::new(semconv::TELEMETRY_SDK_LANGUAGE, "rust"),
            KeyValue::new(semconv::TELEMETRY_SDK_VERSION, env!("CARGO_PKG_VERSION")),
        ])
        .build();

    let provider = match exporter {
        TelemetryExporter::Otlp => match opentelemetry_otlp::MetricExporter::builder().build() {
            Ok(exporter) => {
                let reader = PeriodicReader::builder(exporter)
                    .with_interval(std::time::Duration::from_secs(10))
                    .build();

                SdkMeterProvider::builder()
                    .with_resource(resource)
                    .with_reader(reader)
                    .build()
            }
            Err(e) => {
                warn!("OTLP metrics exporter 创建失败，回退到 stdout: {}", e);
                let stdout_reader =
                    PeriodicReader::builder(opentelemetry_stdout::MetricExporter::default())
                        .build();
                SdkMeterProvider::builder()
                    .with_resource(resource)
                    .with_reader(stdout_reader)
                    .build()
            }
        },
        TelemetryExporter::Stdout => {
            let reader =
                PeriodicReader::builder(opentelemetry_stdout::MetricExporter::default()).build();
            SdkMeterProvider::builder()
                .with_resource(resource)
                .with_reader(reader)
                .build()
        }
    };

    // 注册到 global provider
    global::set_meter_provider(provider.clone());

    let mut provider_guard = METER_PROVIDER.lock().unwrap_or_else(|e| {
        tracing::error!("Lock poisoned: {}", e);
        e.into_inner()
    });
    if let Some(old_provider) = provider_guard.take() {
        let _ = old_provider.shutdown();
    }
    *provider_guard = Some(provider);

    info!(
        "✅ OpenTelemetry Metrics 初始化完成 (exporter: {:?})",
        exporter
    );

    MetricsGuard { enabled: true }
}

/// Metrics 守护句柄
///
/// Drop 时自动 shutdown meter provider，确保指标被 flush。
pub struct MetricsGuard {
    enabled: bool,
}

impl Drop for MetricsGuard {
    fn drop(&mut self) {
        if self.enabled {
            tracing::info!("🛑 Metrics guard dropped, flushing remaining metrics...");
            let mut provider_guard = METER_PROVIDER.lock().unwrap_or_else(|e| {
                tracing::error!("Lock poisoned: {}", e);
                e.into_inner()
            });
            if let Some(provider) = provider_guard.take() {
                let _ = provider.shutdown();
            }
            tracing::info!("✅ Metrics flush complete");
        }
    }
}

/// 获取全局 meter
///
/// 用于创建 counter、histogram 等指标。
/// 如果 OTel Metrics 未启用，返回 noop meter。
pub fn meter(name: &'static str) -> opentelemetry::metrics::Meter {
    global::meter(name)
}

/// 创建或获取一个 u64 counter
pub fn u64_counter(
    name: &'static str,
    description: &'static str,
    unit: Option<&'static str>,
) -> opentelemetry::metrics::Counter<u64> {
    // 绑定到 let 以延长生命周期，避免临时值被提前 drop
    let meter = meter(module_path!());
    let mut builder = meter.u64_counter(name).with_description(description);
    if let Some(u) = unit {
        builder = builder.with_unit(u);
    }
    builder.build()
}

/// 创建或获取一个 f64 counter
pub fn f64_counter(
    name: &'static str,
    description: &'static str,
    unit: Option<&'static str>,
) -> opentelemetry::metrics::Counter<f64> {
    let meter = meter(module_path!());
    let mut builder = meter.f64_counter(name).with_description(description);
    if let Some(u) = unit {
        builder = builder.with_unit(u);
    }
    builder.build()
}

/// 创建或获取一个 u64 histogram（用于延迟/持续时间测量）
pub fn u64_histogram(
    name: &'static str,
    description: &'static str,
    unit: Option<&'static str>,
) -> opentelemetry::metrics::Histogram<u64> {
    let meter = meter(module_path!());
    let mut builder = meter.u64_histogram(name).with_description(description);
    if let Some(u) = unit {
        builder = builder.with_unit(u);
    }
    builder.build()
}

/// 创建或获取一个 f64 histogram（用于延迟/持续时间测量）
pub fn f64_histogram(
    name: &'static str,
    description: &'static str,
    unit: Option<&'static str>,
) -> opentelemetry::metrics::Histogram<f64> {
    let meter = meter(module_path!());
    let mut builder = meter.f64_histogram(name).with_description(description);
    if let Some(u) = unit {
        builder = builder.with_unit(u);
    }
    builder.build()
}

/// 创建或获取一个 up-down counter（可增可减）
pub fn i64_up_down_counter(
    name: &'static str,
    description: &'static str,
    unit: Option<&'static str>,
) -> opentelemetry::metrics::UpDownCounter<i64> {
    let meter = meter(module_path!());
    let mut builder = meter
        .i64_up_down_counter(name)
        .with_description(description);
    if let Some(u) = unit {
        builder = builder.with_unit(u);
    }
    builder.build()
}

/// 创建或获取一个 observable gauge（通过回调获取值）
pub fn register_u64_observable_gauge<F>(
    name: &'static str,
    description: &'static str,
    unit: Option<&'static str>,
    callbacks: Vec<F>,
) where
    F: Fn(&dyn opentelemetry::metrics::AsyncInstrument<u64>) + Send + Sync + 'static,
{
    let meter = meter(module_path!());
    let mut builder = meter
        .u64_observable_gauge(name)
        .with_description(description);
    if let Some(u) = unit {
        builder = builder.with_unit(u);
    }
    for cb in callbacks {
        builder = builder.with_callback(cb);
    }
    let _ = builder.build();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_disabled_by_default() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK
            .lock()
            .unwrap();
        std::env::remove_var("OTEL_METRICS_ENABLED");
        let guard = init_metrics("test-service", TelemetryExporter::Stdout);
        assert!(!guard.enabled);
    }

    #[test]
    fn test_meter_returns_noop_when_disabled() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK
            .lock()
            .unwrap();
        std::env::remove_var("OTEL_METRICS_ENABLED");
        let _guard = init_metrics("test-service", TelemetryExporter::Stdout);
        let meter = meter("test");
        let counter = meter.u64_counter("test_counter").build();
        // Noop counter should not panic
        counter.add(1, &[]);
    }

    #[test]
    fn test_u64_counter_helper_noop_does_not_panic() {
        // global::meter is noop when no provider is set; no env-var read here.
        let counter = u64_counter("test_u64_counter", "test counter", Some("ms"));
        counter.add(42, &[]);
        counter.add(58, &[]);
        // Noop counter — no observable state to assert beyond "no panic".
    }

    #[test]
    fn test_f64_counter_helper_noop_does_not_panic() {
        let counter = f64_counter("test_f64_counter", "test f64 counter", None);
        counter.add(1.5, &[]);
        counter.add(2.5, &[]);
    }

    #[test]
    fn test_u64_histogram_helper_noop_does_not_panic() {
        let histogram = u64_histogram("test_u64_histogram", "test histogram", Some("ms"));
        histogram.record(10, &[]);
        histogram.record(100, &[]);
    }

    #[test]
    fn test_f64_histogram_helper_noop_does_not_panic() {
        let histogram = f64_histogram("test_f64_histogram", "test f64 histogram", None);
        histogram.record(0.5, &[]);
        histogram.record(1.5, &[]);
    }

    #[test]
    fn test_i64_up_down_counter_helper_noop_does_not_panic() {
        let counter = i64_up_down_counter("test_up_down", "test up-down", None);
        counter.add(10, &[]);
        counter.add(-5, &[]);
        counter.add(-5, &[]);
    }

    #[test]
    fn test_register_u64_observable_gauge_noop_does_not_panic() {
        fn gauge_cb(_inst: &dyn opentelemetry::metrics::AsyncInstrument<u64>) {}
        register_u64_observable_gauge(
            "test_observable_gauge",
            "test observable gauge",
            Some("count"),
            vec![gauge_cb, gauge_cb, gauge_cb],
        );
        // Noop registration — just ensure it does not panic with multiple callbacks.
    }

    #[test]
    fn test_metrics_guard_disabled_drop_is_no_op() {
        let _env_lock = crate::telemetry::test_support::OTEL_ENV_LOCK
            .lock()
            .unwrap();
        std::env::remove_var("OTEL_METRICS_ENABLED");
        let guard = init_metrics("test-service-disabled", TelemetryExporter::Stdout);
        assert!(!guard.enabled);
        // Drop is a no-op when disabled; this should not panic.
        drop(guard);
    }

    #[test]
    fn test_meter_function_returns_meter() {
        let m = meter("test-meter-instance");
        // A meter (even noop) should be able to build an instrument.
        let _counter = m.u64_counter("instance_counter").build();
        let _histogram = m.f64_histogram("instance_histogram").build();
    }
}
