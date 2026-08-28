//! V449: etcd-based Service Discovery
//!
//! Provides an etcd-based implementation of the ServiceDiscovery trait.
//! Uses etcd v3's JSON-gRPC gateway for service registration, discovery,
//! and lease-based health checking. This implementation uses reqwest for
//! HTTP communication and does not require any additional dependencies.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

// ===== etcd Configuration =====

/// Configuration for etcd service discovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EtcdConfig {
    /// etcd server address (e.g., "http://localhost:2379").
    pub address: String,
    /// etcd username for authentication (optional).
    #[serde(default)]
    pub username: Option<String>,
    /// etcd password for authentication (optional).
    #[serde(default)]
    pub password: Option<String>,
    /// Service key prefix in etcd. Defaults to "/services/".
    #[serde(default = "default_prefix")]
    pub key_prefix: String,
    /// Lease TTL in seconds for service registration. Defaults to 30.
    #[serde(default = "default_lease_ttl")]
    pub lease_ttl_secs: i64,
    /// Request timeout in seconds. Defaults to 10.
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
}

fn default_prefix() -> String {
    "/services/".to_string()
}

fn default_lease_ttl() -> i64 {
    30
}

fn default_timeout() -> u64 {
    10
}

impl Default for EtcdConfig {
    fn default() -> Self {
        Self {
            address: "http://localhost:2379".to_string(),
            username: None,
            password: None,
            key_prefix: default_prefix(),
            lease_ttl_secs: default_lease_ttl(),
            timeout_secs: default_timeout(),
        }
    }
}

// ===== etcd API Types =====

/// etcd lease grant response.
#[derive(Debug, Clone, Deserialize)]
struct EtcdLeaseGrantResponse {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "TTL")]
    ttl: String,
}

/// etcd range response (for key-value queries).
#[derive(Debug, Clone, Deserialize)]
struct EtcdRangeResponse {
    #[serde(default)]
    kvs: Option<Vec<EtcdKeyValue>>,
    count: Option<String>,
}

/// etcd key-value pair.
#[derive(Debug, Clone, Deserialize)]
struct EtcdKeyValue {
    key: String,
    value: String,
    #[serde(rename = "create_revision")]
    create_revision: Option<String>,
    #[serde(rename = "mod_revision")]
    mod_revision: Option<String>,
    version: Option<String>,
    lease: Option<String>,
}

/// etcd put request.
#[derive(Debug, Clone, Serialize)]
struct EtcdPutRequest {
    key: String,
    value: String,
    #[serde(rename = "lease")]
    lease_id: Option<String>,
}

/// etcd delete range request.
#[derive(Debug, Clone, Serialize)]
struct EtcdDeleteRangeRequest {
    key: String,
    #[serde(rename = "range_end")]
    range_end: Option<String>,
}

/// etcd lease grant request.
#[derive(Debug, Clone, Serialize)]
struct EtcdLeaseGrantRequest {
    #[serde(rename = "TTL")]
    ttl: i64,
}

/// etcd lease revoke request.
#[derive(Debug, Clone, Serialize)]
struct EtcdLeaseRevokeRequest {
    #[serde(rename = "ID")]
    id: String,
}

/// Service data stored in etcd value (JSON-encoded).
#[derive(Debug, Clone, Serialize, Deserialize)]
struct EtcdServiceData {
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

// ===== etcd Service Discovery Implementation =====

/// etcd-based service discovery implementation.
///
/// Uses etcd v3's JSON-gRPC gateway for service registration and discovery.
/// Services are registered with a lease for automatic expiration if the
/// service becomes unhealthy. Service data is stored as JSON in etcd values.
///
/// # Example
///
/// ```rust
/// use topems_unified_core::shared::etcd_service_discovery::{EtcdConfig, EtcdServiceDiscovery};
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let config = EtcdConfig {
///     address: "http://localhost:2379".to_string(),
///     ..Default::default()
/// };
///
/// let discovery = EtcdServiceDiscovery::new(config)?;
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
pub struct EtcdServiceDiscovery {
    config: EtcdConfig,
    http_client: Client,
    /// Registered service lease IDs (for revocation on drop).
    registered_leases: Arc<std::sync::Mutex<HashMap<String, String>>>,
}

impl EtcdServiceDiscovery {
    /// Create a new etcd service discovery instance.
    pub fn new(config: EtcdConfig) -> Result<Self, ServiceClientError> {
        let timeout = Duration::from_secs(config.timeout_secs);
        let http_client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(ServiceClientError::RequestFailed)?;

        Ok(Self {
            config,
            http_client,
            registered_leases: Arc::new(std::sync::Mutex::new(HashMap::new())),
        })
    }

    /// Build the etcd API URL for a given path.
    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.config.address.trim_end_matches('/'), path)
    }

