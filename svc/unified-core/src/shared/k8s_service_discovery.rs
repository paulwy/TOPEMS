//! V457: Kubernetes-based Service Discovery
//!
//! Provides a Kubernetes-based implementation of the ServiceDiscovery trait.
//! Uses the Kubernetes API to discover service endpoints. Supports both
//! in-cluster and out-of-cluster configurations.
//!
//! Kubernetes service discovery works by querying the Kubernetes API for
//! Endpoints resources, which contain the actual pod IPs and ports for
//! a given service.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

// ===== Kubernetes Configuration =====

/// Configuration for Kubernetes service discovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct K8sConfig {
    /// Kubernetes API server URL (e.g., "https://kubernetes.default.svc").
    pub api_server: String,
    /// Kubernetes namespace to query services in. Defaults to "default".
    #[serde(default = "default_namespace")]
    pub namespace: String,
    /// Bearer token for authentication (optional, auto-detected in-cluster).
    #[serde(default)]
    pub token: Option<String>,
    /// Path to CA certificate (optional, auto-detected in-cluster).
    #[serde(default)]
    pub ca_cert_path: Option<String>,
    /// Request timeout in seconds. Defaults to 10.
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    /// Whether to skip TLS verification. Defaults to false.
    #[serde(default)]
    pub skip_tls_verify: bool,
    /// Service label selector (optional, e.g., "app=myapp").
    #[serde(default)]
    pub label_selector: Option<String>,
}

fn default_namespace() -> String {
    "default".to_string()
}

fn default_timeout() -> u64 {
    10
}

impl Default for K8sConfig {
    fn default() -> Self {
        Self {
            api_server: "https://kubernetes.default.svc".to_string(),
            namespace: default_namespace(),
            token: None,
            ca_cert_path: None,
            timeout_secs: default_timeout(),
            skip_tls_verify: false,
            label_selector: None,
        }
    }
}

impl K8sConfig {
    /// Create configuration from in-cluster environment.
    ///
    /// Reads the service account token and CA certificate from the standard
    /// in-cluster locations, and uses the KUBERNETES_SERVICE_HOST and
    /// KUBERNETES_SERVICE_PORT environment variables for the API server URL.
    pub fn from_in_cluster() -> Result<Self, ServiceClientError> {
        let host = std::env::var("KUBERNETES_SERVICE_HOST")
            .map_err(|_| ServiceClientError::OperationFailed(
                "KUBERNETES_SERVICE_HOST not set (not running in cluster)".to_string()
            ))?;
        let port = std::env::var("KUBERNETES_SERVICE_PORT")
            .unwrap_or_else(|_| "443".to_string());

        let token = std::fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/token")
            .ok()
            .map(|s| s.trim().to_string());

        let namespace = std::fs::read_to_string("/var/run/secrets/kubernetes.io/serviceaccount/namespace")
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|_| default_namespace());

        Ok(Self {
            api_server: format!("https://{}:{}", host, port),
            namespace,
            token,
            ca_cert_path: Some("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt".to_string()),
            timeout_secs: default_timeout(),
            skip_tls_verify: false,
            label_selector: None,
        })
    }
}

// ===== Kubernetes API Types =====

/// Kubernetes Endpoints resource.
#[derive(Debug, Clone, Deserialize)]
struct K8sEndpoints {
    metadata: K8sObjectMeta,
    subsets: Option<Vec<K8sEndpointSubset>>,
}

/// Kubernetes object metadata.
#[derive(Debug, Clone, Deserialize)]
struct K8sObjectMeta {
    name: String,
    namespace: String,
    #[serde(default)]
    labels: HashMap<String, String>,
    #[serde(default)]
    annotations: HashMap<String, String>,
}

/// Kubernetes endpoint subset.
#[derive(Debug, Clone, Deserialize)]
struct K8sEndpointSubset {
    addresses: Option<Vec<K8sEndpointAddress>>,
    ports: Option<Vec<K8sEndpointPort>>,
}

/// Kubernetes endpoint address.
#[derive(Debug, Clone, Deserialize)]
struct K8sEndpointAddress {
    ip: String,
    #[serde(rename = "nodeName")]
    node_name: Option<String>,
    #[serde(rename = "targetRef")]
    target_ref: Option<K8sObjectReference>,
}

/// Kubernetes object reference.
#[derive(Debug, Clone, Deserialize)]
struct K8sObjectReference {
    kind: String,
    name: String,
    namespace: String,
}

