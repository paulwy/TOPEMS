//! 增强版 API 限流中间件
//!
//! 提供多维度限流能力：
//! - 基于租户（tenant_id）
//! - 基于客户端 IP
//! - 基于用户（user_id）
//!
//! 同时支持：
//! - 路径级自定义限流规则
//! - 防重放保护（基于时间戳 + nonce）

use axum::{
    body::Body,
    extract::Request,
    http::{header, HeaderName, HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

/// 默认时间戳容差（秒）：客户端与服务端时间偏差
pub const DEFAULT_REPLAY_TOLERANCE_SECS: u64 = 300;

/// 默认 nonce 缓存有效期（秒）
pub const DEFAULT_NONCE_CACHE_SECS: u64 = 600;

/// 限流维度
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum LimitDimension {
    Tenant,
    User,
    Ip,
    Global,
}

impl LimitDimension {
    pub fn as_str(&self) -> &'static str {
        match self {
            LimitDimension::Tenant => "tenant",
            LimitDimension::User => "user",
            LimitDimension::Ip => "ip",
            LimitDimension::Global => "global",
        }
    }
}

/// 单条限流规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedRateLimitRule {
    pub requests: u32,
    pub window_secs: u64,
    /// 优先级，数值越大优先级越高；相同优先级时按租户 -> 用户 -> IP 顺序匹配
    pub priority: i32,
}

impl EnhancedRateLimitRule {
    pub fn new(requests: u32, window_secs: u64) -> Self {
        Self {
            requests,
            window_secs,
            priority: 0,
        }
    }

    pub fn with_priority(mut self, priority: i32) -> Self {
        self.priority = priority;
        self
    }
}

/// 多维度限流配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedRateLimitConfig {
    /// 全局开关
    pub enabled: bool,
    /// 默认租户级限流规则
    pub tenant_default: EnhancedRateLimitRule,
    /// 默认用户级限流规则
    pub user_default: EnhancedRateLimitRule,
    /// 默认 IP 级限流规则
    pub ip_default: EnhancedRateLimitRule,
    /// 全局限流规则（兜底）
    pub global_default: EnhancedRateLimitRule,
    /// 路径级自定义规则，键为路径前缀
    pub path_rules: Vec<(String, EnhancedRateLimitRule)>,
    /// 跳过的路径
    pub skip_paths: Vec<String>,
    /// 是否启用租户维度
    pub by_tenant: bool,
    /// 是否启用用户维度
    pub by_user: bool,
    /// 是否启用 IP 维度
    pub by_ip: bool,
    /// 是否启用全局维度
    pub by_global: bool,
    /// 防重放配置
    pub anti_replay: AntiReplayConfig,
}

impl Default for EnhancedRateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            tenant_default: EnhancedRateLimitRule::new(2_000, 60),
            user_default: EnhancedRateLimitRule::new(500, 60),
            ip_default: EnhancedRateLimitRule::new(1_000, 60),
            global_default: EnhancedRateLimitRule::new(50_000, 60),
            path_rules: Vec::new(),
            skip_paths: vec![
                "/".to_string(),
                "/health".to_string(),
                "/api".to_string(),
                "/api/info".to_string(),
                "/api/v1/core/iam/auth/login".to_string(),
                "/api/v1/core/iam/auth/register".to_string(),
                "/api/v1/core/iam/auth/refresh".to_string(),
                "/metrics".to_string(),
            ],
            by_tenant: true,
            by_user: true,
            by_ip: true,
            by_global: true,
            anti_replay: AntiReplayConfig::default(),
        }
    }
}

/// 防重放配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntiReplayConfig {
    /// 是否启用
    pub enabled: bool,
    /// 时间戳容差（秒）
    pub tolerance_secs: u64,
    /// nonce 缓存保留时间（秒）
    pub nonce_cache_secs: u64,
    /// 自定义时间戳 Header 名称
    pub timestamp_header: String,
    /// 自定义 nonce Header 名称
    pub nonce_header: String,
    /// 强制要求防重放的路径前缀列表（为空表示所有非跳过路径都启用）
    pub enforce_paths: Vec<String>,
}

impl Default for AntiReplayConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            tolerance_secs: DEFAULT_REPLAY_TOLERANCE_SECS,
            nonce_cache_secs: DEFAULT_NONCE_CACHE_SECS,
            timestamp_header: "X-Request-Timestamp".to_string(),
            nonce_header: "X-Request-Nonce".to_string(),
            enforce_paths: Vec::new(),
        }
    }
}

