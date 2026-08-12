use axum::{
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub enabled: bool,
    pub requests: u32,
    pub window_secs: u64,
}

#[derive(Debug, Clone)]
struct RateLimitState {
    config: RateLimitConfig,
    counters: Arc<RwLock<HashMap<String, (u32, Instant)>>>,
}

pub struct RateLimitMiddleware {
    state: Arc<RateLimitState>,
}

impl RateLimitMiddleware {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            state: Arc::new(RateLimitState {
                config,
                counters: Arc::new(RwLock::new(HashMap::new())),
            }),
        }
    }

    pub fn into_middleware(self) -> Arc<Self> {
        Arc::new(self)
    }

    pub async fn middleware(
        self: Arc<Self>,
        req: Request<axum::body::Body>,
        next: Next,
    ) -> Response {
        if !self.state.config.enabled {
            return next.run(req).await;
        }

        let client_ip = get_client_ip(&req);

        let now = Instant::now();
        let window = Duration::from_secs(self.state.config.window_secs);

        let mut counters = self.state.counters.write().await;
        let entry = counters.entry(client_ip.clone()).or_insert((0, now));

        if now.duration_since(entry.1) >= window {
            *entry = (1, now);
        } else if entry.0 >= self.state.config.requests {
            let payload = topems_shared_core::ErrorPayload::new(429, "Too many requests")
                .with_error_code("RATE_LIMIT_EXCEEDED");
            return (StatusCode::TOO_MANY_REQUESTS, axum::Json(payload)).into_response();
        } else {
            entry.0 += 1;
        }

        drop(counters);
        next.run(req).await
    }
}

fn get_client_ip(req: &Request<axum::body::Body>) -> String {
    req.headers()
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .map(|s| {
            s.split(',')
                .next()
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| "unknown".to_string())
        })
        .or_else(|| {
            req.headers()
                .get("X-Real-IP")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "unknown".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderValue, Request};

    #[test]
    fn test_rate_limit_config() {
        let config = RateLimitConfig {
            enabled: true,
            requests: 10,
            window_secs: 60,
        };

        assert!(config.enabled);
        assert_eq!(config.requests, 10);
        assert_eq!(config.window_secs, 60);
    }

    #[test]
    fn test_client_ip_extraction() {
        let mut req = Request::get("/").body(axum::body::Body::empty()).unwrap();
        req.headers_mut().insert(
            "X-Forwarded-For",
            HeaderValue::from_static("192.168.1.1, 10.0.0.1"),
        );

        let ip = get_client_ip(&req);
        assert_eq!(ip, "192.168.1.1");
    }

    #[test]
    fn test_client_ip_fallback() {
        let req = Request::get("/").body(axum::body::Body::empty()).unwrap();

        let ip = get_client_ip(&req);
        assert_eq!(ip, "unknown");
    }
}