/// Kubernetes endpoint port.
#[derive(Debug, Clone, Deserialize)]
struct K8sEndpointPort {
    name: Option<String>,
    port: u16,
    protocol: String,
}

/// Kubernetes Endpoints list response.
#[derive(Debug, Clone, Deserialize)]
struct K8sEndpointsList {
    items: Vec<K8sEndpoints>,
}

/// Kubernetes Service resource (for listing services).
#[derive(Debug, Clone, Deserialize)]
struct K8sService {
    metadata: K8sObjectMeta,
    spec: Option<K8sServiceSpec>,
}

/// Kubernetes Service spec.
#[derive(Debug, Clone, Deserialize)]
struct K8sServiceSpec {
    #[serde(rename = "clusterIP")]
    cluster_ip: Option<String>,
    ports: Option<Vec<K8sServicePort>>,
}

/// Kubernetes Service port.
#[derive(Debug, Clone, Deserialize)]
struct K8sServicePort {
    name: Option<String>,
    port: u16,
    #[serde(rename = "targetPort")]
    target_port: Option<serde_json::Value>,
    protocol: String,
}

/// Kubernetes Service list response.
#[derive(Debug, Clone, Deserialize)]
struct K8sServiceList {
    items: Vec<K8sService>,
}

// ===== Kubernetes Service Discovery Implementation =====

/// Kubernetes-based service discovery implementation.
///
/// Uses the Kubernetes API to discover service endpoints. Services are
/// discovered by querying Endpoints resources, which contain the actual
/// pod IPs and ports.
///
/// # Example
///
/// ```rust
/// use topems_unified_core::shared::k8s_service_discovery::{K8sConfig, K8sServiceDiscovery};
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// // In-cluster configuration (auto-detected)
/// let config = K8sConfig::from_in_cluster()?;
/// let discovery = K8sServiceDiscovery::new(config)?;
///
/// // Discover a service
/// let service = discovery.discover("my-service").await?;
/// println!("Found service: {:?}", service);
///
/// # Ok(())
/// # }
/// ```
pub struct K8sServiceDiscovery {
    config: K8sConfig,
    http_client: Client,
}

impl K8sServiceDiscovery {
    /// Create a new Kubernetes service discovery instance.
    pub fn new(config: K8sConfig) -> Result<Self, ServiceClientError> {
        let timeout = Duration::from_secs(config.timeout_secs);
        let mut builder = Client::builder().timeout(timeout);

        if config.skip_tls_verify {
            builder = builder.danger_accept_invalid_certs(true);
        }

        if let Some(ca_path) = &config.ca_cert_path {
            if let Ok(cert_content) = std::fs::read(ca_path) {
                if let Ok(cert) = reqwest::tls::Certificate::from_pem(&cert_content) {
                    builder = builder.add_root_certificate(cert);
                }
            }
        }

        let http_client = builder
            .build()
            .map_err(ServiceClientError::RequestFailed)?;

        Ok(Self {
            config,
            http_client,
        })
    }

