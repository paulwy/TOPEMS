pub mod business_spans;
pub mod config;
pub mod middleware;

pub use business_spans::*;
pub use config::*;
pub use middleware::*;

use tracing_subscriber::{layer::SubscriberExt, EnvFilter, Registry};

use crate::logging::{init_logging, LogFormat};

pub fn init_telemetry(service_name: &str) -> TelemetryGuard {
    let log_format = LogFormat::from_env();

    let otel_enabled = std::env::var("OTEL_ENABLED")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);

    if !otel_enabled {
        init_logging(service_name);
        return TelemetryGuard {
            otel_enabled: false,
        };
    }

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(format!("{},info", service_name)));

    setup_subscriber(env_filter, log_format);

    tracing::info!(
        "✅ {} OpenTelemetry 初始化完成 (exporter: Stdout)",
        service_name,
    );

    TelemetryGuard { otel_enabled: true }
}

fn setup_subscriber(env_filter: EnvFilter, log_format: LogFormat) {
    match log_format {
        LogFormat::Json => {
            let subscriber = Registry::default().with(env_filter).with(
                tracing_subscriber::fmt::layer()
                    .event_format(crate::logging::JsonEventFormatter::new()),
            );
            tracing::subscriber::set_global_default(subscriber)
                .expect("Failed to set global subscriber");
        }
        LogFormat::File => {
            let subscriber = Registry::default().with(env_filter).with(
                tracing_subscriber::fmt::layer()
                    .event_format(crate::logging::JsonEventFormatter::new()),
            );
            tracing::subscriber::set_global_default(subscriber)
                .expect("Failed to set global subscriber");
        }
        LogFormat::Text => {
            let subscriber = Registry::default()
                .with(env_filter)
                .with(tracing_subscriber::fmt::layer());
            tracing::subscriber::set_global_default(subscriber)
                .expect("Failed to set global subscriber");
        }
    }
}

pub struct TelemetryGuard {
    otel_enabled: bool,
}

impl Drop for TelemetryGuard {
    fn drop(&mut self) {
        if self.otel_enabled {
            tracing::info!("🛑 OpenTelemetry 已关闭");
        }
    }
}

fn __ensure_send_sync() {
    fn assert_send<T: Send>() {}
    fn assert_sync<T: Sync>() {}
    assert_send::<TelemetryGuard>();
    assert_sync::<TelemetryGuard>();
}
