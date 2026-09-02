//! V453: Nacos-based Service Discovery
//!
//! Provides a Nacos-based implementation of the ServiceDiscovery trait.
//! Uses Nacos Open API for service registration, discovery, and heartbeat.
//! Nacos is a dynamic service discovery, configuration management and service
//! management platform developed by Alibaba.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

// ===== Nacos Configuration =====

/// Configuration for Nacos service discovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NacosConfig {
    /// Nacos server address (e.g., "http://localhost:8848").
    pub address: String,
    /// Namespace ID (optional, defaults to "public").
    #[serde(default)]
    pub namespace: Option<String>,
    /// Group name (optional, defaults to "DEFAULT_GROUP").
    #[serde(default = "default_group")]
    pub group: String,
    /// Cluster name (optional, defaults to "DEFAULT").
    #[serde(default = "default_cluster")]
    pub cluster: String,
    /// Username for authentication (optional).
    #[serde(default)]
    pub username: Option<String>,
    /// Password for authentication (optional).
    #[serde(default)]
    pub password: Option<String>,
    /// Request timeout in seconds. Defaults to 10.
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    /// Heartbeat interval in seconds. Defaults to 5.
    #[serde(default = "default_heartbeat_interval")]
    pub heartbeat_interval_secs: u64,
}

fn default_group() -> String {
    "DEFAULT_GROUP".to_string()
}

fn default_cluster() -> String {
    "DEFAULT".to_string()
}

fn default_timeout() -> u64 {
    10
}

fn default_heartbeat_interval() -> u64 {
    5
}

impl Default for NacosConfig {
    fn default() -> Self {
        Self {
            address: "http://localhost:8848".to_string(),
            namespace: None,
            group: default_group(),
            cluster: default_cluster(),
            username: None,
            password: None,
            timeout_secs: default_timeout(),
            heartbeat_interval_secs: default_heartbeat_interval(),
        }
    }
}

// ===== Nacos API Types =====

/// Nacos instance registration request parameters.
#[derive(Debug, Clone, Serialize)]
struct NacosRegisterRequest {
    ip: String,
    port: u16,
    #[serde(rename = "serviceName")]
    service_name: String,
    #[serde(rename = "groupName")]
    group_name: String,
    #[serde(rename = "clusterName")]
    cluster_name: String,
    #[serde(rename = "namespaceId")]
    namespace_id: Option<String>,
    weight: f64,
    enabled: bool,
    healthy: bool,
    ephemeral: bool,
    metadata: String,
}

/// Nacos instance deregistration request parameters.
#[derive(Debug, Clone, Serialize)]
struct NacosDeregisterRequest {
    ip: String,
    port: u16,
    #[serde(rename = "serviceName")]
    service_name: String,
    #[serde(rename = "groupName")]
    group_name: String,
    #[serde(rename = "clusterName")]
    cluster_name: String,
    #[serde(rename = "namespaceId")]
    namespace_id: Option<String>,
    ephemeral: bool,
}

/// Nacos instance list response.
#[derive(Debug, Clone, Deserialize)]
struct NacosInstanceListResponse {
    #[serde(default)]
    hosts: Option<Vec<NacosInstance>>,
    #[serde(default)]
    count: Option<i64>,
}

/// Nacos instance information.
#[derive(Debug, Clone, Deserialize)]
struct NacosInstance {
    ip: String,
    port: u16,
    weight: f64,
    healthy: bool,
    enabled: bool,
    ephemeral: bool,
    #[serde(default)]
    metadata: Option<HashMap<String, String>>,
    #[serde(default)]
    #[serde(rename = "clusterName")]
    cluster_name: Option<String>,
    #[serde(default)]
    #[serde(rename = "serviceName")]
    service_name: Option<String>,
}

/// Nacos heartbeat request.
#[derive(Debug, Clone, Serialize)]
struct NacosBeatRequest {
    #[serde(rename = "serviceName")]
    service_name: String,
    ip: String,
    port: u16,
    weight: f64,
    #[serde(rename = "clusterName")]
    cluster_name: String,
    metadata: String,
    ephemeral: bool,
}

/// Service metadata stored in Nacos instance metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct NacosServiceMetadata {
    name: String,
    base_url: String,
    version: String,
    description: String,
    tags: Vec<String>,
    enabled: bool,
    registered_at: String,
    last_heartbeat: String,
}

// ===== Nacos Service Discovery Implementation =====

