//! Rate Limiting Middleware
//! 
//! Implements Token Bucket algorithm for API rate limiting.

use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use std::collections::HashMap;

/// Token Bucket rate limiter
#[derive(Debug, Clone)]
pub struct RateLimiter {
    /// Maximum number of tokens (requests) in the bucket
    capacity: u64,
    /// Number of tokens added per second
    refill_rate: u64,
    /// Last refill timestamp
    last_refill: Instant,
    /// Current tokens available
    tokens: f64,
}

impl RateLimiter {
    pub fn new(capacity: u64, refill_rate: u64) -> Self {
        Self {
            capacity,
            refill_rate,
            last_refill: Instant::now(),
            tokens: capacity as f64,
        }
    }

    /// Try to acquire a token, returns true if allowed
    pub fn try_acquire(&mut self) -> bool {
        self.refill();
        
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let elapsed = self.last_refill.elapsed().as_secs_f64();
        let tokens_to_add = elapsed * self.refill_rate as f64;
        
        self.tokens = (self.tokens + tokens_to_add).min(self.capacity as f64);
        self.last_refill = Instant::now();
    }

    /// Get remaining tokens
    pub fn remaining(&self) -> f64 {
        self.tokens
    }

    /// Get time until next token is available
    pub fn time_until_next(&self) -> Duration {
        if self.tokens >= 1.0 {
            Duration::from_secs(0)
        } else {
            let tokens_needed = 1.0 - self.tokens;
            let seconds = tokens_needed / self.refill_rate as f64;
            Duration::from_secs_f64(seconds)
        }
    }
}

/// Rate limit configuration per endpoint or client
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Requests per minute
    pub rpm: u64,
    /// Requests per hour
    pub rph: u64,
    /// Burst size (max concurrent requests)
    pub burst: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            rpm: 60,
            rph: 1000,
            burst: 10,
        }
    }
}

impl RateLimitConfig {
    pub fn new(rpm: u64, rph: u64, burst: u64) -> Self {
        Self { rpm, rph, burst }
    }

    pub fn strict() -> Self {
        Self {
            rpm: 10,
            rph: 100,
            burst: 5,
        }
    }

    pub fn relaxed() -> Self {
        Self {
            rpm: 300,
            rph: 10000,
            burst: 50,
        }
    }
}

/// Rate limiter manager for multiple clients/endpoints
#[derive(Debug)]
pub struct RateLimiterManager {
    limiters: Arc<RwLock<HashMap<String, RateLimiter>>>,
    config: RateLimitConfig,
}

impl RateLimiterManager {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            limiters: Arc::new(RwLock::new(HashMap::new())),
            config,
        }
    }

    pub async fn get_limiter(&self, key: &str) -> RateLimiter {
        let mut limiters = self.limiters.write().await;
        
        if let Some(limiter) = limiters.get(key) {
            return limiter.clone();
        }

        let limiter = RateLimiter::new(self.config.burst, self.config.rpm / 60);
        limiters.insert(key.to_string(), limiter.clone());
        limiter
    }

    pub async fn try_acquire(&self, key: &str) -> bool {
        let mut limiters = self.limiters.write().await;
        
        let limiter = limiters.entry(key.to_string())
            .or_insert_with(|| RateLimiter::new(self.config.burst, self.config.rpm / 60));
        
        limiter.try_acquire()
    }

    /// Clean up expired limiters (call periodically)
    pub async fn cleanup(&self, _max_idle_secs: u64) {
        // Note: In production, track last access time and remove stale entries
        // For now, we keep all limiters since they're lightweight
    }
}

/// Extract client identifier from request
pub fn extract_client_id(
    headers: &axum::http::HeaderMap,
    remote_addr: Option<std::net::SocketAddr>,
) -> String {
    // Try API key first
    if let Some(api_key) = headers.get("X-API-Key") {
        if let Ok(key) = api_key.to_str() {
            return format!("apikey:{}", key);
        }
    }

    // Try user ID from authorization
    if let Some(auth) = headers.get("Authorization") {
        if let Ok(auth_str) = auth.to_str() {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];
                // In production, decode JWT and extract user ID
                return format!("user:{}", &token[..token.len().min(16)]);
            }
        }
    }

    // Fall back to IP address
    if let Some(addr) = remote_addr {
        return format!("ip:{}", addr.ip());
    }

    "unknown".to_string()
}

/// Rate limit headers for response
#[derive(Debug, Clone)]
pub struct RateLimitHeaders {
    pub limit: u64,
    pub remaining: u64,
    pub reset: u64,
}

impl RateLimitHeaders {
    pub fn new(limit: u64, remaining: f64, reset_secs: u64) -> Self {
        Self {
            limit,
            remaining: remaining as u64,
            reset: reset_secs,
        }
    }

    pub fn to_headers(&self) -> Vec<(axum::http::HeaderName, axum::http::HeaderValue)> {
        vec![
            (
                axum::http::HeaderName::from_static("x-ratelimit-limit"),
                axum::http::HeaderValue::from(self.limit),
            ),
            (
                axum::http::HeaderName::from_static("x-ratelimit-remaining"),
                axum::http::HeaderValue::from(self.remaining),
            ),
            (
                axum::http::HeaderName::from_static("x-ratelimit-reset"),
                axum::http::HeaderValue::from(self.reset),
            ),
        ]
    }
}

/// Middleware for applying rate limits
pub async fn rate_limit_middleware(
    extension: Arc<RateLimiterManager>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Result<axum::response::Response, axum::http::StatusCode> {
    let client_id = extract_client_id(
        request.headers(),
        request.extensions().get::<std::net::SocketAddr>().copied(),
    );

    if extension.try_acquire(&client_id).await {
        Ok(next.run(request).await)
    } else {
        Err(axum::http::StatusCode::TOO_MANY_REQUESTS)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiter_acquire() {
        let mut limiter = RateLimiter::new(5, 1); // 5 burst, 1 per second
        
        // Should allow burst requests
        for _ in 0..5 {
            assert!(limiter.try_acquire());
        }
        
        // Should deny after burst exhausted
        assert!(!limiter.try_acquire());
    }

    #[tokio::test]
    async fn test_rate_limiter_refill() {
        let mut limiter = RateLimiter::new(2, 10); // 2 burst, 10 per second
        
        assert!(limiter.try_acquire());
        assert!(limiter.try_acquire());
        assert!(!limiter.try_acquire());
        
        // Wait for refill
        tokio::time::sleep(Duration::from_millis(200)).await;
        
        assert!(limiter.try_acquire());
    }
}
