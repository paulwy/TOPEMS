use axum::{
    body::Body,
    extract::{Request, State},
    http::{header, HeaderName, HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;
use topems_shared_auth::auth::Claims;

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitRule {
    pub requests: u32,
    pub window_secs: u64,
    #[serde(default)]
    pub priority: i32,
}

impl RateLimitRule {
    pub fn new(requests: u32, window_secs: u64) -> Self {
        Self {
            requests,
            window_secs,
            priority: 0,
        }
    }
}

/// 多维度限流配置（与前端 admin RateLimitConfigPage 契约对齐）。
/// 默认值保持与历史版本行为等价：user/ip 两维启用、各 500/60，tenant/global 关闭。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub enabled: bool,
    pub by_tenant: bool,
    pub by_user: bool,
    pub by_ip: bool,
    pub by_global: bool,
    pub tenant_default: RateLimitRule,
    pub user_default: RateLimitRule,
    pub ip_default: RateLimitRule,
    pub global_default: RateLimitRule,
    pub path_rules: HashMap<String, RateLimitRule>,
    pub skip_paths: Vec<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            by_tenant: false,
            by_user: true,
            by_ip: true,
            by_global: false,
            tenant_default: RateLimitRule::new(500, 60),
            user_default: RateLimitRule::new(500, 60),
            ip_default: RateLimitRule::new(500, 60),
            global_default: RateLimitRule::new(500, 60),
            path_rules: HashMap::new(),
            skip_paths: vec![
                "/".to_string(),
                "/health".to_string(),
                "/api".to_string(),
                "/api/core/info".to_string(),
                "/api/core/health".to_string(),
                "/metrics".to_string(),
            ],
            updated_at: None,
        }
    }
}

impl RateLimitConfig {
    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }

    /// 兼容历史 builder：设置 user/ip 两维默认规则（历史 default_rule 语义）
    pub fn with_default_rule(mut self, requests: u32, window_secs: u64) -> Self {
        self.user_default = RateLimitRule::new(requests, window_secs);
        self.ip_default = RateLimitRule::new(requests, window_secs);
        self
    }

    pub fn add_path_rule(mut self, path: &str, requests: u32, window_secs: u64) -> Self {
        self.path_rules
            .insert(path.to_string(), RateLimitRule::new(requests, window_secs));
        self
    }

    pub fn add_skip_path(mut self, path: &str) -> Self {
        self.skip_paths.push(path.to_string());
        self
    }

    pub fn with_by_user(mut self, by_user: bool) -> Self {
        self.by_user = by_user;
        self
    }

    /// 兼容历史 builder：等价 with_by_user
    pub fn with_by_user_id(mut self, by_user_id: bool) -> Self {
        self.by_user = by_user_id;
        self
    }

    pub fn with_by_ip(mut self, by_ip: bool) -> Self {
        self.by_ip = by_ip;
        self
    }

    pub fn with_by_tenant(mut self, by_tenant: bool) -> Self {
        self.by_tenant = by_tenant;
        self
    }

    pub fn with_by_global(mut self, by_global: bool) -> Self {
        self.by_global = by_global;
        self
    }
}

#[derive(Debug, Clone)]
struct TokenBucket {
    tokens: u32,
    max_tokens: u32,
    rate: f64,
    last_refill: Instant,
}

impl TokenBucket {
    fn new(max_tokens: u32, rate: f64) -> Self {
        Self {
            tokens: max_tokens,
            max_tokens,
            rate,
            last_refill: Instant::now(),
        }
    }

    fn try_acquire(&mut self) -> bool {
        self.refill();
        if self.tokens > 0 {
            self.tokens -= 1;
            true
        } else {
            false
        }
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss
    )]
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        let tokens_to_add = (elapsed * self.rate) as u32;

        if tokens_to_add > 0 {
            self.tokens = self.tokens.min(self.max_tokens);
            self.tokens = self
                .tokens
                .saturating_add(tokens_to_add)
                .min(self.max_tokens);
            self.last_refill = now;
        }
    }

    fn remaining(&self) -> u32 {
        let mut bucket = self.clone();
        bucket.refill();
        bucket.tokens
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss
    )]
    fn reset_seconds(&self) -> u64 {
        let tokens_needed = self.max_tokens.saturating_sub(self.tokens);
        if tokens_needed == 0 {
            0
        } else {
            ((tokens_needed as f64) / self.rate).ceil() as u64
        }
    }
}

