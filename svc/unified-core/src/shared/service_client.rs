//! Shared Service Client for unified-core service.
//!
//! Provides a unified client for connecting to multiple real services
//! (CRM, ERP, Finance, HR, MES, EHS, WMS, QMS, PM, LIMS, BI, APS, CS,
//! SCM, IoT, OA, etc.). Supports service registration, request routing,
//! and unified response handling.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::mpsc;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::{Client, Method, Response};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

// ===== Service Client Errors =====

#[derive(Debug, Error)]
pub enum ServiceClientError {
    #[error("Service not found: {0}")]
    ServiceNotFound(String),

    #[error("Request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("Invalid header: {0}")]
    InvalidHeader(String),

    #[error("Response parsing failed: {0}")]
    ParseFailed(String),

    #[error("Service returned error status: {status} - {message}")]
    ServiceError { status: u16, message: String },

    #[error("Timeout after {0:?}")]
    Timeout(Duration),

    /// V437: Operation failed (e.g., circuit breaker open).
    #[error("Operation failed: {0}")]
    OperationFailed(String),
}

// ===== Service Configuration =====

/// Configuration for a single service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    /// Unique service identifier (e.g., "crm", "erp", "finance").
    pub name: String,
    /// Base URL of the service (e.g., "http://localhost:8001").
    pub base_url: String,
    /// Request timeout in seconds. Defaults to 30.
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    /// Optional API key for authentication.
    #[serde(default)]
    pub api_key: Option<String>,
    /// Optional bearer token for authentication.
    #[serde(default)]
    pub bearer_token: Option<String>,
    /// Additional default headers to send with every request.
    #[serde(default)]
    pub default_headers: HashMap<String, String>,
    /// Whether the service is enabled. Defaults to true.
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    /// V437: Maximum number of retries for failed requests. Defaults to 0 (no retry).
    #[serde(default)]
    pub max_retries: u32,
    /// V437: Delay between retries in milliseconds. Defaults to 1000.
    #[serde(default = "default_retry_delay")]
    pub retry_delay_ms: u64,
    /// V437: Whether to enable circuit breaker. Defaults to false.
    #[serde(default)]
    pub circuit_breaker_enabled: bool,
    /// V437: Failure threshold for circuit breaker (number of failures before opening). Defaults to 5.
    #[serde(default = "default_failure_threshold")]
    pub failure_threshold: u32,
    /// V437: Circuit breaker reset timeout in seconds. Defaults to 30.
    #[serde(default = "default_reset_timeout")]
    pub reset_timeout_secs: u64,
    /// V439: Whether to enable rate limiting. Defaults to false.
    #[serde(default)]
    pub rate_limit_enabled: bool,
    /// V439: Maximum requests per second. Defaults to 100.
    #[serde(default = "default_max_requests_per_second")]
    pub max_requests_per_second: u32,
    /// V439: Whether to enable load balancing. Defaults to false.
    #[serde(default)]
    pub load_balancing_enabled: bool,
    /// V439: Additional endpoints for load balancing (excluding base_url).
    #[serde(default)]
    pub endpoints: Vec<String>,
    /// V443: Connection pool configuration.
    #[serde(default)]
    pub connection_pool: ConnectionPoolConfig,
}

fn default_retry_delay() -> u64 {
    1000
}

fn default_failure_threshold() -> u32 {
    5
}

fn default_reset_timeout() -> u64 {
    30
}

fn default_max_requests_per_second() -> u32 {
    100
}

fn default_timeout() -> u64 {
    30
}

fn default_enabled() -> bool {
    true
}

impl ServiceConfig {
    /// Create a new service configuration.
    pub fn new(name: impl Into<String>, base_url: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            base_url: base_url.into(),
            timeout_secs: 30,
            api_key: None,
            bearer_token: None,
            default_headers: HashMap::new(),
            enabled: true,
            max_retries: 0,
            retry_delay_ms: 1000,
            circuit_breaker_enabled: false,
            failure_threshold: 5,
            reset_timeout_secs: 30,
            rate_limit_enabled: false,
            max_requests_per_second: 100,
            load_balancing_enabled: false,
            endpoints: Vec::new(),
            connection_pool: ConnectionPoolConfig::default(),
        }
    }

    /// Set the request timeout.
    pub fn with_timeout(mut self, secs: u64) -> Self {
        self.timeout_secs = secs;
        self
    }

    /// Set the API key.
    pub fn with_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    /// Set the bearer token.
    pub fn with_bearer_token(mut self, token: impl Into<String>) -> Self {
        self.bearer_token = Some(token.into());
        self
    }

    /// Add a default header.
    pub fn with_header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.default_headers.insert(key.into(), value.into());
        self
    }

    /// Build the full URL for a given path.
    pub fn build_url(&self, path: &str) -> Result<String, ServiceClientError> {
        let base = self.base_url.trim_end_matches('/');
        let path = path.trim_start_matches('/');
        Ok(format!("{}/{}", base, path))
    }

    /// Build the default headers for this service.
    pub fn build_headers(&self) -> Result<HeaderMap, ServiceClientError> {
        let mut headers = HeaderMap::new();

        if let Some(api_key) = &self.api_key {
            headers.insert(
                HeaderName::from_static("x-api-key"),
                HeaderValue::from_str(api_key)
                    .map_err(|e| ServiceClientError::InvalidHeader(e.to_string()))?,
            );
        }

        if let Some(token) = &self.bearer_token {
            let auth_value = format!("Bearer {}", token);
            headers.insert(
                reqwest::header::AUTHORIZATION,
                HeaderValue::from_str(&auth_value)
                    .map_err(|e| ServiceClientError::InvalidHeader(e.to_string()))?,
            );
        }

        for (key, value) in &self.default_headers {
            let header_name = HeaderName::from_bytes(key.as_bytes())
                .map_err(|e| ServiceClientError::InvalidHeader(e.to_string()))?;
            let header_value = HeaderValue::from_str(value)
                .map_err(|e| ServiceClientError::InvalidHeader(e.to_string()))?;
            headers.insert(header_name, header_value);
        }

        Ok(headers)
    }
}

// ===== Unified Service Response =====

/// Unified response wrapper for all service calls.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceResponse<T> {
    /// Whether the request was successful.
    pub success: bool,
    /// HTTP status code.
    pub status: u16,
    /// Response data (if successful).
    pub data: Option<T>,
    /// Error message (if failed).
    pub error: Option<String>,
    /// Request ID for tracing.
    pub request_id: String,
    /// Service name that handled the request.
    pub service: String,
    /// Response time in milliseconds.
    pub duration_ms: u64,
}

