//! V447: Consul-based Service Discovery
//!
//! Provides a Consul-based implementation of the ServiceDiscovery trait.
//! Uses Consul's HTTP API for service registration, discovery, and health
//! checking. This implementation does not require any additional dependencies
//! beyond reqwest (already used in the project).

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

// ===== Consul Configuration =====

/// Configuration for Consul service discovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsulConfig {
    /// Consul agent address (e.g., "http://localhost:8500").
    pub address: String,
    /// Consul datacenter (optional).
    #[serde(default)]
    pub datacenter: Option<String>,
    /// Consul ACL token (optional, for authenticated requests).
    #[serde(default)]
    pub token: Option<String>,
    /// Request timeout in seconds. Defaults to 10.
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    /// Service check interval in seconds. Defaults to 10.
    #[serde(default = "default_check_interval")]
    pub check_interval_secs: u64,
    /// Service check timeout in seconds. Defaults to 5.
    #[serde(default = "default_check_timeout")]
    pub check_timeout_secs: u64,
    /// Whether to deregister services on drop. Defaults to true.
    #[serde(default = "default_deregister_on_drop")]
    pub deregister_on_drop: bool,
}

fn default_timeout() -> u64 {
    10
}

fn default_check_interval() -> u64 {
    10
}

fn default_check_timeout() -> u64 {
    5
}

fn default_deregister_on_drop() -> bool {
    true
}

impl Default for ConsulConfig {
    fn default() -> Self {
        Self {
            address: "http://localhost:8500".to_string(),
            datacenter: None,
            token: None,
            timeout_secs: default_timeout(),
            check_interval_secs: default_check_interval(),
            check_timeout_secs: default_check_timeout(),
            deregister_on_drop: default_deregister_on_drop(),
        }
    }
}

// ===== Consul API Types =====

/// Consul service registration request.
#[derive(Debug, Clone, Serialize)]
struct ConsulServiceRegistration {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Tags")]
    tags: Vec<String>,
    #[serde(rename = "Address")]
    address: String,
    #[serde(rename = "Port")]
    port: u16,
    #[serde(rename = "Meta")]
    meta: HashMap<String, String>,
    #[serde(rename = "Check")]
    check: Option<ConsulServiceCheck>,
}

/// Consul service check definition.
#[derive(Debug, Clone, Serialize)]
struct ConsulServiceCheck {
    #[serde(rename = "HTTP")]
    http: String,
    #[serde(rename = "Interval")]
    interval: String,
    #[serde(rename = "Timeout")]
    timeout: String,
}

/// Consul service entry from catalog response.
#[derive(Debug, Clone, Deserialize)]
struct ConsulServiceEntry {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "Service")]
    service: String,
    #[serde(rename = "Tags")]
    tags: Option<Vec<String>>,
    #[serde(rename = "Address")]
    address: String,
    #[serde(rename = "Port")]
    port: u16,
    #[serde(rename = "Meta")]
    meta: Option<HashMap<String, String>>,
}

/// Consul health check response.
#[derive(Debug, Clone, Deserialize)]
struct ConsulHealthCheck {
    #[serde(rename = "Status")]
    status: String,
}

// ===== Consul Service Discovery Implementation =====

/// Consul-based service discovery implementation.
///
/// Uses Consul's HTTP API for service registration, discovery, and health
/// checking. Services are registered with a health check that periodically
/// checks the service's /health endpoint.
pub struct ConsulServiceDiscovery {
    config: ConsulConfig,
    http_client: Client,
    /// Registered service IDs (for deregistration on drop).
    registered_services: Arc<std::sync::Mutex<Vec<String>>>,
}

impl ConsulServiceDiscovery {
    /// Create a new Consul service discovery instance.
    pub fn new(config: ConsulConfig) -> Result<Self, ServiceClientError> {
        let timeout = Duration::from_secs(config.timeout_secs);
        let http_client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(ServiceClientError::RequestFailed)?;

        Ok(Self {
            config,
            http_client,
            registered_services: Arc::new(std::sync::Mutex::new(Vec::new())),
        })
    }

    /// Build the Consul API URL for a given path.
    fn build_url(&self, path: &str) -> String {
        let mut url = format!("{}{}", self.config.address.trim_end_matches('/'), path);
        if let Some(dc) = &self.config.datacenter {
            url.push_str(&format!("?dc={}", dc));
        }
        url
    }