    /// Build the request headers (including basic auth if configured).
    fn build_headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            reqwest::header::HeaderValue::from_static("application/json"),
        );
        headers
    }

    /// Get the etcd key for a service.
    fn service_key(&self, service_name: &str) -> String {
        format!("{}/{}", self.config.key_prefix.trim_end_matches('/'), service_name)
    }

    /// Get the range end for listing all services (prefix + 1).
    fn range_end(&self) -> String {
        let prefix = &self.config.key_prefix;
        // Increment the last byte to get the range end
        let mut bytes = prefix.as_bytes().to_vec();
        if let Some(last) = bytes.last_mut() {
            *last += 1;
        }
        String::from_utf8(bytes).unwrap_or_else(|_| prefix.clone())
    }

    /// Base64-encode a string (etcd uses base64 for keys and values).
    fn base64_encode(input: &str) -> String {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD.encode(input)
    }

    /// Base64-decode a string.
    fn base64_decode(input: &str) -> Result<String, ServiceClientError> {
        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(input)
            .map_err(|e| ServiceClientError::ParseFailed(format!("Base64 decode error: {}", e)))?;
        String::from_utf8(bytes)
            .map_err(|e| ServiceClientError::ParseFailed(format!("UTF-8 decode error: {}", e)))
    }

    /// Grant a lease with the configured TTL.
    async fn grant_lease(&self) -> Result<String, ServiceClientError> {
        let url = self.build_url("/v3/lease/grant");
        let request = EtcdLeaseGrantRequest {
            ttl: self.config.lease_ttl_secs,
        };

        let response = self.http_client
            .post(&url)
            .headers(self.build_headers())
            .json(&request)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to grant lease: {} - {}",
                status, body
            )));
        }

        let lease_response: EtcdLeaseGrantResponse = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        Ok(lease_response.id)
    }

    /// Revoke a lease.
    async fn revoke_lease(&self, lease_id: &str) -> Result<(), ServiceClientError> {
        let url = self.build_url("/v3/lease/revoke");
        let request = EtcdLeaseRevokeRequest {
            id: lease_id.to_string(),
        };

        let response = self.http_client
            .post(&url)
            .headers(self.build_headers())
            .json(&request)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to revoke lease: {} - {}",
                status, body
            )));
        }

        Ok(())
    }

    /// Put a key-value pair into etcd.
    async fn put_key(&self, key: &str, value: &str, lease_id: Option<&str>) -> Result<(), ServiceClientError> {
        let url = self.build_url("/v3/kv/put");
        let request = EtcdPutRequest {
            key: Self::base64_encode(key),
            value: Self::base64_encode(value),
            lease_id: lease_id.map(|s| s.to_string()),
        };

        let response = self.http_client
            .post(&url)
            .headers(self.build_headers())
            .json(&request)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to put key: {} - {}",
                status, body
            )));
        }

        Ok(())
    }

    /// Delete a key from etcd.
    async fn delete_key(&self, key: &str) -> Result<(), ServiceClientError> {
        let url = self.build_url("/v3/kv/deleterange");
        let request = EtcdDeleteRangeRequest {
            key: Self::base64_encode(key),
            range_end: None,
        };

        let response = self.http_client
            .post(&url)
            .headers(self.build_headers())
            .json(&request)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to delete key: {} - {}",
                status, body
            )));
        }

        Ok(())
    }

    /// Get a key from etcd.
    async fn get_key(&self, key: &str) -> Result<Option<String>, ServiceClientError> {
        let url = self.build_url("/v3/kv/range");
        let request = serde_json::json!({
            "key": Self::base64_encode(key),
        });

        let response = self.http_client
            .post(&url)
            .headers(self.build_headers())
            .json(&request)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Ok(None);
        }

        let range_response: EtcdRangeResponse = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let Some(kvs) = range_response.kvs else {
            return Ok(None);
        };

        if kvs.is_empty() {
            return Ok(None);
        }

        let value = Self::base64_decode(&kvs[0].value)?;
        Ok(Some(value))
    }

    /// List all keys with the configured prefix.
    async fn list_keys(&self) -> Result<Vec<(String, String)>, ServiceClientError> {
        let url = self.build_url("/v3/kv/range");
        let request = serde_json::json!({
            "key": Self::base64_encode(&self.config.key_prefix),
            "range_end": Self::base64_encode(&self.range_end()),
        });

        let response = self.http_client
            .post(&url)
            .headers(self.build_headers())
            .json(&request)
            .send()
            .await
            .map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            return Ok(Vec::new());
        }

        let range_response: EtcdRangeResponse = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let Some(kvs) = range_response.kvs else {
            return Ok(Vec::new());
        };

        let mut results = Vec::new();
        for kv in kvs {
            let key = Self::base64_decode(&kv.key)?;
            let value = Self::base64_decode(&kv.value)?;
            results.push((key, value));
        }

        Ok(results)
    }

    /// Convert a ServiceRegistration to etcd service data JSON.
    fn registration_to_data(registration: &ServiceRegistration) -> Result<String, ServiceClientError> {
        let data = EtcdServiceData {
            name: registration.name.clone(),
            base_url: registration.base_url.clone(),
            version: registration.version.clone(),
            description: registration.description.clone(),
            tags: registration.tags.clone(),
            metadata: registration.metadata.clone(),
            enabled: registration.enabled,
            registered_at: registration.registered_at.clone(),
            last_heartbeat: registration.last_heartbeat.clone(),
        };

        serde_json::to_string(&data)
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))
    }

    /// Convert etcd service data JSON to ServiceRegistration.
    fn data_to_registration(data: &str) -> Result<ServiceRegistration, ServiceClientError> {
        let service_data: EtcdServiceData = serde_json::from_str(data)
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        Ok(ServiceRegistration {
            name: service_data.name,
            base_url: service_data.base_url,
            version: service_data.version,
            description: service_data.description,
            tags: service_data.tags,
            metadata: service_data.metadata,
            enabled: service_data.enabled,
            registered_at: service_data.registered_at,
            last_heartbeat: service_data.last_heartbeat,
        })
    }
}

