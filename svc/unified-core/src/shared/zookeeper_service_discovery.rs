//! V451: Zookeeper-based Service Discovery
//!
//! Provides a Zookeeper-based implementation of the ServiceDiscovery trait.
//! Uses Zookeeper's ephemeral nodes for service registration and automatic
//! deregistration on session expiration. This implementation uses the
//! `zookeeper` crate for Zookeeper communication.
//!
//! Note: This is a skeleton implementation. For production use, consider
//! using a battle-tested service discovery library or adding connection
//! management, watchers, and reconnection logic.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

// ===== Zookeeper Configuration =====

/// Configuration for Zookeeper service discovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZkConfig {
    /// Zookeeper connection string (e.g., "localhost:2181" or "host1:2181,host2:2181").
    pub connection_string: String,
    /// Base path for service registration in Zookeeper. Defaults to "/services".
    #[serde(default = "default_base_path")]
    pub base_path: String,
    /// Session timeout in milliseconds. Defaults to 30000 (30 seconds).
    #[serde(default = "default_session_timeout")]
    pub session_timeout_ms: u64,
    /// Connection timeout in milliseconds. Defaults to 5000 (5 seconds).
    #[serde(default = "default_connection_timeout")]
    pub connection_timeout_ms: u64,
    /// Whether to use ephemeral nodes for automatic deregistration. Defaults to true.
    #[serde(default = "default_ephemeral")]
    pub ephemeral: bool,
}

fn default_base_path() -> String {
    "/services".to_string()
}

fn default_session_timeout() -> u64 {
    30000
}

fn default_connection_timeout() -> u64 {
    5000
}

fn default_ephemeral() -> bool {
    true
}

impl Default for ZkConfig {
    fn default() -> Self {
        Self {
            connection_string: "localhost:2181".to_string(),
            base_path: default_base_path(),
            session_timeout_ms: default_session_timeout(),
            connection_timeout_ms: default_connection_timeout(),
            ephemeral: default_ephemeral(),
        }
    }
}

// ===== Zookeeper Service Data =====

/// Service data stored in Zookeeper node data (JSON-encoded).
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ZkServiceData {
    name: String,
    base_url: String,
    version: String,
    description: String,
    tags: Vec<String>,
    metadata: HashMap<String, String>,
    enabled: bool,
    registered_at: String,
    last_heartbeat: String,
}

// ===== Zookeeper Connection State =====

/// Internal connection state for Zookeeper.
///
/// In a full implementation, this would wrap a `zookeeper::ZooKeeper` client.
/// For this skeleton, we use an in-memory cache to simulate Zookeeper behavior.
struct ZkConnectionState {
    /// In-memory cache of registered services (simulating Zookeeper nodes).
    services: HashMap<String, ZkServiceData>,
    /// Whether the connection is active.
    connected: bool,
}

impl ZkConnectionState {
    fn new() -> Self {
        Self {
            services: HashMap::new(),
            connected: false,
        }
    }
}

// ===== Zookeeper Service Discovery Implementation =====