impl<T> ServiceResponse<T> {
    /// Create a successful response.
    pub fn success(
        data: T,
        status: u16,
        request_id: String,
        service: String,
        duration_ms: u64,
    ) -> Self {
        Self {
            success: true,
            status,
            data: Some(data),
            error: None,
            request_id,
            service,
            duration_ms,
        }
    }

    /// Create an error response.
    pub fn error(
        status: u16,
        message: String,
        request_id: String,
        service: String,
        duration_ms: u64,
    ) -> Self {
        Self {
            success: false,
            status,
            data: None,
            error: Some(message),
            request_id,
            service,
            duration_ms,
        }
    }
}

// ===== V441: Service Discovery Types =====

/// Service registration information.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ServiceRegistration {
    /// Unique service identifier.
    pub name: String,
    /// Service base URL.
    pub base_url: String,
    /// Service version (e.g., "1.0.0").
    #[serde(default)]
    pub version: String,
    /// Service description.
    #[serde(default)]
    pub description: String,
    /// Service tags for filtering.
    #[serde(default)]
    pub tags: Vec<String>,
    /// Service metadata (key-value pairs).
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    /// Whether the service is enabled.
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    /// Registration timestamp (RFC3339 format).
    #[serde(default)]
    pub registered_at: String,
    /// Last heartbeat timestamp (RFC3339 format).
    #[serde(default)]
    pub last_heartbeat: String,
}

impl ServiceRegistration {
    /// Create a new service registration.
    pub fn new(name: &str, base_url: &str) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            name: name.to_string(),
            base_url: base_url.to_string(),
            version: "1.0.0".to_string(),
            description: String::new(),
            tags: Vec::new(),
            metadata: HashMap::new(),
            enabled: true,
            registered_at: now.clone(),
            last_heartbeat: now,
        }
    }

    /// Convert to ServiceConfig.
    pub fn to_config(&self) -> ServiceConfig {
        ServiceConfig {
            name: self.name.clone(),
            base_url: self.base_url.clone(),
            timeout_secs: 30,
            api_key: None,
            bearer_token: None,
            default_headers: HashMap::new(),
            enabled: self.enabled,
            max_retries: 0,
            retry_delay_ms: 1000,
            circuit_breaker_enabled: false,
            failure_threshold: 5,
            reset_timeout_secs: 30,
            rate_limit_enabled: false,
            max_requests_per_second: 100,
            load_balancing_enabled: false,
            endpoints: Vec::new(),
            connection_pool: ConnectionPoolConfig::default(),
        }
    }

    /// Update the heartbeat timestamp.
    pub fn heartbeat(&mut self) {
        self.last_heartbeat = chrono::Utc::now().to_rfc3339();
    }
}

/// Service discovery trait for dynamic service registration and discovery.
#[async_trait::async_trait]
pub trait ServiceDiscovery: Send + Sync {
    /// Register a service.
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError>;

    /// Deregister a service by name.
    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError>;

    /// Discover a service by name.
    async fn discover(&self, name: &str)
        -> Result<Option<ServiceRegistration>, ServiceClientError>;

    /// List all registered services.
    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError>;

    /// Send a heartbeat for a service.
    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError>;
}

/// 服务变更 watch 句柄
///
/// 由 `spawn_service_watch` 创建；调用 `cancel()` 或 Drop 后停止轮询感知。
pub struct ServiceWatchHandle {
    pub(crate) task: Option<tokio::task::JoinHandle<()>>,
    pub(crate) cancel_tx: mpsc::Sender<()>,
}

impl ServiceWatchHandle {
    /// 停止 watch 任务
    pub async fn cancel(&mut self) {
        let _ = self.cancel_tx.send(()).await;
        if let Some(task) = self.task.take() {
            let _ = task.await;
        }
    }
}

impl Drop for ServiceWatchHandle {
    fn drop(&mut self) {
        let _ = self.cancel_tx.try_send(());
    }
}

/// Static service discovery based on in-memory configuration.
///
/// This is the default service discovery implementation. Services are
/// registered manually and stored in memory. For dynamic service discovery
/// (e.g., Consul, etcd, Zookeeper), implement the ServiceDiscovery trait.
pub struct StaticServiceDiscovery {
    /// Registered services (shared across clones).
    services: Arc<std::sync::Mutex<HashMap<String, ServiceRegistration>>>,
}

impl StaticServiceDiscovery {
    /// Create a new static service discovery.
    pub fn new() -> Self {
        Self {
            services: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }

    /// Create from a list of service configurations.
    pub fn from_configs(configs: Vec<ServiceConfig>) -> Self {
        let discovery = Self::new();
        for config in configs {
            let registration = ServiceRegistration {
                name: config.name.clone(),
                base_url: config.base_url.clone(),
                version: "1.0.0".to_string(),
                description: String::new(),
                tags: Vec::new(),
                metadata: HashMap::new(),
                enabled: config.enabled,
                registered_at: chrono::Utc::now().to_rfc3339(),
                last_heartbeat: chrono::Utc::now().to_rfc3339(),
            };
            discovery
                .services
                .lock()
                .unwrap()
                .insert(config.name, registration);
        }
        discovery
    }

    /// Get a service registration by name (synchronous).
    pub fn get(&self, name: &str) -> Option<ServiceRegistration> {
        self.services.lock().unwrap().get(name).cloned()
    }

    /// List all service registrations (synchronous).
    pub fn list(&self) -> Vec<ServiceRegistration> {
        self.services.lock().unwrap().values().cloned().collect()
    }

    /// Check if a service is registered (synchronous).
    pub fn has(&self, name: &str) -> bool {
        self.services.lock().unwrap().contains_key(name)
    }

    /// Get the number of registered services (synchronous).
    pub fn count(&self) -> usize {
        self.services.lock().unwrap().len()
    }
}

impl Default for StaticServiceDiscovery {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl ServiceDiscovery for StaticServiceDiscovery {
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        self.services
            .lock()
            .unwrap()
            .insert(registration.name.clone(), registration);
        Ok(())
    }

    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError> {
        self.services.lock().unwrap().remove(name);
        Ok(())
    }

    async fn discover(
        &self,
        name: &str,
    ) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        Ok(self.services.lock().unwrap().get(name).cloned())
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        Ok(self.services.lock().unwrap().values().cloned().collect())
    }

    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError> {
        if let Some(registration) = self.services.lock().unwrap().get_mut(name) {
            registration.heartbeat();
            Ok(())
        } else {
            Err(ServiceClientError::ServiceNotFound(name.to_string()))
        }
    }
}

// ===== V445: Environment-based Service Discovery =====