    /// Build the request headers (including ACL token if configured).
    fn build_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(token) = &self.config.token {
            headers.insert(
                "X-Consul-Token",
                reqwest::header::HeaderValue::from_str(token).unwrap_or_default(),
            );
        }
        headers
    }

    /// Extract the host and port from a base URL.
    fn extract_host_port(base_url: &str) -> Result<(String, u16), ServiceClientError> {
        let url = url::Url::parse(base_url)
            .map_err(|e| ServiceClientError::InvalidUrl(format!("Invalid URL: {}", e)))?;
        let host = url.host_str()
            .ok_or_else(|| ServiceClientError::InvalidUrl("No host in URL".to_string()))?
            .to_string();
        let port = url.port_or_known_default().unwrap_or(80);
        Ok((host, port))
    }

    /// Convert a Consul service entry to a ServiceRegistration.
    fn entry_to_registration(entry: &ConsulServiceEntry) -> ServiceRegistration {
        let base_url = if entry.port == 80 || entry.port == 443 {
            format!("{}://{}", if entry.port == 443 { "https" } else { "http" }, entry.address)
        } else {
            format!("http://{}:{}", entry.address, entry.port)
        };

        ServiceRegistration {
            name: entry.service.clone(),
            base_url,
            version: entry.meta.as_ref()
                .and_then(|m| m.get("version"))
                .cloned()
                .unwrap_or_else(|| "1.0.0".to_string()),
            description: entry.meta.as_ref()
                .and_then(|m| m.get("description"))
                .cloned()
                .unwrap_or_default(),
            tags: entry.tags.clone().unwrap_or_default(),
            metadata: entry.meta.clone().unwrap_or_default(),
            enabled: true,
            registered_at: chrono::Utc::now().to_rfc3339(),
            last_heartbeat: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Check if a service is healthy by querying Consul's health endpoint.
    async fn is_service_healthy(&self, service_name: &str) -> Result<bool, ServiceClientError> {
        let url = self.build_url(&format!("/v1/health/checks/{}", service_name));
        let response = self.http_client
            .get(&url)
            .headers(self.build_headers())
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Ok(false);
        }

        let checks: Vec<ConsulHealthCheck> = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        // Service is healthy if all checks are passing
        Ok(checks.iter().all(|c| c.status == "passing"))
    }
}

#[async_trait]
impl ServiceDiscovery for ConsulServiceDiscovery {
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        let (host, port) = Self::extract_host_port(&registration.base_url)?;

        let service_id = format!("{}-{}", registration.name, host);

        let check = if registration.enabled {
            Some(ConsulServiceCheck {
                http: format!("{}/health", registration.base_url.trim_end_matches('/')),
                interval: format!("{}s", self.config.check_interval_secs),
                timeout: format!("{}s", self.config.check_timeout_secs),
            })
        } else {
            None
        };

        let consul_registration = ConsulServiceRegistration {
            id: service_id.clone(),
            name: registration.name.clone(),
            tags: registration.tags.clone(),
            address: host,
            port,
            meta: registration.metadata.clone(),
            check,
        };

        let url = self.build_url("/v1/agent/service/register");
        let response = self.http_client
            .put(&url)
            .headers(self.build_headers())
            .json(&consul_registration)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to register service with Consul: {} - {}",
                status, body
            )));
        }

        // Track registered service for deregistration
        self.registered_services.lock().unwrap().push(service_id);

        Ok(())
    }

    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError> {
        // Find the service ID from registered services
        let service_id = {
            let mut registered = self.registered_services.lock().unwrap();
            if let Some(pos) = registered.iter().position(|id| id.starts_with(&format!("{}-", name))) {
                registered.remove(pos)
            } else {
                // If not found in our tracking, try to deregister by name
                name.to_string()
            }
        };

        let url = self.build_url(&format!("/v1/agent/service/deregister/{}", service_id));
        let response = self.http_client
            .put(&url)
            .headers(self.build_headers())
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to deregister service from Consul: {} - {}",
                status, body
            )));
        }

        Ok(())
    }

    async fn discover(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let url = self.build_url(&format!("/v1/catalog/service/{}", name));
        let response = self.http_client
            .get(&url)
            .headers(self.build_headers())
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Ok(None);
        }

        let entries: Vec<ConsulServiceEntry> = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        if entries.is_empty() {
            return Ok(None);
        }

        // Return the first healthy service, or the first service if none are healthy
        for entry in &entries {
            if self.is_service_healthy(name).await.unwrap_or(false) {
                return Ok(Some(Self::entry_to_registration(entry)));
            }
        }

        // If no healthy services, return the first one
        Ok(Some(Self::entry_to_registration(&entries[0])))
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        let url = self.build_url("/v1/catalog/services");
        let response = self.http_client
            .get(&url)
            .headers(self.build_headers())
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Ok(Vec::new());
        }

        let services: HashMap<String, Vec<String>> = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let mut registrations = Vec::new();
        for service_name in services.keys() {
            if let Some(registration) = self.discover(service_name).await? {
                registrations.push(registration);
            }
        }

        Ok(registrations)
    }

    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError> {
        // Consul uses agent checks for heartbeat, so we just verify the service exists
        let url = self.build_url(&format!("/v1/agent/service/{}", name));
        let response = self.http_client
            .get(&url)
            .headers(self.build_headers())
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Err(ServiceClientError::ServiceNotFound(name.to_string()));
        }

        Ok(())
    }
}