/// 令牌桶
#[derive(Debug, Clone)]
struct TokenBucket {
    tokens: f64,
    max_tokens: f64,
    rate: f64,
    last_refill: Instant,
}

impl TokenBucket {
    fn new(max_tokens: u32, window_secs: u64) -> Self {
        let max = max_tokens as f64;
        let rate = max / window_secs.max(1) as f64;
        Self {
            tokens: max,
            max_tokens: max,
            rate,
            last_refill: Instant::now(),
        }
    }

    fn try_acquire(&mut self) -> bool {
        self.refill();
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        if elapsed <= 0.0 {
            return;
        }
        let tokens_to_add = elapsed * self.rate;
        self.tokens = (self.tokens + tokens_to_add).min(self.max_tokens);
        self.last_refill = now;
    }

    fn remaining(&self) -> u32 {
        self.tokens.floor() as u32
    }

    fn reset_seconds(&self, window_secs: u64) -> u64 {
        let needed = (1.0 - self.tokens).max(0.0);
        if self.rate <= 0.0 {
            return window_secs;
        }
        (needed / self.rate).ceil() as u64
    }
}

/// 限流决策
#[derive(Debug, Clone)]
pub struct RateLimitDecision {
    pub allowed: bool,
    pub dimension: LimitDimension,
    pub limit: u32,
    pub remaining: u32,
    pub reset_secs: u64,
    pub reason: Option<String>,
}

/// 增强版限流存储
#[derive(Debug, Clone)]
pub struct EnhancedRateLimitStore {
    buckets: Arc<DashMap<String, TokenBucket>>,
    /// nonce 缓存：nonce -> 过期时刻
    nonces: Arc<DashMap<String, Instant>>,
}

impl EnhancedRateLimitStore {
    pub fn new() -> Self {
        Self {
            buckets: Arc::new(DashMap::new()),
            nonces: Arc::new(DashMap::new()),
        }
    }

    /// 检查并消费令牌
    pub fn check_and_acquire(
        &self,
        key: &str,
        dimension: LimitDimension,
        rule: &EnhancedRateLimitRule,
    ) -> RateLimitDecision {
        let bucket = self
            .buckets
            .entry(key.to_string())
            .or_insert_with(|| TokenBucket::new(rule.requests, rule.window_secs));

        let mut bucket_ref = bucket;
        let allowed = bucket_ref.try_acquire();
        let remaining = bucket_ref.remaining();
        let reset = bucket_ref.reset_seconds(rule.window_secs);

        RateLimitDecision {
            allowed,
            dimension,
            limit: rule.requests,
            remaining,
            reset_secs: reset,
            reason: if !allowed {
                Some(format!("rate limit exceeded for {}", dimension.as_str()))
            } else {
                None
            },
        }
    }

    /// 记录 nonce 并判断是否重放
    pub fn check_and_record_nonce(&self, nonce: &str, ttl_secs: u64) -> bool {
        let now = Instant::now();
        // 清理过期 nonce
        self.nonces
            .retain(|_, expire_at| now.duration_since(*expire_at).as_secs() < ttl_secs);
        if self.nonces.contains_key(nonce) {
            return false;
        }
        self.nonces
            .insert(nonce.to_string(), now + Duration::from_secs(ttl_secs));
        true
    }

    /// 清理过期数据（由外部周期性调用）
    pub fn cleanup(&self, nonce_ttl_secs: u64) {
        let now = Instant::now();
        self.nonces
            .retain(|_, expire_at| now.duration_since(*expire_at).as_secs() < nonce_ttl_secs);
    }
}

/// 增强版限流中间件
#[derive(Clone)]
pub struct EnhancedRateLimitMiddleware {
    config: Arc<EnhancedRateLimitConfig>,
    store: Arc<EnhancedRateLimitStore>,
}

impl EnhancedRateLimitMiddleware {
    pub fn new(config: EnhancedRateLimitConfig) -> Self {
        Self {
            config: Arc::new(config),
            store: Arc::new(EnhancedRateLimitStore::new()),
        }
    }

    pub fn config(&self) -> &EnhancedRateLimitConfig {
        &self.config
    }