/// Environment-based service discovery.
///
/// Reads service configurations from environment variables. This serves as
/// a simple dynamic service discovery implementation that can be used as
/// a transition to more advanced solutions like Consul, etcd, or Zookeeper.
///
/// Environment variable format:
/// - `TOPEMS_SERVICE_<NAME>_URL` — Service base URL (required)
/// - `TOPEMS_SERVICE_<NAME>_ENABLED` — Whether the service is enabled (optional, default: true)
/// - `TOPEMS_SERVICE_<NAME>_VERSION` — Service version (optional, default: "1.0.0")
/// - `TOPEMS_SERVICE_<NAME>_TAGS` — Comma-separated service tags (optional)
///
/// Example:
/// ```bash
/// TOPEMS_SERVICE_CRM_URL=http://localhost:8001
/// TOPEMS_SERVICE_CRM_ENABLED=true
/// TOPEMS_SERVICE_CRM_VERSION=2.0.0
/// TOPEMS_SERVICE_CRM_TAGS=production,critical
/// ```
pub struct EnvServiceDiscovery {
    /// Environment variable prefix.
    prefix: String,
    /// Discovered services (cached after initial load).
    services: Arc<std::sync::Mutex<HashMap<String, ServiceRegistration>>>,
}

impl EnvServiceDiscovery {
    /// Create a new environment-based service discovery with the default prefix "TOPEMS_SERVICE_".
    pub fn new() -> Self {
        Self::with_prefix("TOPEMS_SERVICE_")
    }

    /// Create a new environment-based service discovery with a custom prefix.
    pub fn with_prefix(prefix: &str) -> Self {
        let discovery = Self {
            prefix: prefix.to_string(),
            services: Arc::new(std::sync::Mutex::new(HashMap::new())),
        };
        // Load services from environment variables
        discovery.load_from_env();
        discovery
    }

    /// Load service configurations from environment variables.
    pub fn load_from_env(&self) {
        let mut services = HashMap::new();

        // Collect all unique service names from environment variables
        let mut service_names = std::collections::HashSet::new();
        for (key, _value) in std::env::vars() {
            if let Some(name) = self.extract_service_name(&key) {
                service_names.insert(name);
            }
        }

        // Create service registrations for each service name
        for name in service_names {
            if let Some(registration) = self.create_registration_from_env(&name) {
                services.insert(name, registration);
            }
        }

        let mut stored = self.services.lock().unwrap();
        *stored = services;
    }

    /// Reload service configurations from environment variables.
    pub fn reload(&self) {
        self.load_from_env();
    }

    /// Extract the service name from an environment variable key.
    fn extract_service_name(&self, key: &str) -> Option<String> {
        if !key.starts_with(&self.prefix) {
            return None;
        }

        let remaining = &key[self.prefix.len()..];
        // Find the suffix separator (_URL, _ENABLED, _VERSION, _TAGS)
        let suffixes = ["_URL", "_ENABLED", "_VERSION", "_TAGS"];
        for suffix in suffixes {
            if let Some(name) = remaining.strip_suffix(suffix) {
                return Some(name.to_lowercase());
            }
        }

        None
    }

    /// Create a service registration from environment variables.
    fn create_registration_from_env(&self, name: &str) -> Option<ServiceRegistration> {
        let upper_name = name.to_uppercase();

        // URL is required
        let url_key = format!("{}{}_URL", self.prefix, upper_name);
        let base_url = std::env::var(&url_key).ok()?;

        // Optional fields
        let enabled_key = format!("{}{}_ENABLED", self.prefix, upper_name);
        let enabled = std::env::var(&enabled_key)
            .ok()
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
            .unwrap_or(true);

        let version_key = format!("{}{}_VERSION", self.prefix, upper_name);
        let version = std::env::var(&version_key).unwrap_or_else(|_| "1.0.0".to_string());

        let tags_key = format!("{}{}_TAGS", self.prefix, upper_name);
        let tags = std::env::var(&tags_key)
            .ok()
            .map(|v| v.split(',').map(|s| s.trim().to_string()).collect())
            .unwrap_or_default();

        let now = chrono::Utc::now().to_rfc3339();

        Some(ServiceRegistration {
            name: name.to_string(),
            base_url,
            version,
            description: String::new(),
            tags,
            metadata: HashMap::new(),
            enabled,
            registered_at: now.clone(),
            last_heartbeat: now,
        })
    }

    /// Get a service registration by name (synchronous).
    pub fn get(&self, name: &str) -> Option<ServiceRegistration> {
        self.services.lock().unwrap().get(name).cloned()
    }

    /// List all service registrations (synchronous).
    pub fn list(&self) -> Vec<ServiceRegistration> {
        self.services.lock().unwrap().values().cloned().collect()
    }

    /// Check if a service is registered (synchronous).
    pub fn has(&self, name: &str) -> bool {
        self.services.lock().unwrap().contains_key(name)
    }

    /// Get the number of registered services (synchronous).
    pub fn count(&self) -> usize {
        self.services.lock().unwrap().len()
    }

    /// Get the environment variable prefix.
    pub fn prefix(&self) -> &str {
        &self.prefix
    }
}

impl Default for EnvServiceDiscovery {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl ServiceDiscovery for EnvServiceDiscovery {
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        self.services
            .lock()
            .unwrap()
            .insert(registration.name.clone(), registration);
        Ok(())
    }

    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError> {
        self.services.lock().unwrap().remove(name);
        Ok(())
    }

    async fn discover(
        &self,
        name: &str,
    ) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        Ok(self.services.lock().unwrap().get(name).cloned())
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        Ok(self.services.lock().unwrap().values().cloned().collect())
    }

    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError> {
        if let Some(registration) = self.services.lock().unwrap().get_mut(name) {
            registration.heartbeat();
            Ok(())
        } else {
            Err(ServiceClientError::ServiceNotFound(name.to_string()))
        }
    }
}

// ===== V439: Rate Limiter & Load Balancer Types =====

/// Rate limiter using token bucket algorithm.
#[derive(Debug)]
pub struct RateLimiter {
    /// Maximum tokens (requests per second).
    max_tokens: u32,
    /// Current tokens.
    current_tokens: f64,
    /// Last refill time.
    last_refill: std::time::Instant,
}

impl RateLimiter {
    /// Create a new rate limiter.
    pub fn new(max_requests_per_second: u32) -> Self {
        Self {
            max_tokens: max_requests_per_second,
            current_tokens: max_requests_per_second as f64,
            last_refill: std::time::Instant::now(),
        }
    }

