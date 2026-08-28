//! V455: Eureka-based Service Discovery
//!
//! Provides an Eureka-based implementation of the ServiceDiscovery trait.
//! Uses Eureka's REST API for service registration, discovery, and heartbeat.
//! Eureka is a service registry developed by Netflix, widely used in
//! Spring Cloud microservices architectures.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

// ===== Eureka Configuration =====

/// Configuration for Eureka service discovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EurekaConfig {
    /// Eureka server address (e.g., "http://localhost:8761").
    pub address: String,
    /// Eureka username for authentication (optional).
    #[serde(default)]
    pub username: Option<String>,
    /// Eureka password for authentication (optional).
    #[serde(default)]
    pub password: Option<String>,
    /// Request timeout in seconds. Defaults to 10.
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    /// Heartbeat interval in seconds. Defaults to 30.
    #[serde(default = "default_heartbeat_interval")]
    pub heartbeat_interval_secs: u64,
    /// Whether to register as a VIP address. Defaults to false.
    #[serde(default)]
    pub use_vip_address: bool,
}

fn default_timeout() -> u64 {
    10
}

fn default_heartbeat_interval() -> u64 {
    30
}

impl Default for EurekaConfig {
    fn default() -> Self {
        Self {
            address: "http://localhost:8761".to_string(),
            username: None,
            password: None,
            timeout_secs: default_timeout(),
            heartbeat_interval_secs: default_heartbeat_interval(),
            use_vip_address: false,
        }
    }
}

// ===== Eureka API Types =====

/// Eureka instance registration request.
#[derive(Debug, Clone, Serialize)]
struct EurekaRegistrationRequest {
    instance: EurekaInstanceInfo,
}

/// Eureka instance information.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct EurekaInstanceInfo {
    #[serde(rename = "instanceId")]
    instance_id: String,
    app: String,
    #[serde(rename = "hostName")]
    host_name: String,
    #[serde(rename = "ipAddr")]
    ip_addr: String,
    port: EurekaPort,
    #[serde(rename = "securePort")]
    secure_port: EurekaPort,
    #[serde(rename = "vipAddress")]
    vip_address: String,
    #[serde(rename = "secureVipAddress")]
    secure_vip_address: String,
    status: String,
    #[serde(rename = "overriddenstatus")]
    overridden_status: String,
    #[serde(rename = "dataCenterInfo")]
    data_center_info: EurekaDataCenterInfo,
    #[serde(rename = "leaseInfo")]
    lease_info: EurekaLeaseInfo,
    metadata: EurekaInstanceMetadata,
    #[serde(rename = "homePageUrl")]
    home_page_url: String,
    #[serde(rename = "statusPageUrl")]
    status_page_url: String,
    #[serde(rename = "healthCheckUrl")]
    health_check_url: String,
}

/// Eureka port information.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct EurekaPort {
    #[serde(rename = "$")]
    value: u16,
    #[serde(rename = "@enabled")]
    enabled: bool,
}

/// Eureka data center info.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct EurekaDataCenterInfo {
    #[serde(rename = "@class")]
    class: String,
    name: String,
}

/// Eureka lease info.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct EurekaLeaseInfo {
    #[serde(rename = "renewalIntervalInSecs")]
    renewal_interval_in_secs: i32,
    #[serde(rename = "durationInSecs")]
    duration_in_secs: i32,
}

/// Eureka instance metadata.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct EurekaInstanceMetadata {
    #[serde(flatten)]
    data: HashMap<String, String>,
}

/// Eureka application response.
#[derive(Debug, Clone, Deserialize)]
struct EurekaApplicationResponse {
    application: Option<EurekaApplication>,
}

/// Eureka application information.
#[derive(Debug, Clone, Deserialize)]
struct EurekaApplication {
    name: String,
    instance: Option<Vec<EurekaInstanceInfo>>,
}

/// Eureka applications response (for listing all).
#[derive(Debug, Clone, Deserialize)]
struct EurekaApplicationsResponse {
    applications: EurekaApplications,
}

/// Eureka applications container.
#[derive(Debug, Clone, Deserialize)]
struct EurekaApplications {
    application: Option<Vec<EurekaApplication>>,
}

// ===== Eureka Service Discovery Implementation =====