    pub fn store(&self) -> Arc<EnhancedRateLimitStore> {
        self.store.clone()
    }
}

fn get_request_path(req: &Request<Body>) -> String {
    req.uri().path().to_string()
}

fn should_skip(config: &EnhancedRateLimitConfig, path: &str) -> bool {
    config.skip_paths.iter().any(|p| p == path)
}

fn extract_tenant_id(req: &Request<Body>) -> Option<String> {
    if let Some(value) = req
        .headers()
        .get("X-Tenant-ID")
        .and_then(|h| h.to_str().ok())
    {
        return Some(value.to_string());
    }
    if let Some(value) = req
        .headers()
        .get("X-Tenant-Id")
        .and_then(|h| h.to_str().ok())
    {
        return Some(value.to_string());
    }
    req.extensions()
        .get::<crate::auth::Claims>()
        .and_then(|c| c.tenant_id.clone())
}

fn extract_user_id(req: &Request<Body>) -> Option<String> {
    req.extensions()
        .get::<crate::auth::Claims>()
        .map(|c| c.sub.clone())
}

fn extract_client_ip(req: &Request<Body>) -> String {
    req.headers()
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next().map(|s| s.trim().to_string()))
        .or_else(|| {
            req.headers()
                .get("X-Real-IP")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "unknown".to_string())
}

/// 为路径解析规则
fn resolve_rule<'a>(
    config: &'a EnhancedRateLimitConfig,
    path: &str,
) -> Option<&'a EnhancedRateLimitRule> {
    let mut best: Option<&'a EnhancedRateLimitRule> = None;
    let mut best_priority = i32::MIN;
    for (prefix, rule) in &config.path_rules {
        if path.starts_with(prefix) && rule.priority >= best_priority {
            best = Some(rule);
            best_priority = rule.priority;
        }
    }
    best
}

/// 校验时间戳
fn validate_timestamp(value: &str, tolerance_secs: u64) -> Result<(), String> {
    let ts: i64 = value.parse().map_err(|_| "invalid timestamp".to_string())?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let diff = (now - ts).unsigned_abs();
    if diff > tolerance_secs {
        return Err(format!("timestamp out of tolerance: {}s", diff));
    }
    Ok(())
}

/// 写入限流响应头
fn add_rate_limit_headers(response: &mut Response, decision: &RateLimitDecision) {
    let headers = response.headers_mut();
    if let Ok(v) = HeaderValue::from_str(&decision.limit.to_string()) {
        headers.insert(HeaderName::from_static("x-ratelimit-limit"), v);
    }
    if let Ok(v) = HeaderValue::from_str(&decision.remaining.to_string()) {
        headers.insert(HeaderName::from_static("x-ratelimit-remaining"), v);
    }
    if let Ok(v) = HeaderValue::from_str(&decision.reset_secs.to_string()) {
        headers.insert(HeaderName::from_static("x-ratelimit-reset"), v);
    }
}

fn too_many_request_response(decision: &RateLimitDecision) -> Response {
    let body = serde_json::json!({
        "success": false,
        "message": "请求过于频繁，请稍后重试",
        "code": 429,
        "data": {
            "dimension": decision.dimension.as_str(),
            "limit": decision.limit,
            "reset_secs": decision.reset_secs,
            "reason": decision.reason,
        }
    })
    .to_string();

    let mut response = (
        StatusCode::TOO_MANY_REQUESTS,
        [(header::CONTENT_TYPE, "application/json")],
        body,
    )
        .into_response();

    add_rate_limit_headers(&mut response, decision);
    response
}

