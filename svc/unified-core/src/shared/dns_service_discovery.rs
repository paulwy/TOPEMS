//! V459: DNS-based Service Discovery
//!
//! Provides a DNS-based implementation of the ServiceDiscovery trait.
//! Supports both SRV record-based service discovery (standard for
//! microservices) and simple A/AAAA record-based discovery.
//!
//! DNS service discovery works by querying DNS records for service
//! information. SRV records contain both the host and port, while
//! A/AAAA records only contain the IP address (port must be known
//! or configured).

use std::collections::HashMap;
use std::net::ToSocketAddrs;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use trust_dns_resolver::config::{NameServerConfig, Protocol, ResolverConfig, ResolverOpts};
use trust_dns_resolver::TokioAsyncResolver;

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

// ===== DNS Configuration =====

/// Configuration for DNS service discovery.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsConfig {
    /// DNS server addresses (e.g., "8.8.8.8:53", "127.0.0.1:53").
    /// If empty, uses system DNS configuration.
    #[serde(default)]
    pub nameservers: Vec<String>,
    /// Default port for A/AAAA record-based discovery. Defaults to 80.
    #[serde(default = "default_port")]
    pub default_port: u16,
    /// DNS search domain for SRV records (e.g., "svc.cluster.local").
    #[serde(default)]
    pub search_domain: Option<String>,
    /// Whether to use SRV records. Defaults to true.
    #[serde(default = "default_use_srv")]
    pub use_srv: bool,
    /// Cache TTL in seconds. Defaults to 30.
    #[serde(default = "default_cache_ttl")]
    pub cache_ttl_secs: u64,
    /// Request timeout in seconds. Defaults to 5.
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
}

fn default_port() -> u16 {
    80
}

fn default_use_srv() -> bool {
    true
}

fn default_cache_ttl() -> u64 {
    30
}

fn default_timeout() -> u64 {
    5
}

impl Default for DnsConfig {
    fn default() -> Self {
        Self {
            nameservers: Vec::new(),
            default_port: default_port(),
            search_domain: None,
            use_srv: default_use_srv(),
            cache_ttl_secs: default_cache_ttl(),
            timeout_secs: default_timeout(),
        }
    }
}

// ===== Cache Types =====

/// Cached service entry with TTL tracking.
#[derive(Debug, Clone)]
struct CachedService {
    registration: ServiceRegistration,
    cached_at: std::time::Instant,
}

// ===== DNS Service Discovery Implementation =====

/// DNS-based service discovery implementation.
///
/// Supports both SRV record-based discovery (RFC 2782) and simple
/// A/AAAA record-based discovery. Uses trust-dns-resolver for async
/// DNS resolution with caching.
///
/// # SRV Record Format
///
/// SRV records use the format: `_service._proto.name.`
/// For example: `_http._tcp.crm.svc.cluster.local.`
///
/// # Example
///
/// ```rust
/// use topems_unified_core::shared::dns_service_discovery::{DnsConfig, DnsServiceDiscovery};
///
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// let config = DnsConfig {
///     search_domain: Some("svc.cluster.local".to_string()),
///     ..Default::default()
/// };
///
/// let discovery = DnsServiceDiscovery::new(config)?;
///
/// // Discover a service (uses SRV records)
/// let service = discovery.discover("crm").await?;
/// println!("Found service: {:?}", service);
///
/// # Ok(())
/// # }
/// ```
pub struct DnsServiceDiscovery {
    config: DnsConfig,
    resolver: TokioAsyncResolver,
    /// In-memory cache: service_name -> CachedService.
    cache: Arc<RwLock<HashMap<String, CachedService>>>,
}