    /// Build the Kubernetes API URL for a given path.
    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.config.api_server.trim_end_matches('/'), path)
    }

    /// Add authorization header if token is available.
    fn add_auth(&self, request: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        if let Some(token) = &self.config.token {
            request.bearer_auth(token)
        } else {
            request
        }
    }

    /// Convert Kubernetes Endpoints to ServiceRegistration.
    fn endpoints_to_registration(endpoints: &K8sEndpoints) -> Option<ServiceRegistration> {
        let subsets = endpoints.subsets.as_ref()?;

        for subset in subsets {
            let addresses = subset.addresses.as_ref()?;
            let ports = subset.ports.as_ref()?;

            if addresses.is_empty() || ports.is_empty() {
                continue;
            }

            // Use the first ready address and first port
            let address = &addresses[0];
            let port = &ports[0];

            let base_url = format!("http://{}:{}", address.ip, port.port);

            let mut metadata = HashMap::new();
            metadata.insert("namespace".to_string(), endpoints.metadata.namespace.clone());
            metadata.insert("service_name".to_string(), endpoints.metadata.name.clone());
            metadata.insert("node_name".to_string(), address.node_name.clone().unwrap_or_default());
            if let Some(target_ref) = &address.target_ref {
                metadata.insert("pod_name".to_string(), target_ref.name.clone());
            }
            if let Some(port_name) = &port.name {
                metadata.insert("port_name".to_string(), port_name.clone());
            }
            metadata.insert("protocol".to_string(), port.protocol.clone());

            // Extract version from labels if present
            let version = endpoints.metadata.labels.get("version")
                .cloned()
                .unwrap_or_else(|| "1.0.0".to_string());

            // Extract description from annotations if present
            let description = endpoints.metadata.annotations.get("description")
                .cloned()
                .unwrap_or_default();

            // Extract tags from labels
            let tags: Vec<String> = endpoints.metadata.labels
                .iter()
                .filter(|(k, _)| k.starts_with("tag-"))
                .map(|(k, v)| format!("{}={}", k.trim_start_matches("tag-"), v))
                .collect();

            Some(ServiceRegistration {
                name: endpoints.metadata.name.clone(),
                base_url,
                version,
                description,
                tags,
                metadata,
                enabled: true,
                registered_at: chrono::Utc::now().to_rfc3339(),
                last_heartbeat: chrono::Utc::now().to_rfc3339(),
            })
        }

        None
    }

    /// Convert Kubernetes Service to ServiceRegistration (using ClusterIP).
    fn service_to_registration(service: &K8sService) -> Option<ServiceRegistration> {
        let spec = service.spec.as_ref()?;
        let cluster_ip = spec.cluster_ip.as_ref()?;
        let ports = spec.ports.as_ref()?;

        if ports.is_empty() {
            return None;
        }

        let port = &ports[0];
        let base_url = format!("http://{}:{}", cluster_ip, port.port);

        let mut metadata = HashMap::new();
        metadata.insert("namespace".to_string(), service.metadata.namespace.clone());
        metadata.insert("service_name".to_string(), service.metadata.name.clone());
        metadata.insert("cluster_ip".to_string(), cluster_ip.clone());
        if let Some(port_name) = &port.name {
            metadata.insert("port_name".to_string(), port_name.clone());
        }
        metadata.insert("protocol".to_string(), port.protocol.clone());

        let version = service.metadata.labels.get("version")
            .cloned()
            .unwrap_or_else(|| "1.0.0".to_string());

        let description = service.metadata.annotations.get("description")
            .cloned()
            .unwrap_or_default();

        let tags: Vec<String> = service.metadata.labels
            .iter()
            .filter(|(k, _)| k.starts_with("tag-"))
            .map(|(k, v)| format!("{}={}", k.trim_start_matches("tag-"), v))
            .collect();

        Some(ServiceRegistration {
            name: service.metadata.name.clone(),
            base_url,
            version,
            description,
            tags,
            metadata,
            enabled: true,
            registered_at: chrono::Utc::now().to_rfc3339(),
            last_heartbeat: chrono::Utc::now().to_rfc3339(),
        })
    }
}

#[async_trait]
impl ServiceDiscovery for K8sServiceDiscovery {
    async fn register(&self, _registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        // Kubernetes services are managed by the Kubernetes API, not by this client.
        // Registration is done by creating Service and Endpoint resources via kubectl
        // or the Kubernetes API. This method is a no-op.
        Err(ServiceClientError::OperationFailed(
            "Kubernetes service registration is managed by Kubernetes API. Use kubectl or K8s API to create services.".to_string()
        ))
    }

    async fn deregister(&self, _name: &str) -> Result<(), ServiceClientError> {
        // Kubernetes services are managed by the Kubernetes API.
        // Deregistration is done by deleting Service resources via kubectl
        // or the Kubernetes API. This method is a no-op.
        Err(ServiceClientError::OperationFailed(
            "Kubernetes service deregistration is managed by Kubernetes API. Use kubectl or K8s API to delete services.".to_string()
        ))
    }

