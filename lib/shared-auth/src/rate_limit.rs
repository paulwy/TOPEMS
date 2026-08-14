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

    // ===== X-Real-IP 回退 =====
    #[test]
    fn test_client_ip_x_real_ip_fallback() {
        let mut req = Request::get("/").body(axum::body::Body::empty()).unwrap();
        req.headers_mut().insert(
            "X-Real-IP",
            HeaderValue::from_static("10.0.0.42"),
        );
        let ip = get_client_ip(&req);
        assert_eq!(ip, "10.0.0.42");
    }

    // ===== X-Forwarded-For 优先于 X-Real-IP =====
    #[test]
    fn test_client_ip_xff_takes_precedence_over_x_real_ip() {
        let mut req = Request::get("/").body(axum::body::Body::empty()).unwrap();
        req.headers_mut().insert(
            "X-Forwarded-For",
            HeaderValue::from_static("1.2.3.4"),
        );
        req.headers_mut().insert(
            "X-Real-IP",
            HeaderValue::from_static("5.6.7.8"),
        );
        let ip = get_client_ip(&req);
        assert_eq!(ip, "1.2.3.4");
    }

    // ===== RateLimitConfig Clone =====
    #[test]
    fn test_rate_limit_config_clone() {
        let config = RateLimitConfig {
            enabled: true,
            requests: 100,
            window_secs: 30,
        };
        let cloned = config.clone();
        assert_eq!(config.enabled, cloned.enabled);
        assert_eq!(config.requests, cloned.requests);
        assert_eq!(config.window_secs, cloned.window_secs);
    }

    // ===== RateLimitMiddleware::new =====
    #[test]
    fn test_rate_limit_middleware_new() {
        let config = RateLimitConfig {
            enabled: true,
            requests: 5,
            window_secs: 10,
        };
        let mw = RateLimitMiddleware::new(config);
        // 内部状态不可直接访问，验证不 panic 即可
        let _arc = mw.into_middleware();
    }

    // ===== into_middleware 返回 Arc =====
    #[test]
    fn test_into_middleware_returns_arc() {
        let config = RateLimitConfig {
            enabled: false,
            requests: 1,
            window_secs: 1,
        };
        let mw = RateLimitMiddleware::new(config);
        let arc1 = mw.into_middleware();
        let arc2 = arc1.clone();
        assert!(std::sync::Arc::strong_count(&arc1) >= 2);
        assert!(std::sync::Arc::strong_count(&arc2) >= 2);
    }

    // ===== middleware: 禁用时放行 =====
    #[tokio::test]
    async fn test_middleware_disabled_passes_through() {
        use axum::{routing::get, Router};
        use tower::ServiceExt;

        let config = RateLimitConfig {
            enabled: false,
            requests: 1,
            window_secs: 60,
        };
        let mw = std::sync::Arc::new(RateLimitMiddleware::new(config));

        let app = Router::new()
            .route("/test", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn({
                let mw = mw.clone();
                move |req, next| {
                    let mw = mw.clone();
                    async move { RateLimitMiddleware::middleware(mw, req, next).await }
                }
            }));

        // 禁用时应始终放行，即使多次请求
        for _ in 0..10 {
            let req = Request::get("/test").body(axum::body::Body::empty()).unwrap();
            let resp = app.clone().oneshot(req).await.expect("infallible");
            assert_eq!(resp.status(), axum::http::StatusCode::OK);
        }
    }

    // ===== middleware: 启用后在限流内放行 =====
    #[tokio::test]
    async fn test_middleware_enabled_allows_under_limit() {
        use axum::{routing::get, Router};
        use tower::ServiceExt;

        let config = RateLimitConfig {
            enabled: true,
            requests: 3,
            window_secs: 60,
        };
        let mw = std::sync::Arc::new(RateLimitMiddleware::new(config));

        let app = Router::new()
            .route("/test", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn({
                let mw = mw.clone();
                move |req, next| {
                    let mw = mw.clone();
                    async move { RateLimitMiddleware::middleware(mw, req, next).await }
                }
            }));

        // 同一 IP 发送 3 次请求应全部通过
        for i in 0..3 {
            let mut req = Request::get("/test").body(axum::body::Body::empty()).unwrap();
            req.headers_mut().insert(
                "X-Forwarded-For",
                HeaderValue::from_static("1.1.1.1"),
            );
            let resp = app.clone().oneshot(req).await.expect("infallible");
            assert_eq!(
                resp.status(),
                axum::http::StatusCode::OK,
                "request {} should pass",
                i
            );
        }
    }

    // ===== middleware: 超过限流返回 429 =====
    #[tokio::test]
    async fn test_middleware_enabled_blocks_over_limit() {
        use axum::{routing::get, Router};
        use tower::ServiceExt;

        let config = RateLimitConfig {
            enabled: true,
            requests: 2,
            window_secs: 60,
        };
        let mw = std::sync::Arc::new(RateLimitMiddleware::new(config));

        let app = Router::new()
            .route("/test", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn({
                let mw = mw.clone();
                move |req, next| {
                    let mw = mw.clone();
                    async move { RateLimitMiddleware::middleware(mw, req, next).await }
                }
            }));

        // 前 2 次通过
        for _ in 0..2 {
            let mut req = Request::get("/test").body(axum::body::Body::empty()).unwrap();
            req.headers_mut().insert(
                "X-Forwarded-For",
                HeaderValue::from_static("2.2.2.2"),
            );
            let resp = app.clone().oneshot(req).await.expect("infallible");
            assert_eq!(resp.status(), axum::http::StatusCode::OK);
        }

        // 第 3 次应被限流
        let mut req = Request::get("/test").body(axum::body::Body::empty()).unwrap();
        req.headers_mut().insert(
            "X-Forwarded-For",
            HeaderValue::from_static("2.2.2.2"),
        );
        let resp = app.clone().oneshot(req).await.expect("infallible");
        assert_eq!(resp.status(), axum::http::StatusCode::TOO_MANY_REQUESTS);
    }

    // ===== middleware: 不同 IP 独立计数 =====
    #[tokio::test]
    async fn test_middleware_different_ips_independent_counters() {
        use axum::{routing::get, Router};
        use tower::ServiceExt;

        let config = RateLimitConfig {
            enabled: true,
            requests: 1,
            window_secs: 60,
        };
        let mw = std::sync::Arc::new(RateLimitMiddleware::new(config));

        let app = Router::new()
            .route("/test", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn({
                let mw = mw.clone();
                move |req, next| {
                    let mw = mw.clone();
                    async move { RateLimitMiddleware::middleware(mw, req, next).await }
                }
            }));

        // IP A 用尽配额
        let mut req_a = Request::get("/test").body(axum::body::Body::empty()).unwrap();
        req_a.headers_mut().insert(
            "X-Forwarded-For",
            HeaderValue::from_static("3.3.3.3"),
        );
        let resp = app.clone().oneshot(req_a).await.expect("infallible");
        assert_eq!(resp.status(), axum::http::StatusCode::OK);

        // IP B 仍有配额
        let mut req_b = Request::get("/test").body(axum::body::Body::empty()).unwrap();
        req_b.headers_mut().insert(
            "X-Forwarded-For",
            HeaderValue::from_static("4.4.4.4"),
        );
        let resp = app.clone().oneshot(req_b).await.expect("infallible");
        assert_eq!(resp.status(), axum::http::StatusCode::OK);
    }
}