impl DnsServiceDiscovery {
    /// Create a new DNS service discovery instance.
    pub fn new(config: DnsConfig) -> Result<Self, ServiceClientError> {
        let resolver = if config.nameservers.is_empty() {
            // Use system DNS configuration
            TokioAsyncResolver::tokio_from_system_conf()
                .map_err(|e| ServiceClientError::OperationFailed(format!(
                    "Failed to create DNS resolver from system config: {}", e
                )))?
        } else {
            // Use custom nameservers
            let mut resolver_config = ResolverConfig::new();
            for ns in &config.nameservers {
                let socket_addr = ns
                    .to_socket_addrs()
                    .map_err(|e| ServiceClientError::InvalidUrl(format!(
                        "Invalid nameserver {}: {}", ns, e
                    )))?
                    .next()
                    .ok_or_else(|| ServiceClientError::InvalidUrl(format!(
                        "Could not resolve nameserver: {}", ns
                    )))?;

                resolver_config.add_name_server(NameServerConfig {
                    socket_addr,
                    protocol: Protocol::Udp,
                    tls_dns_name: None,
                    trust_negative_responses: false,
                    bind_addr: None,
                });
            }

            let mut opts = ResolverOpts::default();
            opts.timeout = Duration::from_secs(config.timeout_secs);
            opts.cache_size = 32;

            TokioAsyncResolver::tokio(resolver_config, opts)
        };

        Ok(Self {
            config,
            resolver,
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Build the SRV record name for a service.
    fn build_srv_name(&self, name: &str) -> String {
        if let Some(domain) = &self.config.search_domain {
            format!("_http._tcp.{}.{}.", name, domain.trim_end_matches('.'))
        } else {
            format!("_http._tcp.{}.", name)
        }
    }

    /// Build the A record name for a service.
    fn build_a_name(&self, name: &str) -> String {
        if let Some(domain) = &self.config.search_domain {
            format!("{}.{}.", name, domain.trim_end_matches('.'))
        } else {
            name.to_string()
        }
    }

    /// Check if a cached entry is still valid.
    fn is_cache_valid(&self, cached: &CachedService) -> bool {
        cached.cached_at.elapsed().as_secs() < self.config.cache_ttl_secs
    }

    /// Get a service from cache if valid.
    async fn get_cached(&self, name: &str) -> Option<ServiceRegistration> {
        let cache = self.cache.read().await;
        cache.get(name)
            .filter(|c| self.is_cache_valid(c))
            .map(|c| c.registration.clone())
    }

    /// Store a service in cache.
    async fn set_cached(&self, name: &str, registration: ServiceRegistration) {
        let mut cache = self.cache.write().await;
        cache.insert(
            name.to_string(),
            CachedService {
                registration,
                cached_at: std::time::Instant::now(),
            },
        );
    }

    /// Invalidate cache for a service.
    async fn invalidate_cache(&self, name: &str) {
        let mut cache = self.cache.write().await;
        cache.remove(name);
    }

    /// Discover a service via SRV records.
    async fn discover_srv(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let srv_name = self.build_srv_name(name);

        let lookup = self.resolver
            .srv_lookup(&srv_name)
            .await
            .map_err(|e| ServiceClientError::OperationFailed(format!(
                "SRV lookup failed for {}: {}", srv_name, e
            )))?;

        let srv = lookup.iter().next();
        let Some(srv) = srv else {
            return Ok(None);
        };

        let host = srv.target().to_string().trim_end_matches('.').to_string();
        let port = srv.port();
        let base_url = format!("http://{}:{}", host, port);

        let mut metadata = HashMap::new();
        metadata.insert("srv_name".to_string(), srv_name);
        metadata.insert("srv_target".to_string(), host.clone());
        metadata.insert("srv_port".to_string(), port.to_string());
        metadata.insert("srv_priority".to_string(), srv.priority().to_string());
        metadata.insert("srv_weight".to_string(), srv.weight().to_string());

        Ok(Some(ServiceRegistration {
            name: name.to_string(),
            base_url,
            version: "1.0.0".to_string(),
            description: format!("DNS SRV discovered service: {}", name),
            tags: Vec::new(),
            metadata,
            enabled: true,
            registered_at: chrono::Utc::now().to_rfc3339(),
            last_heartbeat: chrono::Utc::now().to_rfc3339(),
        }))
    }

    /// Discover a service via A/AAAA records.
    async fn discover_a(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let a_name = self.build_a_name(name);

        let lookup = self.resolver
            .lookup_ip(&a_name)
            .await
            .map_err(|e| ServiceClientError::OperationFailed(format!(
                "A/AAAA lookup failed for {}: {}", a_name, e
            )))?;

        let ip = lookup.iter().next();
        let Some(ip) = ip else {
            return Ok(None);
        };

        let port = self.config.default_port;
        let base_url = format!("http://{}:{}", ip, port);

        let mut metadata = HashMap::new();
        metadata.insert("dns_name".to_string(), a_name);
        metadata.insert("resolved_ip".to_string(), ip.to_string());
        metadata.insert("default_port".to_string(), port.to_string());

        Ok(Some(ServiceRegistration {
            name: name.to_string(),
            base_url,
            version: "1.0.0".to_string(),
            description: format!("DNS A/AAAA discovered service: {}", name),
            tags: Vec::new(),
            metadata,
            enabled: true,
            registered_at: chrono::Utc::now().to_rfc3339(),
            last_heartbeat: chrono::Utc::now().to_rfc3339(),
        }))
    }

    /// Clear the entire cache.
    pub async fn clear_cache(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }

    /// Get cache size.
    pub async fn cache_size(&self) -> usize {
        self.cache.read().await.len()
    }
}

#[async_trait]
impl ServiceDiscovery for DnsServiceDiscovery {
    async fn register(&self, _registration: ServiceRegistration) -> Result<(), ServiceClientError> {
        // DNS records are managed by DNS servers, not by this client.
        // Registration is done by configuring DNS records (e.g., via
        // Kubernetes, Consul, or manual DNS configuration).
        Err(ServiceClientError::OperationFailed(
            "DNS service registration is managed by DNS server. Configure DNS records to register services.".to_string()
        ))
    }

    async fn deregister(&self, _name: &str) -> Result<(), ServiceClientError> {
        // DNS records are managed by DNS servers.
        Err(ServiceClientError::OperationFailed(
            "DNS service deregistration is managed by DNS server. Remove DNS records to deregister services.".to_string()
        ))
    }

    async fn discover(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        // Check cache first
        if let Some(cached) = self.get_cached(name).await {
            return Ok(Some(cached));
        }

        // Try SRV records first if enabled
        let result = if self.config.use_srv {
            match self.discover_srv(name).await {
                Ok(Some(service)) => Ok(Some(service)),
                Ok(None) => {
                    // Fall back to A/AAAA records
                    self.discover_a(name).await
                }
                Err(e) => {
                    // SRV failed, try A/AAAA as fallback
                    tracing::debug!("SRV lookup failed, falling back to A/AAAA: {}", e);
                    self.discover_a(name).await
                }
            }
        } else {
            self.discover_a(name).await
        };

        // Cache the result if successful
        if let Ok(Some(service)) = &result {
            self.set_cached(name, service.clone()).await;
        }

        result
    }

    async fn list_services(&self) -> Result<Vec<ServiceRegistration>, ServiceClientError> {
        // DNS does not support listing all services without knowing their names.
        // Return cached services as a best-effort list.
        let cache = self.cache.read().await;
        let services: Vec<ServiceRegistration> = cache
            .values()
            .filter(|c| self.is_cache_valid(c))
            .map(|c| c.registration.clone())
            .collect();
        Ok(services)
    }

    async fn heartbeat(&self, _name: &str) -> Result<(), ServiceClientError> {
        // DNS does not require heartbeats. TTL handles expiration.
        Ok(())
    }
}

// ===== DNS Service Discovery Builder =====

/// Builder for DnsServiceDiscovery.
pub struct DnsServiceDiscoveryBuilder {
    config: DnsConfig,
}

impl DnsServiceDiscoveryBuilder {
    /// Create a new builder with default configuration.
    pub fn new() -> Self {
        Self {
            config: DnsConfig::default(),
        }
    }

    /// Add a nameserver.
    pub fn nameserver(mut self, nameserver: impl Into<String>) -> Self {
        self.config.nameservers.push(nameserver.into());
        self
    }

    /// Set multiple nameservers.
    pub fn nameservers(mut self, nameservers: Vec<String>) -> Self {
        self.config.nameservers = nameservers;
        self
    }

    /// Set the default port for A/AAAA record discovery.
    pub fn default_port(mut self, port: u16) -> Self {
        self.config.default_port = port;
        self
    }

    /// Set the search domain for SRV records.
    pub fn search_domain(mut self, domain: impl Into<String>) -> Self {
        self.config.search_domain = Some(domain.into());
        self
    }

    /// Set whether to use SRV records.
    pub fn use_srv(mut self, use_srv: bool) -> Self {
        self.config.use_srv = use_srv;
        self
    }

    /// Set the cache TTL in seconds.
    pub fn cache_ttl_secs(mut self, ttl: u64) -> Self {
        self.config.cache_ttl_secs = ttl;
        self
    }

    /// Set the request timeout in seconds.
    pub fn timeout_secs(mut self, timeout: u64) -> Self {
        self.config.timeout_secs = timeout;
        self
    }

    /// Build the DnsServiceDiscovery instance.
    pub fn build(self) -> Result<DnsServiceDiscovery, ServiceClientError> {
        DnsServiceDiscovery::new(self.config)
    }
}

impl Default for DnsServiceDiscoveryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dns_config_default() {
        let config = DnsConfig::default();
        assert!(config.nameservers.is_empty());
        assert_eq!(config.default_port, 80);
        assert!(config.search_domain.is_none());
        assert!(config.use_srv);
        assert_eq!(config.cache_ttl_secs, 30);
        assert_eq!(config.timeout_secs, 5);
    }

    #[test]
    fn test_build_srv_name_with_domain() {
        let config = DnsConfig {
            search_domain: Some("svc.cluster.local".to_string()),
            ..Default::default()
        };
        let discovery = DnsServiceDiscovery::new(config).unwrap();
        let srv_name = discovery.build_srv_name("crm");
        assert_eq!(srv_name, "_http._tcp.crm.svc.cluster.local.");
    }

    #[test]
    fn test_build_srv_name_without_domain() {
        let config = DnsConfig::default();
        let discovery = DnsServiceDiscovery::new(config).unwrap();
        let srv_name = discovery.build_srv_name("crm");
        assert_eq!(srv_name, "_http._tcp.crm.");
    }

    #[test]
    fn test_build_a_name_with_domain() {
        let config = DnsConfig {
            search_domain: Some("svc.cluster.local".to_string()),
            ..Default::default()
        };
        let discovery = DnsServiceDiscovery::new(config).unwrap();
        let a_name = discovery.build_a_name("crm");
        assert_eq!(a_name, "crm.svc.cluster.local.");
    }

    #[test]
    fn test_build_a_name_without_domain() {
        let config = DnsConfig::default();
        let discovery = DnsServiceDiscovery::new(config).unwrap();
        let a_name = discovery.build_a_name("crm.example.com");
        assert_eq!(a_name, "crm.example.com");
    }

    #[test]
    fn test_is_cache_valid() {
        let config = DnsConfig {
            cache_ttl_secs: 10,
            ..Default::default()
        };
        let discovery = DnsServiceDiscovery::new(config).unwrap();

        let cached = CachedService {
            registration: ServiceRegistration::new("test", "http://localhost:8080"),
            cached_at: std::time::Instant::now(),
        };
        assert!(discovery.is_cache_valid(&cached));
    }

    #[test]
    fn test_builder() {
        let discovery = DnsServiceDiscoveryBuilder::new()
            .nameserver("8.8.8.8:53")
            .nameserver("8.8.4.4:53")
            .default_port(8080)
            .search_domain("svc.cluster.local")
            .use_srv(true)
            .cache_ttl_secs(60)
            .timeout_secs(10)
            .build();

        assert!(discovery.is_ok());
    }

    #[test]
    fn test_builder_default() {
        let builder = DnsServiceDiscoveryBuilder::default();
        let discovery = builder.build();
        assert!(discovery.is_ok());
    }

    #[tokio::test]
    async fn test_cache_operations() {
        let config = DnsConfig {
            cache_ttl_secs: 10,
            ..Default::default()
        };
        let discovery = DnsServiceDiscovery::new(config).unwrap();

        // Initially empty
        assert_eq!(discovery.cache_size().await, 0);

        // Set a cached service
        let service = ServiceRegistration::new("test", "http://localhost:8080");
        discovery.set_cached("test", service).await;
        assert_eq!(discovery.cache_size().await, 1);

        // Get cached service
        let cached = discovery.get_cached("test").await;
        assert!(cached.is_some());
        assert_eq!(cached.unwrap().name, "test");

        // Invalidate cache
        discovery.invalidate_cache("test").await;
        assert_eq!(discovery.cache_size().await, 0);

        // Clear cache
        discovery.set_cached("test1", ServiceRegistration::new("test1", "http://localhost:8081")).await;
        discovery.set_cached("test2", ServiceRegistration::new("test2", "http://localhost:8082")).await;
        assert_eq!(discovery.cache_size().await, 2);
        discovery.clear_cache().await;
        assert_eq!(discovery.cache_size().await, 0);
    }

    // Note: DNS resolution tests require a network connection and DNS server.
    // These are integration tests and should be run in an environment with DNS access.
    // For unit testing, use mock DNS or test the cache and configuration logic.
}
