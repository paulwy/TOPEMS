use axum::{
    http::{Request, StatusCode, HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use chrono::Utc;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    pub enabled: bool,
    pub max_requests: u32,
    pub window_secs: u64,
    pub by_user_id: bool,
    pub by_ip: bool,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_requests: 100,
            window_secs: 60,
            by_user_id: true,
            by_ip: true,
        }
    }
}

impl RateLimitConfig {
    pub fn new(max_requests: u32, window_secs: u64) -> Self {
        Self {
            enabled: true,
            max_requests,
            window_secs,
            by_user_id: true,
            by_ip: true,
        }
    }

    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }

    pub fn with_by_user_id(mut self, by_user_id: bool) -> Self {
        self.by_user_id = by_user_id;
        self
    }

    pub fn with_by_ip(mut self, by_ip: bool) -> Self {
        self.by_ip = by_ip;
        self
    }
}

#[derive(Debug, Clone)]
struct RateLimitEntry {
    count: u32,
    window_start: Instant,
}

#[derive(Debug, Clone)]
pub struct RateLimitStore {
    inner: Arc<RwLock<HashMap<String, RateLimitEntry>>>,
}

impl RateLimitStore {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    async fn check_and_increment(&self, key: &str, max_requests: u32, window: Duration) -> (bool, u32, u64) {
        let mut store = self.inner.write().await;
        let now = Instant::now();

        let entry = store.entry(key.to_string()).or_insert_with(|| RateLimitEntry {
            count: 0,
            window_start: now,
        });

        if now.duration_since(entry.window_start) >= window {
            entry.count = 1;
            entry.window_start = now;
            let reset = window.as_secs();
            (true, max_requests - 1, reset)
        } else if entry.count >= max_requests {
            let remaining = window.as_secs() - now.duration_since(entry.window_start).as_secs();
            (false, 0, remaining)
        } else {
            entry.count += 1;
            let remaining = max_requests - entry.count;
            let reset = window.as_secs() - now.duration_since(entry.window_start).as_secs();
            (true, remaining, reset)
        }
    }
}

impl Default for RateLimitStore {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct RateLimitMiddleware {
    config: RateLimitConfig,
    store: RateLimitStore,
}

impl RateLimitMiddleware {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            store: RateLimitStore::new(),
        }
    }

    pub fn with_store(mut self, store: RateLimitStore) -> Self {
        self.store = store;
        self
    }

    pub fn config(&self) -> &RateLimitConfig {
        &self.config
    }

    pub fn store(&self) -> &RateLimitStore {
        &self.store
    }
}

fn extract_user_id<B>(req: &Request<B>) -> Option<String> {
    req.extensions()
        .get::<crate::auth::Claims>()
        .map(|claims| claims.sub.clone())
}

fn extract_client_ip<B>(req: &Request<B>) -> String {
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

fn build_rate_limit_key(config: &RateLimitConfig, req: &Request<axum::body::Body>) -> String {
    let mut parts = Vec::new();

    if config.by_user_id {
        if let Some(user_id) = extract_user_id(req) {
            parts.push(format!("user:{}", user_id));
        }
    }

    if config.by_ip {
        let ip = extract_client_ip(req);
        parts.push(format!("ip:{}", ip));
    }

    if parts.is_empty() {
        parts.push("global".to_string());
    }

    parts.join("|")
}

fn add_rate_limit_headers(response: &mut Response, limit: u32, remaining: u32, reset: u64) {
    let headers = response.headers_mut();

    if let Ok(value) = HeaderValue::from_str(&limit.to_string()) {
        headers.insert(
            HeaderName::from_static("x-ratelimit-limit"),
            value,
        );
    }

    if let Ok(value) = HeaderValue::from_str(&remaining.to_string()) {
        headers.insert(
            HeaderName::from_static("x-ratelimit-remaining"),
            value,
        );
    }

    if let Ok(value) = HeaderValue::from_str(&reset.to_string()) {
        headers.insert(
            HeaderName::from_static("x-ratelimit-reset"),
            value,
        );
    }
}

pub async fn rate_limit_middleware(
    middleware: Arc<RateLimitMiddleware>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Response {
    if !middleware.config.enabled {
        return next.run(req).await;
    }

    let key = build_rate_limit_key(&middleware.config, &req);
    let window = Duration::from_secs(middleware.config.window_secs);
    let max_requests = middleware.config.max_requests;

    let (allowed, remaining, reset) = middleware
        .store
        .check_and_increment(&key, max_requests, window)
        .await;

    if !allowed {
        let body = json!({
            "code": 429,
            "success": false,
            "message": "Too Many Requests",
            "data": null,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        })
        .to_string();

        let mut response = axum::response::Response::builder()
            .status(StatusCode::TOO_MANY_REQUESTS)
            .header("Content-Type", "application/json")
            .body(axum::body::Body::from(body))
            .unwrap();

        add_rate_limit_headers(&mut response, max_requests, 0, reset);
        return response;
    }

    let mut response = next.run(req).await;
    add_rate_limit_headers(&mut response, max_requests, remaining, reset);
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_config_default() {
        let config = RateLimitConfig::default();
        assert!(config.enabled);
        assert_eq!(config.max_requests, 100);
        assert_eq!(config.window_secs, 60);
        assert!(config.by_user_id);
        assert!(config.by_ip);
    }

    #[test]
    fn test_rate_limit_config_new() {
        let config = RateLimitConfig::new(50, 30);
        assert_eq!(config.max_requests, 50);
        assert_eq!(config.window_secs, 30);
    }

    #[test]
    fn test_rate_limit_config_builders() {
        let config = RateLimitConfig::default()
            .with_enabled(false)
            .with_by_user_id(false)
            .with_by_ip(false);

        assert!(!config.enabled);
        assert!(!config.by_user_id);
        assert!(!config.by_ip);
    }

    #[tokio::test]
    async fn test_rate_limit_store_allow() {
        let store = RateLimitStore::new();
        let window = Duration::from_secs(60);

        for i in 0..5 {
            let (allowed, remaining, _) = store.check_and_increment("test", 5, window).await;
            assert!(allowed);
            assert_eq!(remaining, 4 - i);
        }
    }

    #[tokio::test]
    async fn test_rate_limit_store_deny() {
        let store = RateLimitStore::new();
        let window = Duration::from_secs(60);

        for _ in 0..5 {
            let _ = store.check_and_increment("test", 5, window).await;
        }

        let (allowed, remaining, _) = store.check_and_increment("test", 5, window).await;
        assert!(!allowed);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_extract_client_ip_from_forwarded() {
        let mut req = Request::get("/").body(axum::body::Body::empty()).unwrap();
        req.headers_mut().insert(
            "X-Forwarded-For",
            HeaderValue::from_static("192.168.1.1, 10.0.0.1"),
        );

        let ip = extract_client_ip(&req);
        assert_eq!(ip, "192.168.1.1");
    }

    #[test]
    fn test_extract_client_ip_fallback() {
        let req = Request::get("/").body(axum::body::Body::empty()).unwrap();
        let ip = extract_client_ip(&req);
        assert_eq!(ip, "unknown");
    }
}