    /// Try to acquire a token. Returns true if acquired, false if rate limited.
    pub fn try_acquire(&mut self) -> bool {
        let now = std::time::Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();

        // Refill tokens
        self.current_tokens =
            (self.current_tokens + elapsed * self.max_tokens as f64).min(self.max_tokens as f64);
        self.last_refill = now;

        if self.current_tokens >= 1.0 {
            self.current_tokens -= 1.0;
            true
        } else {
            false
        }
    }
}

/// Load balancer strategy.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LoadBalancingStrategy {
    /// Round-robin: distribute requests evenly across endpoints.
    RoundRobin,
    /// Random: randomly select an endpoint.
    Random,
}

/// Load balancer for distributing requests across multiple endpoints.
#[derive(Debug)]
pub struct LoadBalancer {
    /// All endpoints (including base_url).
    endpoints: Vec<String>,
    /// Current index for round-robin.
    current_index: usize,
    /// Load balancing strategy.
    strategy: LoadBalancingStrategy,
}

impl LoadBalancer {
    /// Create a new load balancer.
    pub fn new(base_url: String, additional_endpoints: Vec<String>) -> Self {
        let mut endpoints = vec![base_url];
        endpoints.extend(additional_endpoints);
        Self {
            endpoints,
            current_index: 0,
            strategy: LoadBalancingStrategy::RoundRobin,
        }
    }

    /// Get the next endpoint based on the strategy.
    pub fn next_endpoint(&mut self) -> &str {
        match self.strategy {
            LoadBalancingStrategy::RoundRobin => {
                let endpoint = &self.endpoints[self.current_index];
                self.current_index = (self.current_index + 1) % self.endpoints.len();
                endpoint
            }
            LoadBalancingStrategy::Random => {
                use rand::Rng;
                let mut rng = rand::thread_rng();
                let index = rng.gen_range(0..self.endpoints.len());
                &self.endpoints[index]
            }
        }
    }

    /// Get all endpoints.
    pub fn endpoints(&self) -> &[String] {
        &self.endpoints
    }

    /// Get the number of endpoints.
    pub fn endpoint_count(&self) -> usize {
        self.endpoints.len()
    }
}

/// V439: Rate limiter status information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimiterStatus {
    /// Whether rate limiting is enabled.
    pub enabled: bool,
    /// Maximum requests per second.
    pub max_requests_per_second: u32,
    /// Current available tokens.
    pub current_tokens: f64,
}

/// V439: Load balancer status information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadBalancerStatus {
    /// Whether load balancing is enabled.
    pub enabled: bool,
    /// All endpoints (including base_url).
    pub endpoints: Vec<String>,
    /// Number of endpoints.
    pub endpoint_count: usize,
    /// Current index for round-robin.
    pub current_index: usize,
}

// ===== V443: Connection Pool Configuration & Request Statistics =====

/// Connection pool configuration for the HTTP client.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionPoolConfig {
    /// Maximum idle connections per host. Defaults to 10.
    #[serde(default = "default_pool_max_idle_per_host")]
    pub max_idle_per_host: usize,
    /// Idle connection timeout in seconds. Defaults to 90.
    #[serde(default = "default_pool_idle_timeout")]
    pub idle_timeout_secs: u64,
    /// Maximum connection lifetime in seconds. None means no limit.
    #[serde(default)]
    pub max_lifetime_secs: Option<u64>,
    /// Whether to enable TCP keepalive. Defaults to true.
    #[serde(default = "default_tcp_keepalive")]
    pub tcp_keepalive: bool,
    /// TCP keepalive interval in seconds. Defaults to 60.
    #[serde(default = "default_tcp_keepalive_interval")]
    pub tcp_keepalive_interval_secs: u64,
}

fn default_pool_max_idle_per_host() -> usize {
    10
}

fn default_pool_idle_timeout() -> u64 {
    90
}

fn default_tcp_keepalive() -> bool {
    true
}

fn default_tcp_keepalive_interval() -> u64 {
    60
}

impl Default for ConnectionPoolConfig {
    fn default() -> Self {
        Self {
            max_idle_per_host: default_pool_max_idle_per_host(),
            idle_timeout_secs: default_pool_idle_timeout(),
            max_lifetime_secs: None,
            tcp_keepalive: default_tcp_keepalive(),
            tcp_keepalive_interval_secs: default_tcp_keepalive_interval(),
        }
    }
}

/// Request statistics for monitoring and metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestStatistics {
    /// Total number of requests made.
    pub total_requests: u64,
    /// Number of successful requests.
    pub successful_requests: u64,
    /// Number of failed requests.
    pub failed_requests: u64,
    /// Number of rate-limited requests.
    pub rate_limited_requests: u64,
    /// Number of circuit-breaker-rejected requests.
    pub circuit_breaker_rejected: u64,
    /// Total response time in milliseconds.
    pub total_response_time_ms: u64,
    /// Minimum response time in milliseconds.
    pub min_response_time_ms: u64,
    /// Maximum response time in milliseconds.
    pub max_response_time_ms: u64,
    /// Average response time in milliseconds.
    pub avg_response_time_ms: f64,
    /// Success rate (0.0 - 1.0).
    pub success_rate: f64,
    /// Requests per second (calculated from uptime).
    pub requests_per_second: f64,
    /// Client uptime in seconds.
    pub uptime_secs: u64,
    /// Last request timestamp (RFC3339 format).
    pub last_request_at: Option<String>,
    /// Last successful request timestamp (RFC3339 format).
    pub last_success_at: Option<String>,
    /// Last failed request timestamp (RFC3339 format).
    pub last_failure_at: Option<String>,
}

impl RequestStatistics {
    /// Create a new empty request statistics.
    pub fn new() -> Self {
        Self {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            rate_limited_requests: 0,
            circuit_breaker_rejected: 0,
            total_response_time_ms: 0,
            min_response_time_ms: u64::MAX,
            max_response_time_ms: 0,
            avg_response_time_ms: 0.0,
            success_rate: 0.0,
            requests_per_second: 0.0,
            uptime_secs: 0,
            last_request_at: None,
            last_success_at: None,
            last_failure_at: None,
        }
    }

    /// Record a successful request.
    pub fn record_success(&mut self, response_time_ms: u64) {
        self.total_requests += 1;
        self.successful_requests += 1;
        self.total_response_time_ms += response_time_ms;
        self.min_response_time_ms = self.min_response_time_ms.min(response_time_ms);
        self.max_response_time_ms = self.max_response_time_ms.max(response_time_ms);
        self.last_request_at = Some(chrono::Utc::now().to_rfc3339());
        self.last_success_at = Some(chrono::Utc::now().to_rfc3339());
        self.update_calculated_fields();
    }