/// Nacos-based service discovery implementation.
///
/// Uses Nacos Open API for service registration and discovery. Services are
/// registered as ephemeral instances with heartbeat for health checking.
///
/// # Example
///
/// ```rust
/// use topems_unified_core::shared::nacos_service_discovery::{NacosConfig, NacosServiceDiscovery};
/// use topems_unified_core::shared::service_client::{ServiceDiscovery, ServiceRegistration};
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let config = NacosConfig {
///     address: "http://localhost:8848".to_string(),
///     ..Default::default()
/// };
///
/// let discovery = NacosServiceDiscovery::new(config)?;
///
/// // Register a service
/// let registration = ServiceRegistration::new("crm", "http://localhost:8001");
/// discovery.register(registration).await?;
///
/// // Discover a service
/// let service = discovery.discover("crm").await?;
/// println!("Found service: {:?}", service);
///
/// # Ok(())
/// # }
/// ```
pub struct NacosServiceDiscovery {
    config: NacosConfig,
    http_client: Client,
    /// Registered service info (for heartbeat and deregistration).
    registered_services: Arc<std::sync::Mutex<HashMap<String, RegisteredServiceInfo>>>,
}

/// Information about a registered service.
#[derive(Debug, Clone)]
struct RegisteredServiceInfo {
    name: String,
    ip: String,
    port: u16,
    base_url: String,
}

impl NacosServiceDiscovery {
    /// Create a new Nacos service discovery instance.
    pub fn new(config: NacosConfig) -> Result<Self, ServiceClientError> {
        let timeout = Duration::from_secs(config.timeout_secs);
        let http_client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(ServiceClientError::RequestFailed)?;

        Ok(Self {
            config,
            http_client,
            registered_services: Arc::new(std::sync::Mutex::new(HashMap::new())),
        })
    }

    /// Build the Nacos API URL for a given path.
    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.config.address.trim_end_matches('/'), path)
    }

    /// Build common query parameters.
    fn common_params(&self) -> Vec<(String, String)> {
        let mut params = Vec::new();
        params.push(("groupName".to_string(), self.config.group.clone()));
        params.push(("clusterName".to_string(), self.config.cluster.clone()));
        if let Some(ns) = &self.config.namespace {
            params.push(("namespaceId".to_string(), ns.clone()));
        }
        params
    }

    /// Extract host and port from a base URL.
    fn extract_host_port(base_url: &str) -> Result<(String, u16), ServiceClientError> {
        let url = url::Url::parse(base_url)
            .map_err(|e| ServiceClientError::InvalidUrl(format!("Invalid URL: {}", e)))?;
        let host = url
            .host_str()
            .ok_or_else(|| ServiceClientError::InvalidUrl("No host in URL".to_string()))?
            .to_string();
        let port = url.port_or_known_default().unwrap_or(80);
        Ok((host, port))
    }

    /// Encode service metadata as JSON string.
    fn encode_metadata(registration: &ServiceRegistration) -> String {
        let metadata = NacosServiceMetadata {
            name: registration.name.clone(),
            base_url: registration.base_url.clone(),
            version: registration.version.clone(),
            description: registration.description.clone(),
            tags: registration.tags.clone(),
            enabled: registration.enabled,
            registered_at: registration.registered_at.clone(),
            last_heartbeat: registration.last_heartbeat.clone(),
        };
        serde_json::to_string(&metadata).unwrap_or_default()
    }

    /// Decode service metadata from JSON string.
    fn decode_metadata(metadata_str: &str) -> Option<NacosServiceMetadata> {
        serde_json::from_str(metadata_str).ok()
    }

    /// Convert a Nacos instance to ServiceRegistration.
    fn instance_to_registration(instance: &NacosInstance) -> ServiceRegistration {
        let base_url = if let Some(metadata) = &instance.metadata {
            if let Some(meta_str) = metadata.get("base_url") {
                meta_str.clone()
            } else {
                format!("http://{}:{}", instance.ip, instance.port)
            }
        } else {
            format!("http://{}:{}", instance.ip, instance.port)
        };

        let (version, description, tags) = if let Some(metadata) = &instance.metadata {
            let version = metadata
                .get("version")
                .cloned()
                .unwrap_or_else(|| "1.0.0".to_string());
            let description = metadata.get("description").cloned().unwrap_or_default();
            let tags = metadata
                .get("tags")
                .and_then(|t| serde_json::from_str(t).ok())
                .unwrap_or_default();
            (version, description, tags)
        } else {
            ("1.0.0".to_string(), String::new(), Vec::new())
        };

        ServiceRegistration {
            name: instance.service_name.clone().unwrap_or_default(),
            base_url,
            version,
            description,
            tags,
            metadata: instance.metadata.clone().unwrap_or_default(),
            enabled: instance.enabled,
            registered_at: chrono::Utc::now().to_rfc3339(),
            last_heartbeat: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[async_trait]
impl ServiceDiscovery for NacosServiceDiscovery {
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        let (ip, port) = Self::extract_host_port(&registration.base_url)?;

        let mut params = self.common_params();
        params.push(("ip".to_string(), ip.clone()));
        params.push(("port".to_string(), port.to_string()));
        params.push(("serviceName".to_string(), registration.name.clone()));
        params.push(("weight".to_string(), "1.0".to_string()));
        params.push(("enabled".to_string(), registration.enabled.to_string()));
        params.push(("healthy".to_string(), "true".to_string()));
        params.push(("ephemeral".to_string(), "true".to_string()));
        params.push(("metadata".to_string(), Self::encode_metadata(&registration)));

        let url = self.build_url("/nacos/v1/ns/instance");
        let response = self
            .http_client
            .post(&url)
            .form(&params)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to register service with Nacos: {} - {}",
                status, body
            )));
        }

        // Track registered service
        self.registered_services.lock().unwrap().insert(
            registration.name.clone(),
            RegisteredServiceInfo {
                name: registration.name.clone(),
                ip,
                port,
                base_url: registration.base_url,
            },
        );

        Ok(())
    }

    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError> {
        let service_info = { self.registered_services.lock().unwrap().get(name).cloned() };

        let Some(info) = service_info else {
            return Err(ServiceClientError::ServiceNotFound(name.to_string()));
        };

        let mut params = self.common_params();
        params.push(("ip".to_string(), info.ip));
        params.push(("port".to_string(), info.port.to_string()));
        params.push(("serviceName".to_string(), name.to_string()));
        params.push(("ephemeral".to_string(), "true".to_string()));

        let url = self.build_url("/nacos/v1/ns/instance");
        let response = self
            .http_client
            .delete(&url)
            .query(&params)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to deregister service from Nacos: {} - {}",
                status, body
            )));
        }

        // Remove from tracking
        self.registered_services.lock().unwrap().remove(name);

        Ok(())
    }

    async fn discover(
        &self,
        name: &str,
    ) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let mut params = self.common_params();
        params.push(("serviceName".to_string(), name.to_string()));
        params.push(("healthyOnly".to_string(), "true".to_string()));

        let url = self.build_url("/nacos/v1/ns/instance/list");
        let response = self
            .http_client
            .get(&url)
            .query(&params)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Ok(None);
        }

        let list_response: NacosInstanceListResponse = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let Some(hosts) = list_response.hosts else {
            return Ok(None);
        };

        // Return the first healthy instance
        for instance in &hosts {
            if instance.healthy && instance.enabled {
                return Ok(Some(Self::instance_to_registration(instance)));
            }
        }

        // If no healthy instances, return the first one
        Ok(hosts.first().map(Self::instance_to_registration))
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        // Nacos doesn't have a direct "list all services" API in the same way.
        // We return the registered services we know about.
        // For a full implementation, we'd need to query the service list API.
        let registered = self.registered_services.lock().unwrap().clone();
        let mut services = Vec::new();

        for (name, _) in registered {
            if let Some(service) = self.discover(&name).await? {
                services.push(service);
            }
        }

        Ok(services)
    }

    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError> {
        let service_info = { self.registered_services.lock().unwrap().get(name).cloned() };

        let Some(info) = service_info else {
            return Err(ServiceClientError::ServiceNotFound(name.to_string()));
        };

        let beat = NacosBeatRequest {
            service_name: name.to_string(),
            ip: info.ip,
            port: info.port,
            weight: 1.0,
            cluster_name: self.config.cluster.clone(),
            metadata: String::new(),
            ephemeral: true,
        };

        let beat_json = serde_json::to_string(&beat)
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let mut params = self.common_params();
        params.push(("serviceName".to_string(), name.to_string()));
        params.push(("beat".to_string(), beat_json));

        let url = self.build_url("/nacos/v1/ns/instance/beat");
        let response = self
            .http_client
            .put(&url)
            .form(&params)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to send heartbeat to Nacos: {} - {}",
                status, body
            )));
        }

        Ok(())
    }
}