    async fn discover(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        // First try to get Endpoints (actual pod IPs)
        let url = self.build_url(&format!(
            "/api/v1/namespaces/{}/endpoints/{}",
            self.config.namespace, name
        ));

        let request = self.add_auth(self.http_client.get(&url));
        let response = request.send().await.map_err(ServiceClientError::RequestFailed)?;

        if response.status() == 404 {
            // Try Service resource (ClusterIP) as fallback
            return self.discover_via_service(name).await;
        }

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to get endpoints from Kubernetes: {} - {}",
                status, body
            )));
        }

        let endpoints: K8sEndpoints = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        Ok(Self::endpoints_to_registration(&endpoints))
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        let mut url = self.build_url(&format!(
            "/api/v1/namespaces/{}/endpoints",
            self.config.namespace
        ));

        if let Some(selector) = &self.config.label_selector {
            url.push_str(&format!("?labelSelector={}", selector));
        }

        let request = self.add_auth(self.http_client.get(&url));
        let response = request.send().await.map_err(ServiceClientError::RequestFailed)?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to list endpoints from Kubernetes: {} - {}",
                status, body
            )));
        }

        let endpoints_list: K8sEndpointsList = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        let services: Vec<ServiceRegistration> = endpoints_list.items
            .iter()
            .filter_map(Self::endpoints_to_registration)
            .collect();

        Ok(services)
    }

    async fn heartbeat(&self, _name: &str) -> Result<(), ServiceClientError> {
        // Kubernetes manages pod health via liveness and readiness probes.
        // Heartbeat is not needed for Kubernetes service discovery.
        Ok(())
    }
}

impl K8sServiceDiscovery {
    /// Discover a service via the Service resource (ClusterIP) as fallback.
    async fn discover_via_service(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let url = self.build_url(&format!(
            "/api/v1/namespaces/{}/services/{}",
            self.config.namespace, name
        ));

        let request = self.add_auth(self.http_client.get(&url));
        let response = request.send().await.map_err(ServiceClientError::RequestFailed)?;

        if response.status() == 404 {
            return Ok(None);
        }

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ServiceClientError::OperationFailed(format!(
                "Failed to get service from Kubernetes: {} - {}",
                status, body
            )));
        }

        let service: K8sService = response
            .json()
            .await
            .map_err(|e| ServiceClientError::ParseFailed(e.to_string()))?;

        Ok(Self::service_to_registration(&service))
    }
}

// ===== Kubernetes Service Discovery Builder =====

/// Builder for K8sServiceDiscovery.
pub struct K8sServiceDiscoveryBuilder {
    config: K8sConfig,
}

impl K8sServiceDiscoveryBuilder {
    /// Create a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: K8sConfig::default(),
        }
    }

    /// Create a builder from in-cluster configuration.
    pub fn from_in_cluster() -> Result<Self, ServiceClientError> {
        Ok(Self {
            config: K8sConfig::from_in_cluster()?,
        })
    }

    /// Set the Kubernetes API server URL.
    pub fn api_server(mut self, api_server: impl Into<String>) -> Self {
        self.config.api_server = api_server.into();
        self
    }

    /// Set the namespace.
    pub fn namespace(mut self, namespace: impl Into<String>) -> Self {
        self.config.namespace = namespace.into();
        self
    }

    /// Set the bearer token.
    pub fn token(mut self, token: impl Into<String>) -> Self {
        self.config.token = Some(token.into());
        self
    }

    /// Set the CA certificate path.
    pub fn ca_cert_path(mut self, path: impl Into<String>) -> Self {
        self.config.ca_cert_path = Some(path.into());
        self
    }

    /// Set the request timeout in seconds.
    pub fn timeout_secs(mut self, timeout: u64) -> Self {
        self.config.timeout_secs = timeout;
        self
    }

    /// Set whether to skip TLS verification.
    pub fn skip_tls_verify(mut self, skip: bool) -> Self {
        self.config.skip_tls_verify = skip;
        self
    }

    /// Set the label selector.
    pub fn label_selector(mut self, selector: impl Into<String>) -> Self {
        self.config.label_selector = Some(selector.into());
        self
    }

    /// Build the K8sServiceDiscovery instance.
    pub fn build(self) -> Result<K8sServiceDiscovery, ServiceClientError> {
        K8sServiceDiscovery::new(self.config)
    }
}

