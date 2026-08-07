//! OpenTelemetry 分布式追踪模块
//!
//! **重要限制**：当前实现未调用 `opentelemetry::global::set_tracer_provider()`，
//! 因为该函数会消费 provider 的所有权，与 Mutex 中存储 provider 以便后续 shutdown 冲突。
//! 本模块依赖 `tracing-opentelemetry` 层的独立 tracer 实例工作，
//! 不支持通过 `opentelemetry::global::tracer()` API 获取 tracer。
//!
//! 如果需要使用 `global::tracer()`，请在初始化后手动调用
//! `global::set_tracer_provider()`，但这会导致 `TelemetryGuard` 的 shutdown 功能失效。

pub mod business_spans;
pub mod config;
pub mod macros;
pub mod middleware;

pub use business_spans::*;
pub use config::*;
pub use middleware::TelemetryExt;
pub use middleware::*;

use opentelemetry::{global, trace::TracerProvider, KeyValue};
use opentelemetry_sdk::{
    propagation::{BaggagePropagator, TraceContextPropagator},
    trace::{BatchSpanProcessor, SdkTracerProvider},
    Resource,
};
use opentelemetry_semantic_conventions::resource as semconv;
use opentelemetry_stdout::SpanExporter as StdoutExporter;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::{
    fmt::Layer, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Registry,
};

use std::sync::Mutex;
use topems_shared_core::logging::init_logging;

static TRACER_PROVIDER: Mutex<Option<SdkTracerProvider>> = Mutex::new(None);

pub fn init_telemetry(service_name: &str) -> TelemetryGuard {
    let otel_enabled = std::env::var("OTEL_ENABLED")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);

    if !otel_enabled {
        init_logging(service_name);
        return TelemetryGuard {
            otel_enabled: false,
        };
    }

    let service_name: &'static str = Box::leak(service_name.to_string().into_boxed_str());
    let config = TelemetryConfig::from_env(service_name);

    let resource = Resource::builder()
        .with_attributes(vec![
            KeyValue::new(semconv::SERVICE_NAME, config.service_name.clone()),
            KeyValue::new(semconv::SERVICE_VERSION, config.service_version.clone()),
            KeyValue::new(semconv::TELEMETRY_SDK_NAME, "opentelemetry"),
            KeyValue::new(semconv::TELEMETRY_SDK_LANGUAGE, "rust"),
            KeyValue::new(semconv::TELEMETRY_SDK_VERSION, env!("CARGO_PKG_VERSION")),
        ])
        .build();

    let tracer_provider = match config.exporter {
        TelemetryExporter::Stdout => {
            let exporter = StdoutExporter::default();
            let batch_processor = BatchSpanProcessor::builder(exporter).build();
            SdkTracerProvider::builder()
                .with_resource(resource)
                .with_span_processor(batch_processor)
                .build()
        }
        TelemetryExporter::Otlp => match opentelemetry_otlp::SpanExporter::builder().build() {
            Ok(exporter) => {
                let batch_processor = BatchSpanProcessor::builder(exporter).build();
                SdkTracerProvider::builder()
                    .with_resource(resource)
                    .with_span_processor(batch_processor)
                    .build()
            }
            Err(e) => {
                tracing::error!(
                    "Failed to create OTLP exporter, falling back to stdout: {}",
                    e
                );
                let exporter = StdoutExporter::default();
                let batch_processor = BatchSpanProcessor::builder(exporter).build();
                SdkTracerProvider::builder()
                    .with_resource(resource)
                    .with_span_processor(batch_processor)
                    .build()
            }
        },
    };

    let tracer = tracer_provider.tracer(service_name);
    let otel_layer = OpenTelemetryLayer::new(tracer);

    let mut provider_guard = TRACER_PROVIDER.lock().unwrap_or_else(|e| {
        tracing::error!("Lock poisoned: {}", e);
        e.into_inner()
    });
    if let Some(old_provider) = provider_guard.take() {
        let _ = old_provider.shutdown();
    }
    *provider_guard = Some(tracer_provider);

    global::set_text_map_propagator(opentelemetry::propagation::TextMapCompositePropagator::new(
        vec![
            Box::new(TraceContextPropagator::new()),
            Box::new(BaggagePropagator::new()),
        ],
    ));

    /// 全链路端口排查日志的默认级别配置（与 shared-core/logging 保持一致）
    const PORT_DIAGNOSTIC_DIRECTIVES: &str =
        "service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug";

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new(format!(
            "{service_name}=info,{directives}",
            service_name = service_name,
            directives = PORT_DIAGNOSTIC_DIRECTIVES
        ))
    });

    let fmt_layer = Layer::new().with_writer(std::io::stdout);

    Registry::default()
        .with(env_filter)
        .with(fmt_layer)
        .with(otel_layer)
        .try_init()
        .unwrap_or_else(|e| {
            tracing::error!("Failed to initialize tracing subscriber: {}", e);
        });

    tracing::info!(
        "✅ OpenTelemetry initialized (exporter: {:?})",
        config.exporter
    );

    TelemetryGuard { otel_enabled: true }
}

pub struct TelemetryGuard {
    pub otel_enabled: bool,
}

impl Drop for TelemetryGuard {
    fn drop(&mut self) {
        if self.otel_enabled {
            tracing::info!("🛑 Telemetry guard dropped, flushing remaining spans...");
            let mut provider_guard = TRACER_PROVIDER.lock().unwrap_or_else(|e| {
                tracing::error!("Lock poisoned: {}", e);
                e.into_inner()
            });
            if let Some(provider) = provider_guard.take() {
                let _ = provider.shutdown();
            }
            tracing::info!("✅ Span flush complete");
        }
    }
}

pub fn get_current_trace_context() -> (Option<String>, Option<String>) {
    use opentelemetry::trace::TraceContextExt;
    let ctx = opentelemetry::Context::current();
    let span = ctx.span();
    let span_context = span.span_context();
    if span_context.is_valid() {
        (
            Some(span_context.trace_id().to_string()),
            Some(span_context.span_id().to_string()),
        )
    } else {
        (None, None)
    }
}

fn __ensure_send_sync() {
    fn assert_send<T: Send>() {}
    fn assert_sync<T: Sync>() {}
    assert_send::<TelemetryGuard>();
    assert_sync::<TelemetryGuard>();
}