// ===== Nacos Service Discovery Builder =====

/// Builder for NacosServiceDiscovery.
pub struct NacosServiceDiscoveryBuilder {
    config: NacosConfig,
}

impl NacosServiceDiscoveryBuilder {
    /// Create a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: NacosConfig::default(),
        }
    }

    /// Set the Nacos server address.
    pub fn address(mut self, address: impl Into<String>) -> Self {
        self.config.address = address.into();
        self
    }

    /// Set the namespace ID.
    pub fn namespace(mut self, namespace: impl Into<String>) -> Self {
        self.config.namespace = Some(namespace.into());
        self
    }

    /// Set the group name.
    pub fn group(mut self, group: impl Into<String>) -> Self {
        self.config.group = group.into();
        self
    }

    /// Set the cluster name.
    pub fn cluster(mut self, cluster: impl Into<String>) -> Self {
        self.config.cluster = cluster.into();
        self
    }

    /// Set the username for authentication.
    pub fn username(mut self, username: impl Into<String>) -> Self {
        self.config.username = Some(username.into());
        self
    }

    /// Set the password for authentication.
    pub fn password(mut self, password: impl Into<String>) -> Self {
        self.config.password = Some(password.into());
        self
    }

    /// Set the request timeout in seconds.
    pub fn timeout_secs(mut self, timeout: u64) -> Self {
        self.config.timeout_secs = timeout;
        self
    }

    /// Set the heartbeat interval in seconds.
    pub fn heartbeat_interval_secs(mut self, interval: u64) -> Self {
        self.config.heartbeat_interval_secs = interval;
        self
    }

    /// Build the NacosServiceDiscovery instance.
    pub fn build(self) -> Result<NacosServiceDiscovery, ServiceClientError> {
        NacosServiceDiscovery::new(self.config)
    }
}