    /// Record a failed request.
    pub fn record_failure(&mut self, response_time_ms: u64) {
        self.total_requests += 1;
        self.failed_requests += 1;
        self.total_response_time_ms += response_time_ms;
        self.min_response_time_ms = self.min_response_time_ms.min(response_time_ms);
        self.max_response_time_ms = self.max_response_time_ms.max(response_time_ms);
        self.last_request_at = Some(chrono::Utc::now().to_rfc3339());
        self.last_failure_at = Some(chrono::Utc::now().to_rfc3339());
        self.update_calculated_fields();
    }

    /// Record a rate-limited request.
    pub fn record_rate_limited(&mut self) {
        self.total_requests += 1;
        self.rate_limited_requests += 1;
        self.last_request_at = Some(chrono::Utc::now().to_rfc3339());
        self.update_calculated_fields();
    }

    /// Record a circuit-breaker-rejected request.
    pub fn record_circuit_breaker_rejected(&mut self) {
        self.total_requests += 1;
        self.circuit_breaker_rejected += 1;
        self.last_request_at = Some(chrono::Utc::now().to_rfc3339());
        self.update_calculated_fields();
    }

    /// Update calculated fields (avg, success_rate, rps).
    fn update_calculated_fields(&mut self) {
        if self.total_requests > 0 {
            self.avg_response_time_ms =
                self.total_response_time_ms as f64 / self.total_requests as f64;
            self.success_rate = self.successful_requests as f64 / self.total_requests as f64;
        }
        if self.uptime_secs > 0 {
            self.requests_per_second = self.total_requests as f64 / self.uptime_secs as f64;
        }
    }

    /// Update uptime.
    pub fn update_uptime(&mut self, secs: u64) {
        self.uptime_secs = secs;
        self.update_calculated_fields();
    }

    /// Reset all statistics.
    pub fn reset(&mut self) {
        *self = Self::new();
    }
}

impl Default for RequestStatistics {
    fn default() -> Self {
        Self::new()
    }
}

// ===== V437: Circuit Breaker Types =====

/// Circuit breaker state.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CircuitBreakerState {
    /// Circuit is closed, requests are allowed.
    Closed,
    /// Circuit is open, requests are rejected.
    Open,
    /// Circuit is half-open, allowing a limited number of requests to test recovery.
    HalfOpen,
}

/// Circuit breaker status information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerStatus {
    /// Current state of the circuit breaker.
    pub state: String,
    /// Number of consecutive failures.
    pub failure_count: u32,
    /// Number of consecutive successes.
    pub success_count: u32,
    /// Timestamp when the circuit was opened (RFC3339 format).
    pub opened_at: Option<String>,
    /// Whether the circuit breaker is enabled.
    pub enabled: bool,
}

// ===== Service Client =====

/// Client for making requests to a specific service.
#[derive(Clone)]
pub struct ServiceClient {
    config: ServiceConfig,
    http_client: Client,
    /// V437: Circuit breaker state (shared across clones).
    circuit_breaker: Arc<std::sync::Mutex<CircuitBreakerInternal>>,
    /// V439: Rate limiter (shared across clones).
    rate_limiter: Arc<std::sync::Mutex<RateLimiter>>,
    /// V439: Load balancer (shared across clones).
    load_balancer: Arc<std::sync::Mutex<LoadBalancer>>,
    /// V443: Request statistics (shared across clones).
    statistics: Arc<std::sync::Mutex<RequestStatistics>>,
    /// V443: Client creation time for uptime calculation.
    created_at: std::time::Instant,
}

/// Internal circuit breaker state.
#[derive(Debug)]
struct CircuitBreakerInternal {
    state: CircuitBreakerState,
    failure_count: u32,
    success_count: u32,
    opened_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl ServiceClient {
    /// Create a new service client from a configuration.
    pub fn new(config: ServiceConfig) -> Result<Self, ServiceClientError> {
        let timeout = Duration::from_secs(config.timeout_secs);

        // V443: Build HTTP client with connection pool configuration
        let mut client_builder = Client::builder()
            .timeout(timeout)
            .pool_max_idle_per_host(config.connection_pool.max_idle_per_host)
            .pool_idle_timeout(Duration::from_secs(
                config.connection_pool.idle_timeout_secs,
            ));

        if let Some(max_lifetime) = config.connection_pool.max_lifetime_secs {
            // Note: pool_max_lifetime is not available in this reqwest version
            let _ = max_lifetime;
        }

        if config.connection_pool.tcp_keepalive {
            client_builder = client_builder.tcp_keepalive(Duration::from_secs(
                config.connection_pool.tcp_keepalive_interval_secs,
            ));
        }

        let http_client = client_builder
            .build()
            .map_err(ServiceClientError::RequestFailed)?;

        let circuit_breaker = Arc::new(std::sync::Mutex::new(CircuitBreakerInternal {
            state: CircuitBreakerState::Closed,
            failure_count: 0,
            success_count: 0,
            opened_at: None,
        }));

        // V439: Initialize rate limiter
        let rate_limiter = Arc::new(std::sync::Mutex::new(RateLimiter::new(
            config.max_requests_per_second,
        )));

        // V439: Initialize load balancer
        let load_balancer = Arc::new(std::sync::Mutex::new(LoadBalancer::new(
            config.base_url.clone(),
            config.endpoints.clone(),
        )));

        // V443: Initialize request statistics
        let statistics = Arc::new(std::sync::Mutex::new(RequestStatistics::new()));
        let created_at = std::time::Instant::now();

        Ok(Self {
            config,
            http_client,
            circuit_breaker,
            rate_limiter,
            load_balancer,
            statistics,
            created_at,
        })
    }

    /// Get the service name.
    pub fn name(&self) -> &str {
        &self.config.name
    }

    /// Get the service configuration.
    pub fn config(&self) -> &ServiceConfig {
        &self.config
    }

    /// Send a GET request.
    pub async fn get<T: DeserializeOwned>(
        &self,
        path: &str,
        query: Option<&HashMap<String, String>>,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        self.request::<T, ()>(Method::GET, path, query, None).await
    }

    /// Send a POST request.
    pub async fn post<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        self.request(Method::POST, path, None, Some(body)).await
    }