impl Default for K8sServiceDiscoveryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_k8s_config_default() {
        let config = K8sConfig::default();
        assert_eq!(config.api_server, "https://kubernetes.default.svc");
        assert_eq!(config.namespace, "default");
        assert_eq!(config.timeout_secs, 10);
        assert!(!config.skip_tls_verify);
    }

    #[test]
    fn test_k8s_config_from_in_cluster_not_in_cluster() {
        // This should fail when not running in a Kubernetes cluster
        let result = K8sConfig::from_in_cluster();
        assert!(result.is_err());
    }

    #[test]
    fn test_build_url() {
        let config = K8sConfig::default();
        let discovery = K8sServiceDiscovery::new(config).unwrap();
        let url = discovery.build_url("/api/v1/namespaces/default/endpoints/test");
        assert_eq!(url, "https://kubernetes.default.svc/api/v1/namespaces/default/endpoints/test");
    }

    #[test]
    fn test_endpoints_to_registration() {
        let endpoints = K8sEndpoints {
            metadata: K8sObjectMeta {
                name: "test-service".to_string(),
                namespace: "default".to_string(),
                labels: HashMap::new(),
                annotations: HashMap::new(),
            },
            subsets: Some(vec![K8sEndpointSubset {
                addresses: Some(vec![K8sEndpointAddress {
                    ip: "10.0.0.1".to_string(),
                    node_name: Some("node-1".to_string()),
                    target_ref: Some(K8sObjectReference {
                        kind: "Pod".to_string(),
                        name: "test-pod-1".to_string(),
                        namespace: "default".to_string(),
                    }),
                }]),
                ports: Some(vec![K8sEndpointPort {
                    name: Some("http".to_string()),
                    port: 8080,
                    protocol: "TCP".to_string(),
                }]),
            }]),
        };

        let registration = K8sServiceDiscovery::endpoints_to_registration(&endpoints);
        assert!(registration.is_some());
        let reg = registration.unwrap();
        assert_eq!(reg.name, "test-service");
        assert_eq!(reg.base_url, "http://10.0.0.1:8080");
        assert_eq!(reg.metadata.get("namespace").unwrap(), "default");
        assert_eq!(reg.metadata.get("pod_name").unwrap(), "test-pod-1");
    }

    #[test]
    fn test_endpoints_to_registration_no_subsets() {
        let endpoints = K8sEndpoints {
            metadata: K8sObjectMeta {
                name: "test-service".to_string(),
                namespace: "default".to_string(),
                labels: HashMap::new(),
                annotations: HashMap::new(),
            },
            subsets: None,
        };

        let registration = K8sServiceDiscovery::endpoints_to_registration(&endpoints);
        assert!(registration.is_none());
    }

    #[test]
    fn test_service_to_registration() {
        let service = K8sService {
            metadata: K8sObjectMeta {
                name: "test-service".to_string(),
                namespace: "default".to_string(),
                labels: HashMap::new(),
                annotations: HashMap::new(),
            },
            spec: Some(K8sServiceSpec {
                cluster_ip: Some("10.96.0.1".to_string()),
                ports: Some(vec![K8sServicePort {
                    name: Some("http".to_string()),
                    port: 80,
                    target_port: Some(serde_json::json!(8080)),
                    protocol: "TCP".to_string(),
                }]),
            }),
        };

        let registration = K8sServiceDiscovery::service_to_registration(&service);
        assert!(registration.is_some());
        let reg = registration.unwrap();
        assert_eq!(reg.name, "test-service");
        assert_eq!(reg.base_url, "http://10.96.0.1:80");
        assert_eq!(reg.metadata.get("cluster_ip").unwrap(), "10.96.0.1");
    }

    #[test]
    fn test_builder() {
        let discovery = K8sServiceDiscoveryBuilder::new()
            .api_server("https://k8s-api:6443")
            .namespace("production")
            .token("my-token")
            .timeout_secs(15)
            .skip_tls_verify(true)
            .label_selector("app=myapp")
            .build();

        assert!(discovery.is_ok());
    }

    #[test]
    fn test_endpoints_to_registration_with_labels() {
        let mut labels = HashMap::new();
        labels.insert("version".to_string(), "2.0.0".to_string());
        labels.insert("tag-stable".to_string(), "true".to_string());

        let mut annotations = HashMap::new();
        annotations.insert("description".to_string(), "Test service".to_string());

        let endpoints = K8sEndpoints {
            metadata: K8sObjectMeta {
                name: "test-service".to_string(),
                namespace: "default".to_string(),
                labels,
                annotations,
            },
            subsets: Some(vec![K8sEndpointSubset {
                addresses: Some(vec![K8sEndpointAddress {
                    ip: "10.0.0.1".to_string(),
                    node_name: None,
                    target_ref: None,
                }]),
                ports: Some(vec![K8sEndpointPort {
                    name: None,
                    port: 8080,
                    protocol: "TCP".to_string(),
                }]),
            }]),
        };

        let registration = K8sServiceDiscovery::endpoints_to_registration(&endpoints);
        assert!(registration.is_some());
        let reg = registration.unwrap();
        assert_eq!(reg.version, "2.0.0");
        assert_eq!(reg.description, "Test service");
        assert!(reg.tags.contains(&"stable=true".to_string()));
    }
}
