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
        response.headers_mut().insert(
            HeaderName::from_static("x-request-id"),
            val,
        );
    }

    if let Some(trace_id) = &trace_context.trace_id {
        if let Ok(val) = HeaderValue::from_str(trace_id) {
            response.headers_mut().insert(
                HeaderName::from_static("x-trace-id"),
                val,
            );
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