    /// Send a PUT request.
    pub async fn put<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        self.request(Method::PUT, path, None, Some(body)).await
    }

    /// Send a DELETE request.
    pub async fn delete<T: DeserializeOwned>(
        &self,
        path: &str,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        self.request::<T, ()>(Method::DELETE, path, None, None)
            .await
    }

    /// Send a generic request.
    pub async fn request<T: DeserializeOwned, B: Serialize>(
        &self,
        method: Method,
        path: &str,
        query: Option<&HashMap<String, String>>,
        body: Option<&B>,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        // V437: Check circuit breaker before making request
        if self.config.circuit_breaker_enabled {
            if let Err(e) = self.check_circuit_breaker() {
                // V443: Record circuit breaker rejection
                self.statistics
                    .lock()
                    .unwrap()
                    .record_circuit_breaker_rejected();
                return Err(e);
            }
        }

        // V439: Check rate limit before making request
        if self.config.rate_limit_enabled {
            if let Err(e) = self.check_rate_limit() {
                // V443: Record rate limited request
                self.statistics.lock().unwrap().record_rate_limited();
                return Err(e);
            }
        }

        let max_retries = self.config.max_retries;
        let retry_delay = Duration::from_millis(self.config.retry_delay_ms);

        let mut last_error: Option<ServiceClientError> = None;

        for attempt in 0..=max_retries {
            match self
                .request_once::<T, B>(method.clone(), path, query, body)
                .await
            {
                Ok(response) => {
                    // V437: Record success for circuit breaker
                    if self.config.circuit_breaker_enabled {
                        self.record_success();
                    }
                    // V443: Record successful request
                    self.statistics
                        .lock()
                        .unwrap()
                        .record_success(response.duration_ms);
                    return Ok(response);
                }
                Err(e) => {
                    last_error = Some(e);

                    // V437: Record failure for circuit breaker
                    if self.config.circuit_breaker_enabled {
                        self.record_failure();
                    }

                    // Retry if not the last attempt
                    if attempt < max_retries {
                        tokio::time::sleep(retry_delay).await;
                        continue;
                    }

                    // V443: Record failed request (after all retries exhausted)
                    self.statistics.lock().unwrap().record_failure(0);
                }
            }
        }

        Err(
            last_error.unwrap_or(ServiceClientError::Timeout(Duration::from_secs(
                self.config.timeout_secs,
            ))),
        )
    }

    /// V437: Send a single request without retry.
    async fn request_once<T: DeserializeOwned, B: Serialize>(
        &self,
        method: Method,
        path: &str,
        query: Option<&HashMap<String, String>>,
        body: Option<&B>,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let start = std::time::Instant::now();
        let request_id = Uuid::new_v4().to_string();
        let service_name = self.config.name.clone();

        // V439: Build URL with load balancing if enabled
        let url = if self.config.load_balancing_enabled {
            let endpoint = self.get_next_endpoint();
            let base = endpoint.trim_end_matches('/');
            let p = path.trim_start_matches('/');
            format!("{}/{}", base, p)
        } else {
            self.config.build_url(path)?
        };

        // Build request
        let mut req_builder = self
            .http_client
            .request(method.clone(), &url)
            .header("x-request-id", &request_id);

        // Add default headers
        let headers = self.config.build_headers()?;
        req_builder = req_builder.headers(headers);

        // Add query parameters
        if let Some(query_params) = query {
            req_builder = req_builder.query(query_params);
        }

        // Add body
        if let Some(body_data) = body {
            req_builder = req_builder.json(body_data);
        }

        // Send request
        let response: Response = req_builder.send().await?;
        let status = response.status().as_u16();
        let duration_ms = start.elapsed().as_millis() as u64;

        // Check status
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Ok(ServiceResponse::error(
                status,
                error_body,
                request_id,
                service_name,
                duration_ms,
            ));
        }

        // Parse response
        let data: T = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        Ok(ServiceResponse::success(
            data,
            status,
            request_id,
            service_name,
            duration_ms,
        ))
    }

    // ===== V437: Circuit Breaker Methods =====

    /// Check if the circuit breaker allows requests.
    fn check_circuit_breaker(&self) -> Result<(), ServiceClientError> {
        let mut cb = self.circuit_breaker.lock().unwrap();

        // Check if circuit is open and reset timeout has passed
        if cb.state == CircuitBreakerState::Open {
            if let Some(opened_at) = cb.opened_at {
                let elapsed = chrono::Utc::now() - opened_at;
                if elapsed >= chrono::Duration::seconds(self.config.reset_timeout_secs as i64) {
                    // Transition to half-open
                    cb.state = CircuitBreakerState::HalfOpen;
                    cb.success_count = 0;
                } else {
                    return Err(ServiceClientError::OperationFailed(format!(
                        "Circuit breaker is open for service '{}'",
                        self.config.name
                    )));
                }
            }
        }

        Ok(())
    }

    /// Record a successful request.
    fn record_success(&self) {
        let mut cb = self.circuit_breaker.lock().unwrap();
        cb.failure_count = 0;
        cb.success_count += 1;

        // If half-open and enough successes, close the circuit
        if cb.state == CircuitBreakerState::HalfOpen && cb.success_count >= 3 {
            cb.state = CircuitBreakerState::Closed;
            cb.opened_at = None;
        }
    }

    /// Record a failed request.
    fn record_failure(&self) {
        let mut cb = self.circuit_breaker.lock().unwrap();
        cb.failure_count += 1;
        cb.success_count = 0;

        // Open the circuit if failure threshold is reached
        if cb.failure_count >= self.config.failure_threshold {
            cb.state = CircuitBreakerState::Open;
            cb.opened_at = Some(chrono::Utc::now());
        }
    }

    /// Get the circuit breaker status.
    pub fn get_circuit_breaker_status(&self) -> CircuitBreakerStatus {
        let cb = self.circuit_breaker.lock().unwrap();
        CircuitBreakerStatus {
            state: format!("{:?}", cb.state),
            failure_count: cb.failure_count,
            success_count: cb.success_count,
            opened_at: cb.opened_at.map(|t| t.to_rfc3339()),
            enabled: self.config.circuit_breaker_enabled,
        }
    }

    /// Reset the circuit breaker to closed state.
    pub fn reset_circuit_breaker(&self) {
        let mut cb = self.circuit_breaker.lock().unwrap();
        cb.state = CircuitBreakerState::Closed;
        cb.failure_count = 0;
        cb.success_count = 0;
        cb.opened_at = None;
    }

    // ===== V439: Rate Limiter Methods =====

    /// Check if the rate limiter allows requests.
    fn check_rate_limit(&self) -> Result<(), ServiceClientError> {
        let mut rl = self.rate_limiter.lock().unwrap();
        if !rl.try_acquire() {
            return Err(ServiceClientError::OperationFailed(format!(
                "Rate limit exceeded for service '{}' (max {} requests/second)",
                self.config.name, self.config.max_requests_per_second
            )));
        }
        Ok(())
    }

    /// Get the rate limiter status.
    pub fn get_rate_limiter_status(&self) -> RateLimiterStatus {
        let rl = self.rate_limiter.lock().unwrap();
        RateLimiterStatus {
            enabled: self.config.rate_limit_enabled,
            max_requests_per_second: self.config.max_requests_per_second,
            current_tokens: rl.current_tokens,
        }
    }

    /// Reset the rate limiter.
    pub fn reset_rate_limiter(&self) {
        let mut rl = self.rate_limiter.lock().unwrap();
        *rl = RateLimiter::new(self.config.max_requests_per_second);
    }

    // ===== V439: Load Balancer Methods =====

    /// Get the load balancer status.
    pub fn get_load_balancer_status(&self) -> LoadBalancerStatus {
        let lb = self.load_balancer.lock().unwrap();
        LoadBalancerStatus {
            enabled: self.config.load_balancing_enabled,
            endpoints: lb.endpoints().to_vec(),
            endpoint_count: lb.endpoint_count(),
            current_index: lb.current_index,
        }
    }

    /// Get the next endpoint for load balancing.
    pub fn get_next_endpoint(&self) -> String {
        let mut lb = self.load_balancer.lock().unwrap();
        lb.next_endpoint().to_string()
    }

    // ===== V443: Request Statistics & Connection Pool Methods =====

    /// Get the request statistics.
    pub fn get_statistics(&self) -> RequestStatistics {
        let mut stats = self.statistics.lock().unwrap().clone();
        // Update uptime
        stats.update_uptime(self.created_at.elapsed().as_secs());
        stats
    }

    /// Reset the request statistics.
    pub fn reset_statistics(&self) {
        self.statistics.lock().unwrap().reset();
    }

    /// Get the connection pool configuration.
    pub fn get_connection_pool_config(&self) -> ConnectionPoolConfig {
        self.config.connection_pool.clone()
    }

    /// Send a raw request and return the raw response bytes.
    pub async fn request_raw(
        &self,
        method: Method,
        path: &str,
        body: Option<Vec<u8>>,
    ) -> Result<(u16, Vec<u8>), ServiceClientError> {
        let url = self.config.build_url(path)?;
        let mut req_builder = self.http_client.request(method, &url);

        let headers = self.config.build_headers()?;
        req_builder = req_builder.headers(headers);

        if let Some(body_data) = body {
            req_builder = req_builder.body(body_data);
        }

        let response = req_builder.send().await?;
        let status = response.status().as_u16();
        let bytes = response.bytes().await?.to_vec();

        Ok((status, bytes))
    }
}

