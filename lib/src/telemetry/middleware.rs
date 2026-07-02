use axum::{
    extract::Request,
    http::{HeaderMap, HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use opentelemetry::global;
use opentelemetry::propagation::Extractor;
use std::time::Instant;
use tracing::info_span;
use tracing_opentelemetry::OpenTelemetrySpanExt;

pub async fn telemetry_middleware(request: Request, next: Next) -> Response {
    let start = Instant::now();
    let method = request.method().clone();
    let path = request.uri().path().to_string();

    let parent_context = global::get_text_map_propagator(|propagator| {
        propagator.extract(&HeaderMapExtractor(request.headers()))
    });

    let span = info_span!(
        "http_request",
        otel.name = %format!("{} {}", method, path),
        http.method = %method,
        http.route = %path,
        http.target = %request.uri(),
        http.scheme = %request.uri().scheme_str().unwrap_or("http"),
        http.host = %request.uri().host().unwrap_or("unknown"),
        net.host.name = %request.uri().host().unwrap_or("unknown"),
    );

    span.set_parent(parent_context);

    let _enter = span.enter();

    let mut response = next.run(request).await;

    let duration = start.elapsed();
    let status = response.status().as_u16();

    span.record("http.status_code", status);
    span.record("duration_ms", duration.as_millis() as u64);

    if status >= 500 {
        span.record("otel.status_code", "ERROR");
    } else {
        span.record("otel.status_code", "OK");
    }

    let trace_id = get_current_trace_id();
    if let Some(trace_id) = trace_id {
        if let Ok(header_value) = HeaderValue::from_str(&trace_id) {
            response
                .headers_mut()
                .insert(HeaderName::from_static("x-trace-id"), header_value);
        }
    }

    response
}

fn get_current_trace_id() -> Option<String> {
    use opentelemetry::trace::TraceContextExt;
    let ctx = opentelemetry::Context::current();
    let span_ref = ctx.span();
    let span_context = span_ref.span_context();
    if span_context.is_valid() {
        Some(span_context.trace_id().to_string())
    } else {
        None
    }
}

struct HeaderMapExtractor<'a>(&'a HeaderMap);

impl<'a> Extractor for HeaderMapExtractor<'a> {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|v| v.to_str().ok())
    }

    fn keys(&self) -> Vec<&str> {
        self.0.keys().map(|k| k.as_str()).collect()
    }
}

pub fn inject_trace_context(headers: &mut HeaderMap) {
    global::get_text_map_propagator(|propagator| {
        let mut injector = HeaderMapInjector(headers);
        propagator.inject_context(&opentelemetry::Context::current(), &mut injector);
    });
}

struct HeaderMapInjector<'a>(&'a mut HeaderMap);

impl<'a> opentelemetry::propagation::Injector for HeaderMapInjector<'a> {
    fn set(&mut self, key: &str, value: String) {
        if let (Ok(name), Ok(val)) = (HeaderName::try_from(key), HeaderValue::try_from(value)) {
            self.0.insert(name, val);
        }
    }
}