/// 增强版限流中间件函数
///
/// 使用方式：
/// ```ignore
/// use topems_shared::middleware::rate_limit_enhanced::enhanced_rate_limit_middleware;
///
/// let middleware = EnhancedRateLimitMiddleware::new(EnhancedRateLimitConfig::default());
/// let layer = axum::middleware::from_fn_with_state(middleware, enhanced_rate_limit_middleware);
/// ```
pub async fn enhanced_rate_limit_middleware(
    axum::extract::State(middleware): axum::extract::State<EnhancedRateLimitMiddleware>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let config = middleware.config();
    if !config.enabled {
        return next.run(req).await;
    }

    let path = get_request_path(&req);
    if should_skip(config, &path) {
        return next.run(req).await;
    }

    // 防重放校验
    if config.anti_replay.enabled {
        let enforce = if config.anti_replay.enforce_paths.is_empty() {
            true
        } else {
            config
                .anti_replay
                .enforce_paths
                .iter()
                .any(|p| path.starts_with(p))
        };
        if enforce {
            let timestamp = req
                .headers()
                .get(&config.anti_replay.timestamp_header)
                .and_then(|h| h.to_str().ok());
            let nonce = req
                .headers()
                .get(&config.anti_replay.nonce_header)
                .and_then(|h| h.to_str().ok());

            match (timestamp, nonce) {
                (Some(ts), Some(nc)) => {
                    if let Err(msg) = validate_timestamp(ts, config.anti_replay.tolerance_secs) {
                        return (
                            StatusCode::BAD_REQUEST,
                            [(header::CONTENT_TYPE, "application/json")],
                            format!(
                                r#"{{"success":false,"message":"防重放校验失败: {}","code":400}}"#,
                                msg
                            ),
                        )
                            .into_response();
                    }
                    if !middleware
                        .store()
                        .check_and_record_nonce(nc, config.anti_replay.nonce_cache_secs)
                    {
                        return (
                            StatusCode::BAD_REQUEST,
                            [(header::CONTENT_TYPE, "application/json")],
                            r#"{"success":false,"message":"防重放校验失败: nonce 已使用","code":400}"#,
                        )
                            .into_response();
                    }
                }
                _ => {
                    return (
                        StatusCode::BAD_REQUEST,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"防重放校验失败: 缺少时间戳或 nonce","code":400}"#,
                    )
                        .into_response();
                }
            }
        }
    }

    let path_rule = resolve_rule(config, &path);
    let tenant_id = if config.by_tenant {
        extract_tenant_id(&req)
    } else {
        None
    };
    let user_id = if config.by_user {
        extract_user_id(&req)
    } else {
        None
    };
    let client_ip = if config.by_ip {
        Some(extract_client_ip(&req))
    } else {
        None
    };

    let mut decisions: Vec<RateLimitDecision> = Vec::new();

    if let Some(tid) = &tenant_id {
        let rule = path_rule.unwrap_or(&config.tenant_default);
        let key = format!("tenant:{}", tid);
        decisions.push(
            middleware
                .store()
                .check_and_acquire(&key, LimitDimension::Tenant, rule),
        );
    }

    if let Some(uid) = &user_id {
        let rule = path_rule.unwrap_or(&config.user_default);
        let key = format!("user:{}", uid);
        decisions.push(
            middleware
                .store()
                .check_and_acquire(&key, LimitDimension::User, rule),
        );
    }

    if let Some(ip) = &client_ip {
        let rule = path_rule.unwrap_or(&config.ip_default);
        let key = format!("ip:{}", ip);
        decisions.push(
            middleware
                .store()
                .check_and_acquire(&key, LimitDimension::Ip, rule),
        );
    }

    if config.by_global && decisions.is_empty() {
        let rule = path_rule.unwrap_or(&config.global_default);
        let key = format!(
            "global:{}",
            path_rule
                .map(|r| r.requests.to_string())
                .unwrap_or_else(|| "default".to_string())
        );
        decisions.push(
            middleware
                .store()
                .check_and_acquire(&key, LimitDimension::Global, rule),
        );
    }

    if let Some(denied) = decisions.iter().find(|d| !d.allowed) {
        tracing::warn!(
            "Enhanced rate limit exceeded: dimension={}, limit={}, key_path={}",
            denied.dimension.as_str(),
            denied.limit,
            path
        );
        return too_many_request_response(denied);
    }

    let mut response = next.run(req).await;
    if let Some(decision) = decisions.iter().find(|d| d.allowed) {
        add_rate_limit_headers(&mut response, decision);
    }
    response
}

/// 解析 nonce 校验辅助函数
pub fn generate_nonce() -> String {
    Uuid::new_v4().simple().to_string()
}