// ===== Service Registry =====

/// Registry for managing multiple service clients.
#[derive(Clone, Default)]
pub struct ServiceRegistry {
    services: Arc<std::sync::Mutex<HashMap<String, ServiceClient>>>,
}

impl ServiceRegistry {
    /// Create a new empty service registry.
    pub fn new() -> Self {
        Self {
            services: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }

    /// Register a service with the given configuration.
    pub fn register(&self, config: ServiceConfig) -> Result<(), ServiceClientError> {
        let client = ServiceClient::new(config.clone())?;
        let mut services = self
            .services
            .lock()
            .map_err(|e| ServiceClientError::InvalidHeader(e.to_string()))?;
        services.insert(config.name.clone(), client);
        Ok(())
    }

    /// Register multiple services at once.
    pub fn register_all(&self, configs: Vec<ServiceConfig>) -> Result<(), ServiceClientError> {
        for config in configs {
            self.register(config)?;
        }
        Ok(())
    }

    /// Get a service client by name.
    pub fn get_client(&self, name: &str) -> Result<ServiceClient, ServiceClientError> {
        let services = self
            .services
            .lock()
            .map_err(|e| ServiceClientError::InvalidHeader(e.to_string()))?;
        services
            .get(name)
            .cloned()
            .ok_or_else(|| ServiceClientError::ServiceNotFound(name.to_string()))
    }

    /// Check if a service is registered.
    pub fn has(&self, name: &str) -> bool {
        let services = self.services.lock().unwrap();
        services.contains_key(name)
    }

    /// Remove a service from the registry.
    pub fn remove(&self, name: &str) -> Option<ServiceClient> {
        let mut services = self.services.lock().unwrap();
        services.remove(name)
    }

    /// List all registered service names.
    pub fn list(&self) -> Vec<String> {
        let services = self.services.lock().unwrap();
        services.keys().cloned().collect()
    }

    /// Get the number of registered services.
    pub fn count(&self) -> usize {
        let services = self.services.lock().unwrap();
        services.len()
    }

    /// Send a GET request to a named service.
    pub async fn get<T: DeserializeOwned>(
        &self,
        service: &str,
        path: &str,
        query: Option<&HashMap<String, String>>,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let client = self.get_client(service)?;
        client.get(path, query).await
    }

    /// Send a POST request to a named service.
    pub async fn post<T: DeserializeOwned, B: Serialize>(
        &self,
        service: &str,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let client = self.get_client(service)?;
        client.post(path, body).await
    }

    /// Send a PUT request to a named service.
    pub async fn put<T: DeserializeOwned, B: Serialize>(
        &self,
        service: &str,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let client = self.get_client(service)?;
        client.put(path, body).await
    }

    /// Send a DELETE request to a named service.
    pub async fn delete<T: DeserializeOwned>(
        &self,
        service: &str,
        path: &str,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let client = self.get_client(service)?;
        client.delete(path).await
    }

    // ===== V435: Service Health Check & Status Management =====

    /// Check the health of a single service.
    ///
    /// Sends a GET request to the service's `/health` endpoint and returns
    /// whether the service is healthy.
    pub async fn health_check(&self, service: &str) -> Result<ServiceHealth, ServiceClientError> {
        let client = self.get_client(service)?;
        let start = std::time::Instant::now();

        let result = client.get::<serde_json::Value>("/health", None).await;

        let duration_ms = start.elapsed().as_millis() as u64;

        match result {
            Ok(response) => Ok(ServiceHealth {
                service: service.to_string(),
                healthy: response.success,
                status_code: response.status,
                response_time_ms: duration_ms,
                last_checked: chrono::Utc::now().to_rfc3339(),
                error: None,
            }),
            Err(e) => Ok(ServiceHealth {
                service: service.to_string(),
                healthy: false,
                status_code: 0,
                response_time_ms: duration_ms,
                last_checked: chrono::Utc::now().to_rfc3339(),
                error: Some(e.to_string()),
            }),
        }
    }

    /// Check the health of all registered services.
    ///
    /// Returns a map of service name to health status.
    pub async fn health_check_all(&self) -> HashMap<String, ServiceHealth> {
        let services = self.list();
        let mut results = HashMap::new();

        for service in services {
            let health = self
                .health_check(&service)
                .await
                .unwrap_or_else(|e| ServiceHealth {
                    service: service.clone(),
                    healthy: false,
                    status_code: 0,
                    response_time_ms: 0,
                    last_checked: chrono::Utc::now().to_rfc3339(),
                    error: Some(e.to_string()),
                });
            results.insert(service, health);
        }

        results
    }

    /// Get the configuration of a single service.
    pub fn get_service_config(&self, service: &str) -> Result<ServiceConfig, ServiceClientError> {
        let client = self.get_client(service)?;
        Ok(client.config().clone())
    }

    /// Get the configurations of all registered services.
    pub fn get_all_configs(&self) -> Vec<ServiceConfig> {
        let services = self.services.lock().unwrap();
        services.values().map(|c| c.config().clone()).collect()
    }

    /// Update the configuration of a service.
    ///
    /// This will recreate the service client with the new configuration.
    pub fn update_service_config(&self, config: ServiceConfig) -> Result<(), ServiceClientError> {
        if !self.has(&config.name) {
            return Err(ServiceClientError::ServiceNotFound(config.name));
        }
        // Remove old client and register new one
        self.remove(&config.name);
        self.register(config)
    }

    /// Enable a service.
    pub fn enable_service(&self, service: &str) -> Result<(), ServiceClientError> {
        let mut config = self.get_service_config(service)?;
        config.enabled = true;
        self.update_service_config(config)
    }

    /// Disable a service.
    ///
    /// Disabled services will still be registered but should not be used.
    pub fn disable_service(&self, service: &str) -> Result<(), ServiceClientError> {
        let mut config = self.get_service_config(service)?;
        config.enabled = false;
        self.update_service_config(config)
    }

    /// Check if a service is enabled.
    pub fn is_service_enabled(&self, service: &str) -> Result<bool, ServiceClientError> {
        let config = self.get_service_config(service)?;
        Ok(config.enabled)
    }

    /// Get statistics about the service registry.
    pub fn get_statistics(&self) -> ServiceRegistryStatistics {
        let configs = self.get_all_configs();
        let total = configs.len();
        let enabled = configs.iter().filter(|c| c.enabled).count();
        let disabled = total - enabled;

        ServiceRegistryStatistics {
            total_services: total,
            enabled_services: enabled,
            disabled_services: disabled,
            service_names: configs.iter().map(|c| c.name.clone()).collect(),
        }
    }
}

// ===== V435: Service Health & Statistics Types =====

/// Health status of a single service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    /// Service name.
    pub service: String,
    /// Whether the service is healthy.
    pub healthy: bool,
    /// HTTP status code from the health check (0 if request failed).
    pub status_code: u16,
    /// Response time in milliseconds.
    pub response_time_ms: u64,
    /// Timestamp of the last health check (RFC3339 format).
    pub last_checked: String,
    /// Error message if the health check failed.
    pub error: Option<String>,
}

