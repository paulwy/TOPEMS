use axum::{
    extract::Request,
    http::{HeaderMap, HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use opentelemetry::trace::TraceContextExt;
use std::cell::RefCell;
use std::time::Instant;
use tracing::info_span;
use uuid::Uuid;

use super::{generate_request_id, TraceContext};

thread_local! {
    static CURRENT_REQUEST_ID: RefCell<Option<String>> = const { RefCell::new(None) };
}

pub struct RequestIdGuard;
impl Drop for RequestIdGuard {
    fn drop(&mut self) {
        CURRENT_REQUEST_ID.with(|c| *c.borrow_mut() = None);
    }
}

#[derive(Clone)]
pub struct RequestContext {
    pub request_id: String,
    pub trace_context: TraceContext,
}

pub async fn request_context_middleware(mut request: Request, next: Next) -> Response {
    let start = Instant::now();

    let request_id = extract_or_generate_request_id(request.headers());
    let trace_context = extract_or_generate_trace_context(request.headers());

    CURRENT_REQUEST_ID.with(|c| *c.borrow_mut() = Some(request_id.clone()));
    let _guard = RequestIdGuard;

    let trace_id_clone = trace_context.trace_id.clone().unwrap_or_default();
    let span_id_clone = trace_context.span_id.clone().unwrap_or_default();

    let span = info_span!(
        "http_request",
        request_id = %request_id,
        trace_id = %trace_id_clone,
        span_id = %span_id_clone,
        http.method = %request.method(),
        http.route = %request.uri().path(),
        http.target = %request.uri(),
        http.scheme = %request.uri().scheme_str().unwrap_or("http"),
    );

    let _enter = span.enter();

    request.extensions_mut().insert(RequestContext {
        request_id: request_id.clone(),
        trace_context: trace_context.clone(),
    });

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

    if let Ok(val) = HeaderValue::from_str(&request_id) {
        response
            .headers_mut()
            .insert(HeaderName::from_static("x-request-id"), val);
    }

    if let Some(trace_id) = &trace_context.trace_id {
        if let Ok(val) = HeaderValue::from_str(trace_id) {
            response
                .headers_mut()
                .insert(HeaderName::from_static("x-trace-id"), val);
        }
    }

    response
}

fn extract_or_generate_request_id(headers: &HeaderMap) -> String {
    headers
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from)
        .unwrap_or_else(|| generate_request_id())
}

fn resolve_trace_context_from_otel() -> Option<TraceContext> {
    let ctx = opentelemetry::Context::current();
    let span = ctx.span();
    let span_context = span.span_context();
    if span_context.is_valid() {
        Some(TraceContext {
            trace_id: Some(span_context.trace_id().to_string()),
            span_id: Some(span_context.span_id().to_string()),
            parent_span_id: None,
        })
    } else {
        None
    }
}

fn extract_or_generate_trace_context(headers: &HeaderMap) -> TraceContext {
    if let Some(otel_ctx) = resolve_trace_context_from_otel() {
        return otel_ctx;
    }

    let trace_id = headers
        .get("x-trace-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let span_id = headers
        .get("x-span-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let parent_span_id = headers
        .get("x-parent-span-id")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    if trace_id.is_some() {
        TraceContext {
            trace_id,
            span_id: span_id.or_else(|| Some(generate_span_id())),
            parent_span_id,
        }
    } else {
        TraceContext::new()
    }
}

fn generate_span_id() -> String {
    let full = Uuid::new_v4().to_string();
    full[..8].to_string()
}

pub fn inject_request_context(
    headers: &mut HeaderMap,
    request_id: &str,
    trace_id: &str,
    span_id: &str,
) {
    if let Ok(val) = HeaderValue::from_str(request_id) {
        headers.insert(HeaderName::from_static("x-request-id"), val);
    }
    if let Ok(val) = HeaderValue::from_str(trace_id) {
        headers.insert(HeaderName::from_static("x-trace-id"), val);
    }
    if let Ok(val) = HeaderValue::from_str(span_id) {
        headers.insert(HeaderName::from_static("x-span-id"), val);
    }
}

use axum::Router;

pub trait RequestContextExt {
    fn with_request_context(self) -> Self;
}

impl<S> RequestContextExt for Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    fn with_request_context(self) -> Self {
        self.layer(axum::middleware::from_fn(request_context_middleware))
    }
}

pub fn get_current_request_id() -> Option<String> {
    CURRENT_REQUEST_ID.with(|c| c.borrow().clone())
}

pub fn get_current_trace_id() -> Option<String> {
    let ctx = opentelemetry::Context::current();
    let span = ctx.span();
    let span_context = span.span_context();
    span_context
        .is_valid()
        .then(|| span_context.trace_id().to_string())
}

pub fn get_current_span_id() -> Option<String> {
    let ctx = opentelemetry::Context::current();
    let span = ctx.span();
    let span_context = span.span_context();
    span_context
        .is_valid()
        .then(|| span_context.span_id().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderMap, HeaderValue};

    #[test]
    fn test_generate_span_id_is_8_chars() {
        let id = generate_span_id();
        assert_eq!(id.len(), 8);
        assert!(id.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_generate_span_id_unique() {
        let a = generate_span_id();
        let b = generate_span_id();
        assert_ne!(a, b);
    }

    #[test]
    fn test_inject_request_context_sets_all_three_headers() {
        let mut headers = HeaderMap::new();
        inject_request_context(&mut headers, "req-1", "trace-1", "span-1");

        assert_eq!(
            headers.get("x-request-id").and_then(|v| v.to_str().ok()),
            Some("req-1")
        );
        assert_eq!(
            headers.get("x-trace-id").and_then(|v| v.to_str().ok()),
            Some("trace-1")
        );
        assert_eq!(
            headers.get("x-span-id").and_then(|v| v.to_str().ok()),
            Some("span-1")
        );
    }

    #[test]
    fn test_inject_request_context_overwrites_existing() {
        let mut headers = HeaderMap::new();
        headers.insert(
            HeaderName::from_static("x-request-id"),
            HeaderValue::from_static("old"),
        );
        inject_request_context(&mut headers, "new", "trace", "span");
        assert_eq!(
            headers.get("x-request-id").and_then(|v| v.to_str().ok()),
            Some("new")
        );
    }

    #[test]
    fn test_extract_or_generate_request_id_returns_existing() {
        let mut headers = HeaderMap::new();
        headers.insert(
            HeaderName::from_static("x-request-id"),
            HeaderValue::from_static("existing-id"),
        );
        let id = extract_or_generate_request_id(&headers);
        assert_eq!(id, "existing-id");
    }

    #[test]
    fn test_extract_or_generate_request_id_generates_uuid_when_missing() {
        let headers = HeaderMap::new();
        let id = extract_or_generate_request_id(&headers);
        assert_eq!(id.len(), 36);
        assert!(uuid::Uuid::parse_str(&id).is_ok());
    }

    #[test]
    fn test_request_context_construction() {
        let ctx = RequestContext {
            request_id: "abc".to_string(),
            trace_context: TraceContext {
                trace_id: Some("t1".to_string()),
                span_id: Some("s1".to_string()),
                parent_span_id: None,
            },
        };
        assert_eq!(ctx.request_id, "abc");
        assert_eq!(ctx.trace_context.trace_id.as_deref(), Some("t1"));
    }

    #[test]
    fn test_request_context_new_via_trace_context_new() {
        let tc = TraceContext::new();
        let ctx = RequestContext {
            request_id: generate_request_id(),
            trace_context: tc,
        };
        assert!(!ctx.request_id.is_empty());
        assert!(ctx.trace_context.trace_id.is_some());
        assert!(ctx.trace_context.span_id.is_some());
    }

    #[test]
    fn test_get_current_request_id_none_by_default() {
        assert!(get_current_request_id().is_none());
    }

    #[test]
    fn test_get_current_request_id_set_and_cleared_by_guard() {
        CURRENT_REQUEST_ID.with(|c| *c.borrow_mut() = Some("inside".to_string()));
        assert_eq!(get_current_request_id().as_deref(), Some("inside"));

        {
            let _guard = RequestIdGuard;
            assert_eq!(get_current_request_id().as_deref(), Some("inside"));
        }

        assert!(get_current_request_id().is_none());
    }

    #[test]
    fn test_get_current_trace_id_returns_none_without_otel_init() {
        assert!(get_current_trace_id().is_none());
    }

    #[test]
    fn test_get_current_span_id_returns_none_without_otel_init() {
        assert!(get_current_span_id().is_none());
    }

    #[test]
    fn test_extract_or_generate_trace_context_generates_new_when_no_headers() {
        let headers = HeaderMap::new();
        let ctx = extract_or_generate_trace_context(&headers);
        assert!(ctx.trace_id.is_some());
        assert!(ctx.span_id.is_some());
        assert!(ctx.parent_span_id.is_none());
    }

    #[test]
    fn test_extract_or_generate_trace_context_reads_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(
            HeaderName::from_static("x-trace-id"),
            HeaderValue::from_static("my-trace"),
        );
        headers.insert(
            HeaderName::from_static("x-span-id"),
            HeaderValue::from_static("my-span"),
        );
        headers.insert(
            HeaderName::from_static("x-parent-span-id"),
            HeaderValue::from_static("my-parent"),
        );
        let ctx = extract_or_generate_trace_context(&headers);
        assert_eq!(ctx.trace_id.as_deref(), Some("my-trace"));
        assert_eq!(ctx.span_id.as_deref(), Some("my-span"));
        assert_eq!(ctx.parent_span_id.as_deref(), Some("my-parent"));
    }

    #[test]
    fn test_extract_or_generate_trace_context_generates_span_when_trace_present_but_span_missing() {
        let mut headers = HeaderMap::new();
        headers.insert(
            HeaderName::from_static("x-trace-id"),
            HeaderValue::from_static("trace-only"),
        );
        let ctx = extract_or_generate_trace_context(&headers);
        assert_eq!(ctx.trace_id.as_deref(), Some("trace-only"));
        assert!(ctx.span_id.is_some());
        let span = ctx.span_id.unwrap();
        assert_eq!(span.len(), 8);
    }
}