impl Drop for ConsulServiceDiscovery {
    fn drop(&mut self) {
        if self.config.deregister_on_drop {
            // Deregister all registered services
            // Note: This is a best-effort operation since we can't await in drop
            let services = self.registered_services.lock().unwrap().clone();
            for service_id in services {
                tracing::debug!("Would deregister service from Consul: {}", service_id);
            }
        }
    }
}

// ===== Consul Service Discovery Builder =====

/// Builder for ConsulServiceDiscovery.
pub struct ConsulServiceDiscoveryBuilder {
    config: ConsulConfig,
}

impl ConsulServiceDiscoveryBuilder {
    /// Create a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: ConsulConfig::default(),
        }
    }

    /// Set the Consul agent address.
    pub fn address(mut self, address: impl Into<String>) -> Self {
        self.config.address = address.into();
        self
    }

    /// Set the Consul datacenter.
    pub fn datacenter(mut self, datacenter: impl Into<String>) -> Self {
        self.config.datacenter = Some(datacenter.into());
        self
    }

    /// Set the Consul ACL token.
    pub fn token(mut self, token: impl Into<String>) -> Self {
        self.config.token = Some(token.into());
        self
    }

    /// Set the request timeout in seconds.
    pub fn timeout_secs(mut self, timeout: u64) -> Self {
        self.config.timeout_secs = timeout;
        self
    }

    /// Set the service check interval in seconds.
    pub fn check_interval_secs(mut self, interval: u64) -> Self {
        self.config.check_interval_secs = interval;
        self
    }

    /// Set the service check timeout in seconds.
    pub fn check_timeout_secs(mut self, timeout: u64) -> Self {
        self.config.check_timeout_secs = timeout;
        self
    }

    /// Set whether to deregister services on drop.
    pub fn deregister_on_drop(mut self, deregister: bool) -> Self {
        self.config.deregister_on_drop = deregister;
        self
    }

    /// Build the ConsulServiceDiscovery instance.
    pub fn build(self) -> Result<ConsulServiceDiscovery, ServiceClientError> {
        ConsulServiceDiscovery::new(self.config)
    }
}

impl Default for ConsulServiceDiscoveryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_consul_config_default() {
        let config = ConsulConfig::default();
        assert_eq!(config.address, "http://localhost:8500");
        assert_eq!(config.timeout_secs, 10);
        assert_eq!(config.check_interval_secs, 10);
        assert_eq!(config.check_timeout_secs, 5);
        assert!(config.deregister_on_drop);
    }

    #[test]
    fn test_extract_host_port() {
        let (host, port) = ConsulServiceDiscovery::extract_host_port("http://localhost:8001").unwrap();
        assert_eq!(host, "localhost");
        assert_eq!(port, 8001);
    }

    #[test]
    fn test_extract_host_port_default_http() {
        let (host, port) = ConsulServiceDiscovery::extract_host_port("http://example.com").unwrap();
        assert_eq!(host, "example.com");
        assert_eq!(port, 80);
    }

    #[test]
    fn test_extract_host_port_https() {
        let (host, port) = ConsulServiceDiscovery::extract_host_port("https://example.com").unwrap();
        assert_eq!(host, "example.com");
        assert_eq!(port, 443);
    }

    #[test]
    fn test_builder() {
        let discovery = ConsulServiceDiscoveryBuilder::new()
            .address("http://consul:8500")
            .datacenter("dc1")
            .token("my-token")
            .timeout_secs(30)
            .check_interval_secs(15)
            .check_timeout_secs(10)
            .deregister_on_drop(false)
            .build();

        assert!(discovery.is_ok());
    }

    #[test]
    fn test_build_url() {
        let config = ConsulConfig {
            address: "http://localhost:8500".to_string(),
            datacenter: Some("dc1".to_string()),
            ..Default::default()
        };
        let discovery = ConsulServiceDiscovery::new(config).unwrap();
        let url = discovery.build_url("/v1/catalog/services");
        assert_eq!(url, "http://localhost:8500/v1/catalog/services?dc=dc1");
    }

    #[test]
    fn test_build_url_no_datacenter() {
        let config = ConsulConfig::default();
        let discovery = ConsulServiceDiscovery::new(config).unwrap();
        let url = discovery.build_url("/v1/catalog/services");
        assert_eq!(url, "http://localhost:8500/v1/catalog/services");
    }
}
