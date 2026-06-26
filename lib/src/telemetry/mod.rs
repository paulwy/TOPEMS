pub mod config;
pub mod middleware;

pub use config::*;
pub use middleware::*;

use opentelemetry::{global, trace::TracerProvider as _, KeyValue};
use opentelemetry_sdk::{
    propagation::TraceContextPropagator,
    trace::{Config, Sampler, TracerProvider},
    Resource,
};
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::{layer::SubscriberExt, EnvFilter, Registry};

use crate::logging::{init_logging, LogFormat};

pub fn init_telemetry(service_name: &str) -> TelemetryGuard {
    let log_format = LogFormat::from_env();

    let otel_enabled = std::env::var("OTEL_ENABLED")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);

    if !otel_enabled {
        init_logging(service_name);
        return TelemetryGuard { otel_enabled: false };
    }

    let config = TelemetryConfig::from_env(service_name);

    global::set_text_map_propagator(TraceContextPropagator::new());

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(format!("{},info", service_name)));

    match config.exporter {
        TelemetryExporter::Otlp => {
            let tracer = opentelemetry_otlp::new_pipeline()
                .tracing()
                .with_exporter(
                    opentelemetry_otlp::new_exporter()
                        .tonic()
                        .with_endpoint(&config.otlp_endpoint),
                )
                .with_trace_config(build_trace_config(&config))
                .install_simple()
                .unwrap();

            let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);
            setup_subscriber(env_filter, telemetry_layer, log_format);
        }
        TelemetryExporter::Stdout => {
            let exporter = opentelemetry_stdout::SpanExporter::default();
            let provider = TracerProvider::builder()
                .with_config(build_trace_config(&config))
                .with_simple_exporter(exporter)
                .build();

            let tracer = provider.versioned_tracer(
                config.service_name.clone(),
                Some(config.service_version.clone()),
                None::<String>,
                None,
            );

            let _ = global::set_tracer_provider(provider);

            let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);
            setup_subscriber(env_filter, telemetry_layer, log_format);
        }
        TelemetryExporter::Jaeger => {
            let agent_host = std::env::var("OTEL_EXPORTER_JAEGER_AGENT_HOST")
                .unwrap_or_else(|_| "localhost".to_string());
            let agent_port = std::env::var("OTEL_EXPORTER_JAEGER_AGENT_PORT")
                .unwrap_or_else(|_| "6831".to_string())
                .parse::<u16>()
                .unwrap_or(6831);

            let tracer = opentelemetry_jaeger::new_agent_pipeline()
                .with_service_name(&config.service_name)
                .with_endpoint(format!("{}:{}", agent_host, agent_port))
                .with_trace_config(build_trace_config(&config))
                .install_simple()
                .unwrap();

            let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);
            setup_subscriber(env_filter, telemetry_layer, log_format);
        }
    }

    tracing::info!(
        "✅ {} OpenTelemetry 初始化完成 (exporter: {:?})",
        service_name,
        config.exporter
    );

    TelemetryGuard { otel_enabled: true }
}

fn build_trace_config(config: &TelemetryConfig) -> Config {
    let resource = build_resource(config);
    Config::default()
        .with_sampler(Sampler::TraceIdRatioBased(config.sampling_rate))
        .with_resource(resource)
}

fn build_resource(config: &TelemetryConfig) -> Resource {
    Resource::new(vec![
        KeyValue::new(
            opentelemetry_semantic_conventions::resource::SERVICE_NAME,
            config.service_name.clone(),
        ),
        KeyValue::new(
            opentelemetry_semantic_conventions::resource::SERVICE_VERSION,
            config.service_version.clone(),
        ),
    ])
}

fn setup_subscriber<L>(env_filter: EnvFilter, layer: L, log_format: LogFormat)
where
    L: tracing_subscriber::layer::Layer<
            tracing_subscriber::layer::Layered<EnvFilter, Registry>,
        > + Send
        + Sync
        + 'static,
{
    match log_format {
        LogFormat::Json => {
            let subscriber = Registry::default()
                .with(env_filter)
                .with(layer)
                .with(
                    tracing_subscriber::fmt::layer()
                        .event_format(crate::logging::JsonEventFormatter::new()),
                );
            tracing::subscriber::set_global_default(subscriber)
                .expect("Failed to set global subscriber");
        }
        LogFormat::Text => {
            let subscriber = Registry::default()
                .with(env_filter)
                .with(layer)
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
            global::shutdown_tracer_provider();
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
