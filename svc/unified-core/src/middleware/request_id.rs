use axum::{
    http::{HeaderName, HeaderValue, Request},
    response::Response,
};
use topems_shared_core::logging::generate_request_id;

pub const X_REQUEST_ID: &str = "x-request-id";

pub async fn request_id_middleware(
    mut request: Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> Response {
    let request_id = request
        .headers()
        .get(X_REQUEST_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_request_id);

    request
        .extensions_mut()
        .insert(RequestId(request_id.clone()));

    let mut response = next.run(request).await;

    if let Ok(header_value) = request_id.parse::<HeaderValue>() {
        response
            .headers_mut()
            .insert(HeaderName::from_static(X_REQUEST_ID), header_value);
    }

    response
}

#[derive(Debug, Clone)]
pub struct RequestId(pub String);