/// 解析当前时间戳辅助函数
pub fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderValue, Uri};

    fn make_request(
        path: &str,
        tenant: Option<&str>,
        user: Option<&str>,
        ip: Option<&str>,
    ) -> Request<Body> {
        let mut req = Request::builder()
            .uri(Uri::try_from(path).expect("invalid uri"))
            .body(Body::empty())
            .expect("failed to build request");
        if let Some(t) = tenant {
            req.headers_mut().insert(
                "X-Tenant-ID",
                HeaderValue::from_str(t).expect("invalid header"),
            );
        }
        if let Some(i) = ip {
            req.headers_mut().insert(
                "X-Forwarded-For",
                HeaderValue::from_str(i).expect("invalid header"),
            );
        }
        if let Some(_u) = user {
            let claims = crate::auth::Claims {
                sub: _u.to_string(),
                username: "tester".to_string(),
                role: "user".to_string(),
                roles: vec![],
                permissions: vec![],
                is_superuser: false,
                exp: 9999999999,
                iat: 0,
                email: None,
                department: None,
                tenant_id: tenant.map(|s| s.to_string()),
                department_id: None,
                position_id: None,
                position_code: None,
            };
            req.extensions_mut().insert(claims);
        }
        req
    }

    #[test]
    fn test_token_bucket_allows_then_denies() {
        let bucket = TokenBucket::new(3, 60);
        let mut b = bucket.clone();
        assert!(b.try_acquire());
        assert!(b.try_acquire());
        assert!(b.try_acquire());
        assert!(!b.try_acquire());
    }

    #[test]
    fn test_rate_limit_decision_different_dimensions() {
        let store = EnhancedRateLimitStore::new();
        let rule = EnhancedRateLimitRule::new(2, 60);
        let d1 = store.check_and_acquire("tenant:t1", LimitDimension::Tenant, &rule);
        let d2 = store.check_and_acquire("tenant:t1", LimitDimension::Tenant, &rule);
        let d3 = store.check_and_acquire("tenant:t1", LimitDimension::Tenant, &rule);
        assert!(d1.allowed);
        assert!(d2.allowed);
        assert!(!d3.allowed);
    }

    #[test]
    fn test_nonce_replay_detection() {
        let store = EnhancedRateLimitStore::new();
        assert!(store.check_and_record_nonce("abc", 60));
        assert!(!store.check_and_record_nonce("abc", 60));
    }

    #[test]
    fn test_extract_client_ip_with_xff() {
        let req = make_request("/api/test", None, None, Some("10.0.0.1, 10.0.0.2"));
        assert_eq!(extract_client_ip(&req), "10.0.0.1");
    }

    #[test]
    fn test_extract_client_ip_unknown() {
        let req = make_request("/api/test", None, None, None);
        assert_eq!(extract_client_ip(&req), "unknown");
    }

    #[test]
    fn test_extract_tenant_id_from_header() {
        let req = make_request("/api/test", Some("tenant-1"), None, None);
        assert_eq!(extract_tenant_id(&req), Some("tenant-1".to_string()));
    }

    #[test]
    fn test_extract_user_id_from_claims() {
        let req = make_request("/api/test", None, Some("user-7"), None);
        assert_eq!(extract_user_id(&req), Some("user-7".to_string()));
    }

    #[test]
    fn test_should_skip() {
        let config = EnhancedRateLimitConfig::default();
        assert!(should_skip(&config, "/health"));
        assert!(!should_skip(&config, "/api/core/iam/users"));
    }

    #[test]
    fn test_resolve_rule() {
        let mut config = EnhancedRateLimitConfig::default();
        config.path_rules.push((
            "/api/core/iam".to_string(),
            EnhancedRateLimitRule::new(10, 60).with_priority(5),
        ));
        let rule = resolve_rule(&config, "/api/core/iam/users");
        assert!(rule.is_some());
        assert_eq!(rule.expect("rule").requests, 10);
    }

    #[test]
    fn test_validate_timestamp_recent() {
        let ts = current_timestamp().to_string();
        assert!(validate_timestamp(&ts, 60).is_ok());
    }

    #[test]
    fn test_validate_timestamp_old() {
        let ts = (current_timestamp() - 3600).to_string();
        assert!(validate_timestamp(&ts, 60).is_err());
    }

    #[test]
    fn test_generate_nonce_uniqueness() {
        let a = generate_nonce();
        let b = generate_nonce();
        assert_ne!(a, b);
        assert!(!a.is_empty());
    }

    #[test]
    fn test_config_defaults() {
        let config = EnhancedRateLimitConfig::default();
        assert!(config.enabled);
        assert!(config.by_tenant);
        assert!(config.by_user);
        assert!(config.by_ip);
        assert!(!config.anti_replay.enabled);
    }
}