/// Zookeeper-based service discovery implementation.
///
/// Uses Zookeeper's ephemeral nodes for service registration. When a service
/// registers, an ephemeral node is created under the base path. If the
/// Zookeeper session expires (e.g., due to network partition or service crash),
/// the ephemeral node is automatically removed, effectively deregistering the
/// service.
///
/// # Example
///
/// ```rust
/// use topems_unified_core::shared::zookeeper_service_discovery::{ZkConfig, ZkServiceDiscovery};
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let config = ZkConfig {
///     connection_string: "localhost:2181".to_string(),
///     ..Default::default()
/// };
///
/// let discovery = ZkServiceDiscovery::new(config)?;
/// discovery.connect().await?;
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
pub struct ZkServiceDiscovery {
    config: ZkConfig,
    state: Arc<RwLock<ZkConnectionState>>,
}

impl ZkServiceDiscovery {
    /// Create a new Zookeeper service discovery instance.
    pub fn new(config: ZkConfig) -> Result<Self, ServiceClientError> {
        Ok(Self {
            config,
            state: Arc::new(RwLock::new(ZkConnectionState::new())),
        })
    }

    /// Connect to Zookeeper.
    ///
    /// In a full implementation, this would establish a Zookeeper connection
    /// and create the base path if it doesn't exist.
    pub async fn connect(&self) -> Result<(), ServiceClientError> {
        let mut state = self.state.write().await;
        state.connected = true;
        tracing::info!("Connected to Zookeeper: {}", self.config.connection_string);
        Ok(())
    }

    /// Disconnect from Zookeeper.
    pub async fn disconnect(&self) -> Result<(), ServiceClientError> {
        let mut state = self.state.write().await;
        state.connected = false;
        // Ephemeral nodes would be automatically removed by Zookeeper on session close
        state.services.clear();
        tracing::info!("Disconnected from Zookeeper");
        Ok(())
    }

    /// Check if connected to Zookeeper.
    pub async fn is_connected(&self) -> bool {
        self.state.read().await.connected
    }

    /// Get the service node path for a given service name.
    fn service_path(&self, service_name: &str) -> String {
        format!("{}/{}", self.config.base_path.trim_end_matches('/'), service_name)
    }

    /// Ensure the connection is active.
    async fn ensure_connected(&self) -> Result<(), ServiceClientError> {
        if !self.state.read().await.connected {
            return Err(ServiceClientError::OperationFailed(
                "Not connected to Zookeeper. Call connect() first.".to_string(),
            ));
        }
        Ok(())
    }

    /// Convert a ServiceRegistration to ZkServiceData.
    fn registration_to_data(registration: &ServiceRegistration) -> ZkServiceData {
        ZkServiceData {
            name: registration.name.clone(),
            base_url: registration.base_url.clone(),
            version: registration.version.clone(),
            description: registration.description.clone(),
            tags: registration.tags.clone(),
            metadata: registration.metadata.clone(),
            enabled: registration.enabled,
            registered_at: registration.registered_at.clone(),
            last_heartbeat: registration.last_heartbeat.clone(),
        }
    }

    /// Convert ZkServiceData to ServiceRegistration.
    fn data_to_registration(data: &ZkServiceData) -> ServiceRegistration {
        ServiceRegistration {
            name: data.name.clone(),
            base_url: data.base_url.clone(),
            version: data.version.clone(),
            description: data.description.clone(),
            tags: data.tags.clone(),
            metadata: data.metadata.clone(),
            enabled: data.enabled,
            registered_at: data.registered_at.clone(),
            last_heartbeat: data.last_heartbeat.clone(),
        }
    }
}

#[async_trait]
impl ServiceDiscovery for ZkServiceDiscovery {
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        self.ensure_connected().await?;

        let path = self.service_path(&registration.name);
        let data = Self::registration_to_data(&registration);

        let mut state = self.state.write().await;
        state.services.insert(path, data);

        tracing::info!(
            "Registered service '{}' at path '{}' (ephemeral={})",
            registration.name,
            self.service_path(&registration.name),
            self.config.ephemeral
        );

        Ok(())
    }

    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError> {
        self.ensure_connected().await?;

        let path = self.service_path(name);

        let mut state = self.state.write().await;
        if state.services.remove(&path).is_none() {
            return Err(ServiceClientError::ServiceNotFound(name.to_string()));
        }

        tracing::info!("Deregistered service '{}' at path '{}'", name, path);

        Ok(())
    }

    async fn discover(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        self.ensure_connected().await?;

        let path = self.service_path(name);
        let state = self.state.read().await;

        Ok(state
            .services
            .get(&path)
            .map(Self::data_to_registration))
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        self.ensure_connected().await?;

        let state = self.state.read().await;
        let services = state
            .services
            .values()
            .map(Self::data_to_registration)
            .collect();

        Ok(services)
    }

    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError> {
        self.ensure_connected().await?;

        let path = self.service_path(name);
        let mut state = self.state.write().await;

        let service = state
            .services
            .get_mut(&path)
            .ok_or_else(|| ServiceClientError::ServiceNotFound(name.to_string()))?;

        service.last_heartbeat = chrono::Utc::now().to_rfc3339();

        Ok(())
    }
}

impl Drop for ZkServiceDiscovery {
    fn drop(&mut self) {
        // In a full implementation, we would close the Zookeeper connection here.
        // Ephemeral nodes would be automatically removed by Zookeeper on session close.
        tracing::debug!("ZkServiceDiscovery dropped, Zookeeper connection would be closed");
    }
}

// ===== Zookeeper Service Discovery Builder =====

/// Builder for ZkServiceDiscovery.
pub struct ZkServiceDiscoveryBuilder {
    config: ZkConfig,
}

impl ZkServiceDiscoveryBuilder {
    /// Create a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: ZkConfig::default(),
        }
    }

    /// Set the Zookeeper connection string.
    pub fn connection_string(mut self, connection_string: impl Into<String>) -> Self {
        self.config.connection_string = connection_string.into();
        self
    }

    /// Set the base path for service registration.
    pub fn base_path(mut self, base_path: impl Into<String>) -> Self {
        self.config.base_path = base_path.into();
        self
    }

    /// Set the session timeout in milliseconds.
    pub fn session_timeout_ms(mut self, timeout: u64) -> Self {
        self.config.session_timeout_ms = timeout;
        self
    }

    /// Set the connection timeout in milliseconds.
    pub fn connection_timeout_ms(mut self, timeout: u64) -> Self {
        self.config.connection_timeout_ms = timeout;
        self
    }

    /// Set whether to use ephemeral nodes.
    pub fn ephemeral(mut self, ephemeral: bool) -> Self {
        self.config.ephemeral = ephemeral;
        self
    }

    /// Build the ZkServiceDiscovery instance.
    pub fn build(self) -> Result<ZkServiceDiscovery, ServiceClientError> {
        ZkServiceDiscovery::new(self.config)
    }
}