/// Statistics about the service registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceRegistryStatistics {
    /// Total number of registered services.
    pub total_services: usize,
    /// Number of enabled services.
    pub enabled_services: usize,
    /// Number of disabled services.
    pub disabled_services: usize,
    /// List of all registered service names.
    pub service_names: Vec<String>,
}

// ===== Default Service Configurations =====

/// Create default service configurations for all TOPEMS services.
pub fn default_service_configs() -> Vec<ServiceConfig> {
    vec![
        ServiceConfig::new("crm", "http://localhost:8001"),
        ServiceConfig::new("erp", "http://localhost:8002"),
        ServiceConfig::new("finance", "http://localhost:8003"),
        ServiceConfig::new("hr", "http://localhost:8004"),
        ServiceConfig::new("mes", "http://localhost:8005"),
        ServiceConfig::new("ehs", "http://localhost:8006"),
        ServiceConfig::new("wms", "http://localhost:8007"),
        ServiceConfig::new("qms", "http://localhost:8008"),
        ServiceConfig::new("pm", "http://localhost:8009"),
        ServiceConfig::new("lims", "http://localhost:8010"),
        ServiceConfig::new("bi", "http://localhost:8011"),
        ServiceConfig::new("aps", "http://localhost:8012"),
        ServiceConfig::new("cs", "http://localhost:8013"),
        ServiceConfig::new("scm", "http://localhost:8014"),
        ServiceConfig::new("iot", "http://localhost:8015"),
        ServiceConfig::new("oa", "http://localhost:8016"),
    ]
}

/// Create a service registry with all default services registered.
pub fn create_default_registry() -> Result<ServiceRegistry, ServiceClientError> {
    let registry = ServiceRegistry::new();
    registry.register_all(default_service_configs())?;
    Ok(registry)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_config_build_url() {
        let config = ServiceConfig::new("test", "http://localhost:8000/");
        assert_eq!(
            config.build_url("/api/test").unwrap(),
            "http://localhost:8000/api/test"
        );
        assert_eq!(
            config.build_url("api/test").unwrap(),
            "http://localhost:8000/api/test"
        );
    }

    #[test]
    fn test_service_config_build_headers() {
        let config = ServiceConfig::new("test", "http://localhost:8000")
            .with_api_key("test-key")
            .with_header("x-custom", "custom-value");

        let headers = config.build_headers().unwrap();
        assert_eq!(headers.get("x-api-key").unwrap(), "test-key");
        assert_eq!(headers.get("x-custom").unwrap(), "custom-value");
    }

    #[test]
    fn test_service_registry_register_and_get() {
        let registry = ServiceRegistry::new();
        let config = ServiceConfig::new("test", "http://localhost:8000");
        registry.register(config).unwrap();

        assert!(registry.has("test"));
        assert_eq!(registry.count(), 1);
        assert_eq!(registry.list(), vec!["test"]);

        let client = registry.get_client("test").unwrap();
        assert_eq!(client.name(), "test");
    }

    #[test]
    fn test_service_registry_remove() {
        let registry = ServiceRegistry::new();
        let config = ServiceConfig::new("test", "http://localhost:8000");
        registry.register(config).unwrap();

        assert!(registry.has("test"));
        registry.remove("test");
        assert!(!registry.has("test"));
    }

    #[test]
    fn test_service_registry_not_found() {
        let registry = ServiceRegistry::new();
        let result = registry.get_client("nonexistent");
        assert!(matches!(
            result,
            Err(ServiceClientError::ServiceNotFound(_))
        ));
    }

    #[test]
    fn test_default_service_configs() {
        let configs = default_service_configs();
        assert_eq!(configs.len(), 16);
        assert!(configs.iter().any(|c| c.name == "crm"));
        assert!(configs.iter().any(|c| c.name == "erp"));
        assert!(configs.iter().any(|c| c.name == "finance"));
    }
}
