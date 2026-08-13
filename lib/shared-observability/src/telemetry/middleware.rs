use axum::{
    extract::Request,
    http::{HeaderMap, HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use opentelemetry::global;
use opentelemetry::propagation::Extractor;
use opentelemetry::trace::TraceContextExt;
use std::time::Instant;
use tracing::info_span;
use tracing_opentelemetry::OpenTelemetrySpanExt;

pub async fn telemetry_middleware(request: Request, next: Next) -> Response {
    let start = Instant::now();
    let method = request.method().clone();
    let path = request.uri().path();
    let host = request.uri().host().unwrap_or("unknown");

    let parent_context = global::get_text_map_propagator(|propagator| {
        propagator.extract(&HeaderMapExtractor(request.headers()))
    });

    let span = info_span!(
        "http_request",
        otel.name = tracing::field::display(format!("{} {}", method, path)),
        http.method = %method,
        http.route = %path,
        http.target = %request.uri(),
        http.scheme = %request.uri().scheme_str().unwrap_or("http"),
        http.host = %host,
        net.host.name = %host,
    );

    let _ = span.set_parent(parent_context);

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

    let ctx = span.context();
    let span_ref = ctx.span();
    let span_context = span_ref.span_context();
    if span_context.is_valid() {
        if let Ok(header_value) = HeaderValue::from_str(&span_context.trace_id().to_string()) {
            response
                .headers_mut()
                .insert(HeaderName::from_static("x-trace-id"), header_value);
        }
    }

    response
}

struct HeaderMapExtractor<'a>(&'a HeaderMap);

impl<'a> Extractor for HeaderMapExtractor<'a> {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|v| v.to_str().ok())
    }

    fn keys(&self) -> Vec<&str> {
        Vec::new()
    }
    // 注意：keys() 返回空 Vec 是有意为之的性能优化。
    // W3C TraceContext propagator 仅通过 get() 方法查找特定键（traceparent, baggage），
    // 无需遍历所有 header。如果未来切换到依赖 keys() 迭代的 propagator（如 Jaeger），
    // 需要改为返回实际的 header 键列表。
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

use axum::Router;

pub trait TelemetryExt {
    fn with_telemetry(self) -> Self;
}

impl<S> TelemetryExt for Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    fn with_telemetry(self) -> Self {
        self.layer(axum::middleware::from_fn(telemetry_middleware))
    }
}

/// 给 reqwest::Request 注入当前 trace context（W3C traceparent + 自定义 headers）
pub fn inject_trace_into_reqwest(req: &mut reqwest::Request) {
    inject_trace_context(req.headers_mut());

    if let Some(tid) = topems_shared_core::logging::get_current_trace_id() {
        if let Ok(val) = HeaderValue::from_str(&tid) {
            req.headers_mut()
                .insert(HeaderName::from_static("x-trace-id"), val);
        }
    }
    if let Some(rid) = topems_shared_core::logging::get_current_request_id() {
        if let Ok(val) = HeaderValue::from_str(&rid) {
            req.headers_mut()
                .insert(HeaderName::from_static("x-request-id"), val);
        }
    }
}

/// Extension trait 让 reqwest::Request 可以直接 `.with_trace()`
pub trait TracedRequestExt {
    fn with_trace(self) -> Self;
}

impl TracedRequestExt for reqwest::Request {
    fn with_trace(mut self) -> Self {
        inject_trace_into_reqwest(&mut self);
        self
    }
}

impl TracedRequestExt for reqwest::RequestBuilder {
    fn with_trace(mut self) -> Self {
        let mut headers = HeaderMap::new();
        inject_trace_context(&mut headers);

        for (key, value) in headers.iter() {
            if let Ok(v) = value.to_str() {
                self = self.header(key.clone(), v);
            }
        }

        if let Some(tid) = topems_shared_core::logging::get_current_trace_id() {
            self = self.header("x-trace-id", &tid);
        }
        if let Some(rid) = topems_shared_core::logging::get_current_request_id() {
            self = self.header("x-request-id", &rid);
        }

        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inject_trace_context_no_op_without_otel_init() {
        let mut headers = HeaderMap::new();
        inject_trace_context(&mut headers);
        assert!(
            headers.is_empty(),
            "OTEL 未初始化时 propagator 应是 no-op，不写入任何 header"
        );
    }

    #[test]
    fn test_inject_trace_context_does_not_panic_with_existing_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(
            HeaderName::from_static("x-existing"),
            HeaderValue::from_static("keep-me"),
        );
        inject_trace_context(&mut headers);
        assert_eq!(
            headers
                .get(HeaderName::from_static("x-existing"))
                .unwrap()
                .to_str()
                .unwrap(),
            "keep-me"
        );
    }

    #[test]
    fn test_inject_trace_into_reqwest_no_op_without_otel_init() {
        let mut req = reqwest::Request::new(
            reqwest::Method::GET,
            reqwest::Url::parse("http://example.com/api").unwrap(),
        );
        inject_trace_into_reqwest(&mut req);
        let headers = req.headers();
        assert!(
            !headers.contains_key(HeaderName::from_static("x-trace-id")),
            "无活跃 trace 时不应注入 x-trace-id"
        );
        assert!(
            !headers.contains_key(HeaderName::from_static("x-request-id")),
            "无活跃 request 时不应注入 x-request-id"
        );
    }

    #[test]
    fn test_inject_trace_into_reqwest_preserves_existing_headers() {
        let mut req = reqwest::Request::new(
            reqwest::Method::POST,
            reqwest::Url::parse("http://example.com/submit").unwrap(),
        );
        req.headers_mut().insert(
            HeaderName::from_static("content-type"),
            HeaderValue::from_static("application/json"),
        );
        inject_trace_into_reqwest(&mut req);
        assert_eq!(
            req.headers()
                .get(HeaderName::from_static("content-type"))
                .unwrap()
                .to_str()
                .unwrap(),
            "application/json"
        );
    }
}
