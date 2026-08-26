//! Shared Service Client for unified-core service.
//!
//! Provides a unified client for connecting to multiple real services
//! (CRM, ERP, Finance, HR, MES, EHS, WMS, QMS, PM, LIMS, BI, APS, CS,
//! SCM, IoT, OA, etc.). Supports service registration, request routing,
//! and unified response handling.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

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
    pub fn success(data: T, status: u16, request_id: String, service: String, duration_ms: u64) -> Self {
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
    pub fn error(status: u16, message: String, request_id: String, service: String, duration_ms: u64) -> Self {
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

// ===== Service Client =====

/// Client for making requests to a specific service.
#[derive(Clone)]
pub struct ServiceClient {
    config: ServiceConfig,
    http_client: Client,
}

impl ServiceClient {
    /// Create a new service client from a configuration.
    pub fn new(config: ServiceConfig) -> Result<Self, ServiceClientError> {
        let timeout = Duration::from_secs(config.timeout_secs);
        let http_client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(ServiceClientError::RequestFailed)?;

        Ok(Self {
            config,
            http_client,
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
        self.request(Method::GET, path, query, None::<()>).await
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
        self.request(Method::DELETE, path, None, None::<()>).await
    }

    /// Send a generic request.
    pub async fn request<T: DeserializeOwned, B: Serialize>(
        &self,
        method: Method,
        path: &str,
        query: Option<&HashMap<String, String>>,
        body: Option<&B>,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let start = std::time::Instant::now();
        let request_id = Uuid::new_v4().to_string();
        let service_name = self.config.name.clone();

        // Build URL
        let url = self.config.build_url(path)?;

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
    pub fn get(&self, name: &str) -> Result<ServiceClient, ServiceClientError> {
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
        let client = self.get(service)?;
        client.get(path, query).await
    }

    /// Send a POST request to a named service.
    pub async fn post<T: DeserializeOwned, B: Serialize>(
        &self,
        service: &str,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let client = self.get(service)?;
        client.post(path, body).await
    }

    /// Send a PUT request to a named service.
    pub async fn put<T: DeserializeOwned, B: Serialize>(
        &self,
        service: &str,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let client = self.get(service)?;
        client.put(path, body).await
    }

    /// Send a DELETE request to a named service.
    pub async fn delete<T: DeserializeOwned>(
        &self,
        service: &str,
        path: &str,
    ) -> Result<ServiceResponse<T>, ServiceClientError> {
        let client = self.get(service)?;
        client.delete(path).await
    }

    // ===== V435: Service Health Check & Status Management =====

    /// Check the health of a single service.
    ///
    /// Sends a GET request to the service's `/health` endpoint and returns
    /// whether the service is healthy.
    pub async fn health_check(&self, service: &str) -> Result<ServiceHealth, ServiceClientError> {
        let client = self.get(service)?;
        let start = std::time::Instant::now();

        let result = client
            .get::<serde_json::Value>("/health", None)
            .await;

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
            let health = self.health_check(&service).await.unwrap_or_else(|e| ServiceHealth {
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
        let client = self.get(service)?;
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

        let client = registry.get("test").unwrap();
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
        let result = registry.get("nonexistent");
        assert!(matches!(result, Err(ServiceClientError::ServiceNotFound(_))));
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