impl Default for NacosServiceDiscoveryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nacos_config_default() {
        let config = NacosConfig::default();
        assert_eq!(config.address, "http://localhost:8848");
        assert_eq!(config.group, "DEFAULT_GROUP");
        assert_eq!(config.cluster, "DEFAULT");
        assert_eq!(config.timeout_secs, 10);
        assert_eq!(config.heartbeat_interval_secs, 5);
    }

    #[test]
    fn test_extract_host_port() {
        let (host, port) =
            NacosServiceDiscovery::extract_host_port("http://localhost:8001").unwrap();
        assert_eq!(host, "localhost");
        assert_eq!(port, 8001);
    }

    #[test]
    fn test_extract_host_port_default_http() {
        let (host, port) = NacosServiceDiscovery::extract_host_port("http://example.com").unwrap();
        assert_eq!(host, "example.com");
        assert_eq!(port, 80);
    }

    #[test]
    fn test_encode_metadata() {
        let registration = ServiceRegistration::new("crm", "http://localhost:8001");
        let metadata = NacosServiceDiscovery::encode_metadata(&registration);
        assert!(metadata.contains("crm"));
        assert!(metadata.contains("http://localhost:8001"));
    }

    #[test]
    fn test_decode_metadata() {
        let json = r#"{"name":"crm","base_url":"http://localhost:8001","version":"1.0.0","description":"","tags":[],"enabled":true,"registered_at":"2026-01-01T00:00:00Z","last_heartbeat":"2026-01-01T00:00:00Z"}"#;
        let metadata = NacosServiceDiscovery::decode_metadata(json).unwrap();
        assert_eq!(metadata.name, "crm");
        assert_eq!(metadata.base_url, "http://localhost:8001");
    }

    #[test]
    fn test_build_url() {
        let config = NacosConfig::default();
        let discovery = NacosServiceDiscovery::new(config).unwrap();
        let url = discovery.build_url("/nacos/v1/ns/instance");
        assert_eq!(url, "http://localhost:8848/nacos/v1/ns/instance");
    }

    #[test]
    fn test_common_params() {
        let config = NacosConfig {
            namespace: Some("test-ns".to_string()),
            ..Default::default()
        };
        let discovery = NacosServiceDiscovery::new(config).unwrap();
        let params = discovery.common_params();
        assert!(params.iter().any(|(k, _)| k == "groupName"));
        assert!(params.iter().any(|(k, _)| k == "clusterName"));
        assert!(params.iter().any(|(k, _)| k == "namespaceId"));
    }

    #[test]
    fn test_builder() {
        let discovery = NacosServiceDiscoveryBuilder::new()
            .address("http://nacos:8848")
            .namespace("prod")
            .group("MY_GROUP")
            .cluster("MY_CLUSTER")
            .username("nacos")
            .password("nacos")
            .timeout_secs(15)
            .heartbeat_interval_secs(10)
            .build();

        assert!(discovery.is_ok());
    }

    #[test]
    fn test_instance_to_registration() {
        let instance = NacosInstance {
            ip: "127.0.0.1".to_string(),
            port: 8001,
            weight: 1.0,
            healthy: true,
            enabled: true,
            ephemeral: true,
            metadata: Some(HashMap::new()),
            cluster_name: Some("DEFAULT".to_string()),
            service_name: Some("crm".to_string()),
        };

        let registration = NacosServiceDiscovery::instance_to_registration(&instance);
        assert_eq!(registration.name, "crm");
        assert!(registration.base_url.contains("127.0.0.1"));
        assert!(registration.base_url.contains("8001"));
    }
}