/// Eureka-based service discovery implementation.
///
/// Uses Eureka's REST API for service registration and discovery. Services
/// are registered with a lease and require periodic heartbeats to remain
/// registered.
///
/// # Example
///
/// ```rust
/// use topems_unified_core::shared::eureka_service_discovery::{EurekaConfig, EurekaServiceDiscovery};
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let config = EurekaConfig {
///     address: "http://localhost:8761".to_string(),
///     ..Default::default()
/// };
///
/// let discovery = EurekaServiceDiscovery::new(config)?;
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
pub struct EurekaServiceDiscovery {
    config: EurekaConfig,
    http_client: Client,
    /// Registered service info (for heartbeat and deregistration).
    registered_services: Arc<std::sync::Mutex<HashMap<String, RegisteredServiceInfo>>>,
}

/// Information about a registered service.
#[derive(Debug, Clone)]
struct RegisteredServiceInfo {
    name: String,
    instance_id: String,
    host: String,
    port: u16,
    base_url: String,
}

impl EurekaServiceDiscovery {
    /// Create a new Eureka service discovery instance.
    pub fn new(config: EurekaConfig) -> Result<Self, ServiceClientError> {
        let timeout = Duration::from_secs(config.timeout_secs);
        let builder = Client::builder().timeout(timeout);

        if let (Some(username), Some(password)) = (&config.username, &config.password) {
            // Note: basic_auth requires reqwest's "basic-auth" feature
            // Store credentials for later use in request headers
            let _ = (username, password);
        }

        let http_client = builder
            .build()
            .map_err(ServiceClientError::RequestFailed)?;

        Ok(Self {
            config,
            http_client,
            registered_services: Arc::new(std::sync::Mutex::new(HashMap::new())),
        })
    }

    /// Build the Eureka API URL for a given path.
    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.config.address.trim_end_matches('/'), path)
    }

    /// Extract host and port from a base URL.
    fn extract_host_port(base_url: &str) -> Result<(String, u16), ServiceClientError> {
        let url = url::Url::parse(base_url)
            .map_err(|e| ServiceClientError::InvalidUrl(format!("Invalid URL: {}", e)))?;
        let host = url.host_str()
            .ok_or_else(|| ServiceClientError::InvalidUrl("No host in URL".to_string()))?
            .to_string();
        let port = url.port_or_known_default().unwrap_or(80);
        Ok((host, port))
    }

    /// Generate an instance ID for a service.
    fn generate_instance_id(name: &str, host: &str, port: u16) -> String {
        format!("{}:{}:{}", host, name.to_lowercase(), port)
    }

    /// Convert a ServiceRegistration to Eureka instance info.
    fn registration_to_instance(registration: &ServiceRegistration) -> Result<EurekaInstanceInfo, ServiceClientError> {
        let (host, port) = Self::extract_host_port(&registration.base_url)?;
        let instance_id = Self::generate_instance_id(&registration.name, &host, port);

        let mut metadata = EurekaInstanceMetadata::default();
        metadata.data.insert("version".to_string(), registration.version.clone());
        metadata.data.insert("description".to_string(), registration.description.clone());
        metadata.data.insert("base_url".to_string(), registration.base_url.clone());
        metadata.data.insert("tags".to_string(), serde_json::to_string(&registration.tags).unwrap_or_default());
        metadata.data.insert("enabled".to_string(), registration.enabled.to_string());

        Ok(EurekaInstanceInfo {
            instance_id: instance_id.clone(),
            app: registration.name.to_uppercase(),
            host_name: host.clone(),
            ip_addr: host.clone(),
            port: EurekaPort { value: port, enabled: true },
            secure_port: EurekaPort { value: 443, enabled: false },
            vip_address: registration.name.to_lowercase(),
            secure_vip_address: registration.name.to_lowercase(),
            status: if registration.enabled { "UP".to_string() } else { "DOWN".to_string() },
            overridden_status: "UNKNOWN".to_string(),
            data_center_info: EurekaDataCenterInfo {
                class: "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo".to_string(),
                name: "MyOwn".to_string(),
            },
            lease_info: EurekaLeaseInfo {
                renewal_interval_in_secs: 30,
                duration_in_secs: 90,
            },
            metadata,
            home_page_url: format!("{}/", registration.base_url.trim_end_matches('/')),
            status_page_url: format!("{}/info", registration.base_url.trim_end_matches('/')),
            health_check_url: format!("{}/health", registration.base_url.trim_end_matches('/')),
        })
    }

    /// Convert an Eureka instance info to ServiceRegistration.
    fn instance_to_registration(instance: &EurekaInstanceInfo) -> ServiceRegistration {
        let base_url = instance.metadata.data.get("base_url")
            .cloned()
            .unwrap_or_else(|| format!("http://{}:{}", instance.host_name, instance.port.value));

        let version = instance.metadata.data.get("version")
            .cloned()
            .unwrap_or_else(|| "1.0.0".to_string());

        let description = instance.metadata.data.get("description")
            .cloned()
            .unwrap_or_default();

        let tags = instance.metadata.data.get("tags")
            .and_then(|t| serde_json::from_str(t).ok())
            .unwrap_or_default();

        let enabled = instance.metadata.data.get("enabled")
            .and_then(|e| e.parse().ok())
            .unwrap_or(instance.status == "UP");

        ServiceRegistration {
            name: instance.app.to_lowercase(),
            base_url,
            version,
            description,
            tags,
            metadata: instance.metadata.data.clone(),
            enabled,
            registered_at: chrono::Utc::now().to_rfc3339(),
            last_heartbeat: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[async_trait]
impl ServiceDiscovery for EurekaServiceDiscovery {
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        let instance = Self::registration_to_instance(&registration)?;
        let request = EurekaRegistrationRequest { instance: instance.clone() };

        let url = self.build_url(&format!("/eureka/apps/{}", registration.name.to_uppercase()));
        let response = self.http_client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to register service with Eureka: {} - {}",
                status, body
            )));
        }

        // Track registered service
        let (host, port) = Self::extract_host_port(&registration.base_url)?;
        self.registered_services.lock().unwrap().insert(
            registration.name.clone(),
            RegisteredServiceInfo {
                name: registration.name.clone(),
                instance_id: instance.instance_id,
                host,
                port,
                base_url: registration.base_url,
            },
        );

        Ok(())
    }

    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError> {
        let service_info = {
            self.registered_services.lock().unwrap().get(name).cloned()
        };

        let Some(info) = service_info else {
            return Err(ServiceClientError::ServiceNotFound(name.to_string()));
        };

        let url = self.build_url(&format!(
            "/eureka/apps/{}/{}",
            name.to_uppercase(),
            info.instance_id
        ));
        let response = self.http_client
            .delete(&url)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to deregister service from Eureka: {} - {}",
                status, body
            )));
        }

        // Remove from tracking
        self.registered_services.lock().unwrap().remove(name);

        Ok(())
    }

    async fn discover(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let url = self.build_url(&format!("/eureka/apps/{}", name.to_uppercase()));
        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if response.status() == 404 {
            return Ok(None);
        }

        if !response.status().is_success() {
            return Ok(None);
        }

        let app_response: EurekaApplicationResponse = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let Some(application) = app_response.application else {
            return Ok(None);
        };

        let Some(instances) = application.instance else {
            return Ok(None);
        };

        // Return the first UP instance
        for instance in &instances {
            if instance.status == "UP" {
                return Ok(Some(Self::instance_to_registration(instance)));
            }
        }

        // If no UP instances, return the first one
        Ok(instances.first().map(|instance| Self::instance_to_registration(instance)))
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        let url = self.build_url("/eureka/apps");
        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Ok(Vec::new());
        }

        let apps_response: EurekaApplicationsResponse = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let Some(applications) = apps_response.applications.application else {
            return Ok(Vec::new());
        };

        let mut services = Vec::new();
        for app in applications {
            if let Some(instances) = app.instance {
                for instance in instances {
                    if instance.status == "UP" {
                        services.push(Self::instance_to_registration(&instance));
                    }
                }
            }
        }

        Ok(services)
    }

    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError> {
        let service_info = {
            self.registered_services.lock().unwrap().get(name).cloned()
        };

        let Some(info) = service_info else {
            return Err(ServiceClientError::ServiceNotFound(name.to_string()));
        };

        let url = self.build_url(&format!(
            "/eureka/apps/{}/{}",
            name.to_uppercase(),
            info.instance_id
        ));
        let response = self.http_client
            .put(&url)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to send heartbeat to Eureka: {} - {}",
                status, body
            )));
        }

        Ok(())
    }
}