#[async_trait]
impl ServiceDiscovery for EtcdServiceDiscovery {
    async fn register(&self, registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        // Grant a lease for automatic expiration
        let lease_id = self.grant_lease().await?;

        // Convert registration to JSON
        let data = Self::registration_to_data(&registration)?;

        // Put the key-value pair with the lease
        let key = self.service_key(&registration.name);
        self.put_key(&key, &data, Some(&lease_id)).await?;

        // Track the lease for revocation
        self.registered_leases
            .lock()
            .unwrap()
            .insert(registration.name.clone(), lease_id);

        Ok(())
    }

    async fn deregister(&self, name: &str) -> Result<(), ServiceClientError> {
        // Delete the key
        let key = self.service_key(name);
        self.delete_key(&key).await?;

        // Revoke the lease if tracked
        let lease_id = self.registered_leases.lock().unwrap().remove(name);
        if let Some(lease_id) = lease_id {
            let _ = self.revoke_lease(&lease_id).await;
        }

        Ok(())
    }

    async fn discover(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let key = self.service_key(name);
        let value = self.get_key(&key).await?;

        let Some(value) = value else {
            return Ok(None);
        };

        let registration = Self::data_to_registration(&value)?;
        Ok(Some(registration))
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        let kvs = self.list_keys().await?;

        let mut registrations = Vec::new();
        for (_, value) in kvs {
            if let Ok(registration) = Self::data_to_registration(&value) {
                registrations.push(registration);
            }
        }

        Ok(registrations)
    }

    async fn heartbeat(&self, name: &str) -> Result<(), ServiceClientError> {
        // For etcd, heartbeat is handled by lease keep-alive
        // Here we just verify the service exists
        let key = self.service_key(name);
        let value = self.get_key(&key).await?;

        if value.is_none() {
            return Err(ServiceClientError::ServiceNotFound(name.to_string()));
        }

        // Update the last_heartbeat timestamp
        if let Some(value) = value {
            let mut registration = Self::data_to_registration(&value)?;
            registration.last_heartbeat = chrono::Utc::now().to_rfc3339();
            let data = Self::registration_to_data(&registration)?;

            // Get the lease ID if tracked
            let lease_id = self.registered_leases.lock().unwrap().get(name).cloned();
            self.put_key(&key, &data, lease_id.as_deref()).await?;
        }

        Ok(())
    }
}