#[derive(Debug, Clone)]
pub struct RateLimitStore {
    buckets: Arc<RwLock<HashMap<String, TokenBucket>>>,
}

impl Default for RateLimitStore {
    fn default() -> Self {
        Self::new()
    }
}

impl RateLimitStore {
    pub fn new() -> Self {
        Self {
            buckets: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    async fn check_and_acquire(
        &self,
        key: &str,
        requests: u32,
        window_secs: u64,
    ) -> (bool, u32, u64) {
        let mut buckets = self.buckets.write().await;

        let rate = requests as f64 / window_secs as f64;

        let bucket = buckets
            .entry(key.to_string())
            .or_insert_with(|| TokenBucket::new(requests, rate));

        let allowed = bucket.try_acquire();
        let remaining = bucket.remaining();
        let reset = bucket.reset_seconds();

        (allowed, remaining, reset)
    }
}

#[derive(Debug, Clone)]
pub struct RateLimitMiddleware {
    config: Arc<RwLock<RateLimitConfig>>,
    store: RateLimitStore,
}

impl RateLimitMiddleware {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config: Arc::new(RwLock::new(config)),
            store: RateLimitStore::new(),
        }
    }

    pub fn new_shared(config: Arc<RwLock<RateLimitConfig>>) -> Self {
        Self {
            config,
            store: RateLimitStore::new(),
        }
    }

    pub fn config_arc(&self) -> Arc<RwLock<RateLimitConfig>> {
        Arc::clone(&self.config)
    }

    pub async fn config(&self) -> RateLimitConfig {
        self.config.read().await.clone()
    }

    pub async fn update_config(&self, next: RateLimitConfig) {
        *self.config.write().await = next;
    }
}

fn extract_user_id(req: &Request) -> Option<String> {
    req.extensions()
        .get::<Claims>()
        .map(|claims| claims.sub.clone())
}

fn extract_tenant_id(req: &Request) -> Option<String> {
    req.extensions()
        .get::<Claims>()
        .and_then(|claims| claims.tenant_id.clone())
}

fn extract_client_ip(req: &Request) -> String {
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

fn build_rate_limit_key(config: &RateLimitConfig, req: &Request) -> String {
    let mut parts = Vec::new();

    if config.by_tenant {
        if let Some(tenant_id) = extract_tenant_id(req) {
            parts.push(format!("tenant:{}", tenant_id));
        }
    }

    if config.by_user {
        if let Some(user_id) = extract_user_id(req) {
            parts.push(format!("user:{}", user_id));
        }
    }

    if config.by_ip {
        let ip = extract_client_ip(req);
        parts.push(format!("ip:{}", ip));
    }

    if config.by_global || parts.is_empty() {
        parts.push("global".to_string());
    }

    parts.join("|")
}

/// 路径规则优先，否则按请求维度（key 中出现的维度）选择对应默认规则
fn get_rule_for_key<'a>(config: &'a RateLimitConfig, key: &str, path: &str) -> &'a RateLimitRule {
    for (pattern, rule) in &config.path_rules {
        if path.starts_with(pattern) {
            return rule;
        }
    }
    if key.contains("tenant:") {
        &config.tenant_default
    } else if key.contains("user:") {
        &config.user_default
    } else if key.contains("ip:") {
        &config.ip_default
    } else {
        &config.global_default
    }
}

fn should_skip(config: &RateLimitConfig, path: &str) -> bool {
    config.skip_paths.contains(&path.to_string())
}

fn add_rate_limit_headers(response: &mut Response, limit: u32, remaining: u32, reset: u64) {
    let headers = response.headers_mut();

    if let Ok(value) = HeaderValue::from_str(&limit.to_string()) {
        headers.insert(HeaderName::from_static("x-ratelimit-limit"), value);
    }

    if let Ok(value) = HeaderValue::from_str(&remaining.to_string()) {
        headers.insert(HeaderName::from_static("x-ratelimit-remaining"), value);
    }

    if let Ok(value) = HeaderValue::from_str(&reset.to_string()) {
        headers.insert(HeaderName::from_static("x-ratelimit-reset"), value);
    }
}