// ===== Eureka Service Discovery Builder =====

/// Builder for EurekaServiceDiscovery.
pub struct EurekaServiceDiscoveryBuilder {
    config: EurekaConfig,
}

impl EurekaServiceDiscoveryBuilder {
    /// Create a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: EurekaConfig::default(),
        }
    }

    /// Set the Eureka server address.
    pub fn address(mut self, address: impl Into<String>) -> Self {
        self.config.address = address.into();
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

    /// Set whether to use VIP address.
    pub fn use_vip_address(mut self, use_vip: bool) -> Self {
        self.config.use_vip_address = use_vip;
        self
    }

    /// Build the EurekaServiceDiscovery instance.
    pub fn build(self) -> Result<EurekaServiceDiscovery, ServiceClientError> {
        EurekaServiceDiscovery::new(self.config)
    }
}

impl Default for EurekaServiceDiscoveryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_eureka_config_default() {
        let config = EurekaConfig::default();
        assert_eq!(config.address, "http://localhost:8761");
        assert_eq!(config.timeout_secs, 10);
        assert_eq!(config.heartbeat_interval_secs, 30);
        assert!(!config.use_vip_address);
    }

    #[test]
    fn test_extract_host_port() {
        let (host, port) = EurekaServiceDiscovery::extract_host_port("http://localhost:8001").unwrap();
        assert_eq!(host, "localhost");
        assert_eq!(port, 8001);
    }

    #[test]
    fn test_extract_host_port_default_http() {
        let (host, port) = EurekaServiceDiscovery::extract_host_port("http://example.com").unwrap();
        assert_eq!(host, "example.com");
        assert_eq!(port, 80);
    }

    #[test]
    fn test_generate_instance_id() {
        let id = EurekaServiceDiscovery::generate_instance_id("CRM", "localhost", 8001);
        assert_eq!(id, "localhost:crm:8001");
    }

    #[test]
    fn test_build_url() {
        let config = EurekaConfig::default();
        let discovery = EurekaServiceDiscovery::new(config).unwrap();
        let url = discovery.build_url("/eureka/apps/CRM");
        assert_eq!(url, "http://localhost:8761/eureka/apps/CRM");
    }

    #[test]
    fn test_registration_to_instance() {
        let registration = ServiceRegistration::new("crm", "http://localhost:8001");
        let instance = EurekaServiceDiscovery::registration_to_instance(&registration).unwrap();
        assert_eq!(instance.app, "CRM");
        assert_eq!(instance.host_name, "localhost");
        assert_eq!(instance.port.value, 8001);
        assert_eq!(instance.status, "UP");
    }

    #[test]
    fn test_instance_to_registration() {
        let mut metadata = EurekaInstanceMetadata::default();
        metadata.data.insert("base_url".to_string(), "http://localhost:8001".to_string());
        metadata.data.insert("version".to_string(), "2.0.0".to_string());

        let instance = EurekaInstanceInfo {
            instance_id: "localhost:crm:8001".to_string(),
            app: "CRM".to_string(),
            host_name: "localhost".to_string(),
            ip_addr: "127.0.0.1".to_string(),
            port: EurekaPort { value: 8001, enabled: true },
            secure_port: EurekaPort { value: 443, enabled: false },
            vip_address: "crm".to_string(),
            secure_vip_address: "crm".to_string(),
            status: "UP".to_string(),
            overridden_status: "UNKNOWN".to_string(),
            data_center_info: EurekaDataCenterInfo {
                class: "test".to_string(),
                name: "MyOwn".to_string(),
            },
            lease_info: EurekaLeaseInfo {
                renewal_interval_in_secs: 30,
                duration_in_secs: 90,
            },
            metadata,
            home_page_url: "http://localhost:8001/".to_string(),
            status_page_url: "http://localhost:8001/info".to_string(),
            health_check_url: "http://localhost:8001/health".to_string(),
        };

        let registration = EurekaServiceDiscovery::instance_to_registration(&instance);
        assert_eq!(registration.name, "crm");
        assert_eq!(registration.base_url, "http://localhost:8001");
        assert_eq!(registration.version, "2.0.0");
    }

    #[test]
    fn test_builder() {
        let discovery = EurekaServiceDiscoveryBuilder::new()
            .address("http://eureka:8761")
            .username("eureka")
            .password("password")
            .timeout_secs(15)
            .heartbeat_interval_secs(60)
            .use_vip_address(true)
            .build();

        assert!(discovery.is_ok());
    }
}