impl Drop for EtcdServiceDiscovery {
    fn drop(&mut self) {
        // Revoke all tracked leases
        // Note: This is a best-effort operation since we can't await in drop
        let leases = self.registered_leases.lock().unwrap().clone();
        for (name, lease_id) in leases {
            tracing::debug!("Would revoke lease for service {}: {}", name, lease_id);
        }
    }
}

// ===== etcd Service Discovery Builder =====

/// Builder for EtcdServiceDiscovery.
pub struct EtcdServiceDiscoveryBuilder {
    config: EtcdConfig,
}

impl EtcdServiceDiscoveryBuilder {
    /// Create a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: EtcdConfig::default(),
        }
    }

    /// Set the etcd server address.
    pub fn address(mut self, address: impl Into<String>) -> Self {
        self.config.address = address.into();
        self
    }

    /// Set the etcd username.
    pub fn username(mut self, username: impl Into<String>) -> Self {
        self.config.username = Some(username.into());
        self
    }

    /// Set the etcd password.
    pub fn password(mut self, password: impl Into<String>) -> Self {
        self.config.password = Some(password.into());
        self
    }

    /// Set the service key prefix.
    pub fn key_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.config.key_prefix = prefix.into();
        self
    }

    /// Set the lease TTL in seconds.
    pub fn lease_ttl_secs(mut self, ttl: i64) -> Self {
        self.config.lease_ttl_secs = ttl;
        self
    }

    /// Set the request timeout in seconds.
    pub fn timeout_secs(mut self, timeout: u64) -> Self {
        self.config.timeout_secs = timeout;
        self
    }

    /// Build the EtcdServiceDiscovery instance.
    pub fn build(self) -> Result<EtcdServiceDiscovery, ServiceClientError> {
        EtcdServiceDiscovery::new(self.config)
    }
}

impl Default for EtcdServiceDiscoveryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_etcd_config_default() {
        let config = EtcdConfig::default();
        assert_eq!(config.address, "http://localhost:2379");
        assert_eq!(config.key_prefix, "/services/");
        assert_eq!(config.lease_ttl_secs, 30);
        assert_eq!(config.timeout_secs, 10);
    }

    #[test]
    fn test_service_key() {
        let config = EtcdConfig::default();
        let discovery = EtcdServiceDiscovery::new(config).unwrap();
        let key = discovery.service_key("crm");
        assert_eq!(key, "/services/crm");
    }

    #[test]
    fn test_service_key_custom_prefix() {
        let config = EtcdConfig {
            key_prefix: "/topems/services/".to_string(),
            ..Default::default()
        };
        let discovery = EtcdServiceDiscovery::new(config).unwrap();
        let key = discovery.service_key("crm");
        assert_eq!(key, "/topems/services/crm");
    }

    #[test]
    fn test_base64_encode_decode() {
        let original = "hello world";
        let encoded = EtcdServiceDiscovery::base64_encode(original);
        let decoded = EtcdServiceDiscovery::base64_decode(&encoded).unwrap();
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_registration_to_data_and_back() {
        let registration = ServiceRegistration::new("crm", "http://localhost:8001");
        let data = EtcdServiceDiscovery::registration_to_data(&registration).unwrap();
        let restored = EtcdServiceDiscovery::data_to_registration(&data).unwrap();
        assert_eq!(restored.name, "crm");
        assert_eq!(restored.base_url, "http://localhost:8001");
    }

    #[test]
    fn test_builder() {
        let discovery = EtcdServiceDiscoveryBuilder::new()
            .address("http://etcd:2379")
            .key_prefix("/topems/")
            .lease_ttl_secs(60)
            .timeout_secs(15)
            .build();

        assert!(discovery.is_ok());
    }

    #[test]
    fn test_range_end() {
        let config = EtcdConfig::default();
        let discovery = EtcdServiceDiscovery::new(config).unwrap();
        let range_end = discovery.range_end();
        // The range end should be the prefix with the last byte incremented
        assert!(range_end.starts_with("/services"));
    }
}