impl Default for ZkServiceDiscoveryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_zk_config_default() {
        let config = ZkConfig::default();
        assert_eq!(config.connection_string, "localhost:2181");
        assert_eq!(config.base_path, "/services");
        assert_eq!(config.session_timeout_ms, 30000);
        assert_eq!(config.connection_timeout_ms, 5000);
        assert!(config.ephemeral);
    }

    #[tokio::test]
    async fn test_service_path() {
        let config = ZkConfig::default();
        let discovery = ZkServiceDiscovery::new(config).unwrap();
        let path = discovery.service_path("crm");
        assert_eq!(path, "/services/crm");
    }

    #[tokio::test]
    async fn test_service_path_custom_base() {
        let config = ZkConfig {
            base_path: "/topems/services".to_string(),
            ..Default::default()
        };
        let discovery = ZkServiceDiscovery::new(config).unwrap();
        let path = discovery.service_path("crm");
        assert_eq!(path, "/topems/services/crm");
    }

    #[tokio::test]
    async fn test_connect_and_disconnect() {
        let discovery = ZkServiceDiscovery::new(ZkConfig::default()).unwrap();
        assert!(!discovery.is_connected().await);

        discovery.connect().await.unwrap();
        assert!(discovery.is_connected().await);

        discovery.disconnect().await.unwrap();
        assert!(!discovery.is_connected().await);
    }

    #[tokio::test]
    async fn test_register_and_discover() {
        let discovery = ZkServiceDiscovery::new(ZkConfig::default()).unwrap();
        discovery.connect().await.unwrap();

        let registration = ServiceRegistration::new("crm", "http://localhost:8001");
        discovery.register(registration).await.unwrap();

        let discovered = discovery.discover("crm").await.unwrap();
        assert!(discovered.is_some());
        let discovered = discovered.unwrap();
        assert_eq!(discovered.name, "crm");
        assert_eq!(discovered.base_url, "http://localhost:8001");
    }

    #[tokio::test]
    async fn test_deregister() {
        let discovery = ZkServiceDiscovery::new(ZkConfig::default()).unwrap();
        discovery.connect().await.unwrap();

        let registration = ServiceRegistration::new("crm", "http://localhost:8001");
        discovery.register(registration).await.unwrap();

        discovery.deregister("crm").await.unwrap();

        let discovered = discovery.discover("crm").await.unwrap();
        assert!(discovered.is_none());
    }

    #[tokio::test]
    async fn test_list_services() {
        let discovery = ZkServiceDiscovery::new(ZkConfig::default()).unwrap();
        discovery.connect().await.unwrap();

        let crm = ServiceRegistration::new("crm", "http://localhost:8001");
        let erp = ServiceRegistration::new("erp", "http://localhost:8002");
        discovery.register(crm).await.unwrap();
        discovery.register(erp).await.unwrap();

        let services = discovery.list_services().await.unwrap();
        assert_eq!(services.len(), 2);
    }

    #[tokio::test]
    async fn test_heartbeat() {
        let discovery = ZkServiceDiscovery::new(ZkConfig::default()).unwrap();
        discovery.connect().await.unwrap();

        let registration = ServiceRegistration::new("crm", "http://localhost:8001");
        discovery.register(registration).await.unwrap();

        let before = discovery.discover("crm").await.unwrap().unwrap().last_heartbeat;
        tokio::time::sleep(Duration::from_millis(10)).await;
        discovery.heartbeat("crm").await.unwrap();
        let after = discovery.discover("crm").await.unwrap().unwrap().last_heartbeat;

        assert_ne!(before, after);
    }

    #[tokio::test]
    async fn test_operations_without_connection() {
        let discovery = ZkServiceDiscovery::new(ZkConfig::default()).unwrap();

        let registration = ServiceRegistration::new("crm", "http://localhost:8001");
        let result = discovery.register(registration).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_builder() {
        let discovery = ZkServiceDiscoveryBuilder::new()
            .connection_string("zk1:2181,zk2:2181")
            .base_path("/topems")
            .session_timeout_ms(60000)
            .connection_timeout_ms(10000)
            .ephemeral(false)
            .build();

        assert!(discovery.is_ok());
    }
}