pub async fn rate_limit_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let middleware = &state.rate_limit_middleware;
    let config = middleware.config().await;

    if !config.enabled {
        return next.run(req).await;
    }

    let path = req.uri().path();

    if should_skip(&config, path) {
        return next.run(req).await;
    }

    let key = build_rate_limit_key(&config, &req);
    let rule = get_rule_for_key(&config, &key, path);

    let (allowed, remaining, reset) = middleware
        .store
        .check_and_acquire(&key, rule.requests, rule.window_secs)
        .await;

    if !allowed {
        tracing::warn!(
            "Rate limit exceeded: key={}, path={}, rule={}/{}s",
            key,
            path,
            rule.requests,
            rule.window_secs
        );

        let body =
            r#"{"success":false,"message":"请求过于频繁，请稍后重试","code":429,"data":null}"#
                .to_string();

        let mut response = (
            StatusCode::TOO_MANY_REQUESTS,
            [(header::CONTENT_TYPE, "application/json")],
            body,
        )
            .into_response();

        add_rate_limit_headers(&mut response, rule.requests, 0, reset);
        return response;
    }

    let mut response = next.run(req).await;
    add_rate_limit_headers(&mut response, rule.requests, remaining, reset);
    response
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use axum::http::{HeaderValue, Uri};

    fn create_test_request(
        path: &str,
        user_id: Option<&str>,
        client_ip: Option<&str>,
    ) -> Request<Body> {
        let mut req = Request::builder()
            .uri(Uri::try_from(path).expect("Invalid test URI"))
            .body(Body::empty())
            .expect("Failed to create test request");

        if let Some(ip) = client_ip {
            req.headers_mut().insert(
                "X-Forwarded-For",
                HeaderValue::from_str(ip).expect("Invalid IP header"),
            );
        }

        if let Some(id) = user_id {
            let claims = Claims {
                sub: id.to_string(),
                username: "test".to_string(),
                role: "user".to_string(),
                roles: vec![],
                permissions: vec![],
                is_superuser: false,
                exp: 9999999999,
                iat: 0,
                email: None,
                department: None,
                tenant_id: None,
                department_id: None,
                position_id: None,
                position_code: None,
                must_change_password: false,
            };
            req.extensions_mut().insert(claims);
        }

        req
    }

    #[test]
    fn test_rate_limit_config_default() {
        let config = RateLimitConfig::default();
        assert!(config.enabled);
        assert_eq!(config.user_default.requests, 500);
        assert_eq!(config.user_default.window_secs, 60);
        assert_eq!(config.ip_default.requests, 500);
        assert!(config.by_user);
        assert!(config.by_ip);
        assert!(!config.by_tenant);
        assert!(!config.by_global);
    }

    #[test]
    fn test_rate_limit_config_builders() {
        let config = RateLimitConfig::default()
            .with_enabled(false)
            .with_default_rule(100, 30)
            .add_path_rule("/api/core/iam", 50, 60)
            .add_skip_path("/api/test")
            .with_by_user_id(false)
            .with_by_tenant(true)
            .with_by_global(true);

        assert!(!config.enabled);
        assert_eq!(config.user_default.requests, 100);
        assert_eq!(config.ip_default.requests, 100);
        assert_eq!(
            config
                .path_rules
                .get("/api/core/iam")
                .expect("Path rule not found")
                .requests,
            50
        );
        assert!(config.skip_paths.contains(&"/api/test".to_string()));
        assert!(!config.by_user);
        assert!(config.by_tenant);
        assert!(config.by_global);
    }

    #[test]
    fn test_extract_user_id() {
        let req = create_test_request("/api/test", Some("user-123"), None);
        let user_id = extract_user_id(&req);
        assert_eq!(user_id, Some("user-123".to_string()));
    }

    #[test]
    fn test_extract_user_id_none() {
        let req = create_test_request("/api/test", None, None);
        let user_id = extract_user_id(&req);
        assert_eq!(user_id, None);
    }

    #[test]
    fn test_extract_client_ip() {
        let req = create_test_request("/api/test", None, Some("192.168.1.1, 10.0.0.1"));
        let ip = extract_client_ip(&req);
        assert_eq!(ip, "192.168.1.1");
    }

    #[test]
    fn test_extract_client_ip_fallback() {
        let req = create_test_request("/api/test", None, None);
        let ip = extract_client_ip(&req);
        assert_eq!(ip, "unknown");
    }

    #[test]
    fn test_build_rate_limit_key_user_and_ip() {
        let config = RateLimitConfig::default();
        let req = create_test_request("/api/test", Some("user-123"), Some("192.168.1.1"));
        let key = build_rate_limit_key(&config, &req);
        assert_eq!(key, "user:user-123|ip:192.168.1.1");
    }

    #[test]
    fn test_build_rate_limit_key_ip_only() {
        let config = RateLimitConfig::default().with_by_user_id(false);
        let req = create_test_request("/api/test", Some("user-123"), Some("192.168.1.1"));
        let key = build_rate_limit_key(&config, &req);
        assert_eq!(key, "ip:192.168.1.1");
    }

    #[test]
    fn test_build_rate_limit_key_global() {
        let config = RateLimitConfig::default()
            .with_by_user_id(false)
            .with_by_ip(false);
        let req = create_test_request("/api/test", None, None);
        let key = build_rate_limit_key(&config, &req);
        assert_eq!(key, "global");
    }

    #[test]
    fn test_get_rule_for_key_default() {
        let config = RateLimitConfig::default();
        let rule = get_rule_for_key(
            &config,
            "user:user-123|ip:192.168.1.1",
            "/api/core/iam/users",
        );
        assert_eq!(rule.requests, 500);
    }

    #[test]
    fn test_get_rule_for_key_path_priority() {
        let config = RateLimitConfig::default().add_path_rule("/api/core/iam", 100, 60);
        let rule = get_rule_for_key(
            &config,
            "user:user-123|ip:192.168.1.1",
            "/api/core/iam/users",
        );
        assert_eq!(rule.requests, 100);
    }

    #[test]
    fn test_get_rule_for_key_dimension_selection() {
        // 仅 user 维度 → user_default；仅 ip → ip_default；纯 global → global_default
        let config = RateLimitConfig::default()
            .with_default_rule(500, 60)
            .with_by_tenant(true);
        let rule = get_rule_for_key(&config, "tenant:t-1", "/api/test");
        assert_eq!(rule.requests, 500);

        let user_only = RateLimitConfig::default()
            .with_default_rule(100, 30)
            .with_by_ip(false);
        let rule = get_rule_for_key(&user_only, "user:u-1", "/api/test");
        assert_eq!(rule.requests, 100);

        let global_only = RateLimitConfig::default()
            .with_by_user(false)
            .with_by_ip(false);
        let rule = get_rule_for_key(&global_only, "global", "/api/test");
        assert_eq!(rule.requests, 500);
    }

    #[test]
    fn test_build_rate_limit_key_four_dimensions() {
        // tenant + user + ip + global 全开时按维度追加
        let config = RateLimitConfig::default()
            .with_by_tenant(true)
            .with_by_global(true);
        let req = create_test_request("/api/test", Some("user-123"), Some("192.168.1.1"));
        let key = build_rate_limit_key(&config, &req);
        assert_eq!(key, "user:user-123|ip:192.168.1.1|global");
    }

    #[test]
    fn test_should_skip() {
        let config = RateLimitConfig::default();
        assert!(should_skip(&config, "/health"));
        assert!(should_skip(&config, "/api/core/info"));
        assert!(!should_skip(&config, "/api/core/iam/users"));
    }

    #[tokio::test]
    async fn test_token_bucket_allow() {
        let store = RateLimitStore::new();

        for i in 0..5 {
            let (allowed, remaining, _) = store.check_and_acquire("test", 5, 60).await;
            assert!(allowed);
            assert_eq!(remaining, 4 - i);
        }
    }

    #[tokio::test]
    async fn test_token_bucket_deny() {
        let store = RateLimitStore::new();

        for _ in 0..5 {
            let _ = store.check_and_acquire("test", 5, 60).await;
        }

        let (allowed, remaining, _) = store.check_and_acquire("test", 5, 60).await;
        assert!(!allowed);
        assert_eq!(remaining, 0);
    }
}
