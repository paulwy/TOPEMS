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
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use trust_dns_resolver::config::{NameServerConfig, Protocol, ResolverConfig, ResolverOpts};
use trust_dns_resolver::TokioAsyncResolver;

use super::service_client::{ServiceClientError, ServiceDiscovery, ServiceRegistration};

/// A resolved endpoint candidate, extracted from a single SRV or A
/// record. Used internally to apply load-balancing strategies.
#[derive(Debug, Clone)]
pub struct EndpointCandidate {
    base_url: String,
    host: String,
    port: u16,
    /// SRV priority (lower wins). For A records, use 0.
    priority: u16,
    /// SRV weight (RFC 2782). For A records and SRV weight=0 groups,
    /// use 1 so the endpoint is still reachable.
    weight: u16,
    metadata: HashMap<String, String>,
}

// ===== Load Balancing Strategy =====

/// Strategy for selecting one endpoint when multiple SRV / A / AAAA
/// records are returned by a single DNS query.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum LoadBalanceStrategy {
    /// Always select the first (lowest-priority for SRV) endpoint.
    First,
    /// Round-robin across the available endpoints per service name.
    RoundRobin,
    /// Randomly select one of the available endpoints.
    Random,
    /// SRV RFC 2782 weighted random: first pick the lowest priority
    /// group, then within that group pick proportionally to `weight`.
    /// For non-SRV discoveries this behaves the same as [`Random`].
    #[default]
    WeightedSrv,
}

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
    /// Load-balancing strategy used when multiple endpoints are found.
    #[serde(default)]
    pub load_balance: LoadBalanceStrategy,
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
            load_balance: LoadBalanceStrategy::default(),
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
    /// Per-service round-robin counter (service name hash -> atomic).
    /// Using a single atomic map keeps things simple without needing
    /// tokio locks on the hot path.
    rr_counters: Arc<std::sync::Mutex<HashMap<String, AtomicU64>>>,
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
            rr_counters: Arc::new(std::sync::Mutex::new(HashMap::new())),
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

    // ===== Load balancing / endpoint selection =====

    /// Select one endpoint from the candidate list using the configured
    /// load-balancing strategy. Returns `None` iff candidates is empty.
    fn select_endpoint(
        &self,
        service_name: &str,
        candidates: &[EndpointCandidate],
    ) -> Option<EndpointCandidate> {
        if candidates.is_empty() {
            return None;
        }

        match self.config.load_balance {
            LoadBalanceStrategy::First => Some(candidates[0].clone()),
            LoadBalanceStrategy::RoundRobin => {
                let mut map = self.rr_counters.lock().unwrap();
                let counter = map
                    .entry(service_name.to_string())
                    .or_insert_with(|| AtomicU64::new(0));
                let idx = counter.fetch_add(1, Ordering::Relaxed) as usize % candidates.len();
                Some(candidates[idx].clone())
            }
            LoadBalanceStrategy::Random => {
                // Simple thread-local RNG (no external crate required).
                use std::collections::hash_map::RandomState;
                use std::hash::{BuildHasher, Hasher};
                let mut hasher = RandomState::new().build_hasher();
                hasher.write_u64(std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_nanos() as u64)
                    .unwrap_or(0));
                hasher.write_usize(candidates.len());
                let idx = (hasher.finish() as usize) % candidates.len();
                Some(candidates[idx].clone())
            }
            LoadBalanceStrategy::WeightedSrv => {
                // 1) Lowest priority group wins (RFC 2782).
                let min_pri = candidates.iter().map(|c| c.priority).min().unwrap_or(0);
                let group: Vec<&EndpointCandidate> = candidates
                    .iter()
                    .filter(|c| c.priority == min_pri)
                    .collect();
                if group.is_empty() {
                    return Some(candidates[0].clone());
                }

                // 2) Weighted random inside the group. Per RFC a weight
                //    of 0 should still participate but with very low
                //    chance. We normalize 0 -> 1 to avoid zero-slots.
                let total_weight: u64 = group
                    .iter()
                    .map(|c| if c.weight == 0 { 1u64 } else { u64::from(c.weight) })
                    .sum();
                if total_weight == 0 {
                    return Some(group[0].clone());
                }

                use std::collections::hash_map::RandomState;
                use std::hash::{BuildHasher, Hasher};
                let mut hasher = RandomState::new().build_hasher();
                hasher.write_u64(std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_nanos() as u64)
                    .unwrap_or(0));
                hasher.write_u64(total_weight);
                let mut pick = (hasher.finish() as u64) % total_weight;

                for c in &group {
                    let w = if c.weight == 0 { 1u64 } else { u64::from(c.weight) };
                    if pick < w {
                        return Some((*c).clone());
                    }
                    pick -= w;
                }
                Some(group[group.len() - 1].clone())
            }
        }
    }

    /// Build a `ServiceRegistration` from a chosen endpoint candidate
    /// and (optionally) the full list of candidates, which are stashed
    /// into `metadata["all_endpoints"]` (JSON array) for callers that
    /// want to do their own balancing / failover.
    fn build_registration(
        &self,
        name: &str,
        chosen: EndpointCandidate,
        all: &[EndpointCandidate],
    ) -> ServiceRegistration {
        let mut metadata = chosen.metadata.clone();
        if all.len() > 1 {
            let list: Vec<&str> = all.iter().map(|c| c.base_url.as_str()).collect();
            if let Ok(json) = serde_json::to_string(&list) {
                metadata.insert("all_endpoints".to_string(), json);
            }
            metadata.insert("endpoint_count".to_string(), all.len().to_string());
        }
        metadata.insert("load_balance_strategy".to_string(), format!("{:?}", self.config.load_balance));

        ServiceRegistration {
            name: name.to_string(),
            base_url: chosen.base_url,
            version: "1.0.0".to_string(),
            description: format!("DNS discovered service: {} ({} endpoints)", name, all.len()),
            tags: Vec::new(),
            metadata,
            enabled: true,
            registered_at: chrono::Utc::now().to_rfc3339(),
            last_heartbeat: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Discover **all** endpoints for a service (SRV or A/AAAA records).
    /// This is the multi-port / multi-IP entry point; [`discover`] calls
    /// through to this and then applies the configured load-balancing
    /// strategy to return exactly one endpoint.
    ///
    /// Returns an empty list when no records are found.
    pub async fn discover_all(&self, name: &str) -> Result<Vec<EndpointCandidate>, ServiceClientError> {
        let srv_candidates = if self.config.use_srv {
            match self.discover_srv_candidates(name).await {
                Ok(Some(list)) if !list.is_empty() => list,
                Ok(_) => {
                    // Fall back to A/AAAA records
                    self.discover_a_candidates(name).await?
                }
                Err(e) => {
                    tracing::debug!("SRV lookup failed, falling back to A/AAAA: {}", e);
                    self.discover_a_candidates(name).await?
                }
            }
        } else {
            self.discover_a_candidates(name).await?
        };
        Ok(srv_candidates)
    }

    /// Discover all SRV record candidates (multi-port support: returns
    /// every SRV record in the lookup, not just the first one).
    async fn discover_srv_candidates(
        &self,
        name: &str,
    ) -> Result<Option<Vec<EndpointCandidate>>, ServiceClientError> {
        let srv_name = self.build_srv_name(name);

        let lookup = self
            .resolver
            .srv_lookup(&srv_name)
            .await
            .map_err(|e| {
                ServiceClientError::OperationFailed(format!(
                    "SRV lookup failed for {}: {}",
                    srv_name, e
                ))
            })?;

        let mut candidates = Vec::new();
        for srv in lookup.iter() {
            let host = srv.target().to_string().trim_end_matches('.').to_string();
            let port = srv.port();
            let base_url = format!("http://{}:{}", host, port);

            let mut metadata = HashMap::new();
            metadata.insert("srv_name".to_string(), srv_name.clone());
            metadata.insert("srv_target".to_string(), host.clone());
            metadata.insert("srv_port".to_string(), port.to_string());
            metadata.insert("srv_priority".to_string(), srv.priority().to_string());
            metadata.insert("srv_weight".to_string(), srv.weight().to_string());

            candidates.push(EndpointCandidate {
                base_url,
                host,
                port,
                priority: srv.priority(),
                weight: srv.weight(),
                metadata,
            });
        }

        if candidates.is_empty() {
            Ok(None)
        } else {
            Ok(Some(candidates))
        }
    }

    /// Discover a service via SRV records.
    ///
    /// This keeps the original signature but now supports **multiple**
    /// SRV records (multi-port): it resolves every SRV record, applies
    /// the configured load-balancing strategy, and returns one.
    async fn discover_srv(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let Some(candidates) = self.discover_srv_candidates(name).await? else {
            return Ok(None);
        };
        let chosen = self.select_endpoint(name, &candidates).unwrap();
        Ok(Some(self.build_registration(name, chosen, &candidates)))
    }

    /// Return every A/AAAA-resolved endpoint (one per returned IP).
    async fn discover_a_candidates(
        &self,
        name: &str,
    ) -> Result<Vec<EndpointCandidate>, ServiceClientError> {
        let a_name = self.build_a_name(name);
        let lookup = self
            .resolver
            .lookup_ip(&a_name)
            .await
            .map_err(|e| {
                ServiceClientError::OperationFailed(format!(
                    "A/AAAA lookup failed for {}: {}",
                    a_name, e
                ))
            })?;

        let mut candidates = Vec::new();
        let port = self.config.default_port;
        for ip in lookup.iter() {
            let base_url = format!("http://{}:{}", ip, port);
            let mut metadata = HashMap::new();
            metadata.insert("dns_name".to_string(), a_name.clone());
            metadata.insert("resolved_ip".to_string(), ip.to_string());
            metadata.insert("default_port".to_string(), port.to_string());

            candidates.push(EndpointCandidate {
                base_url,
                host: ip.to_string(),
                port,
                priority: 0,
                weight: 1,
                metadata,
            });
        }
        Ok(candidates)
    }

    /// Discover a service via A/AAAA records.
    ///
    /// Returns all resolved IPs (multi-IP support) and picks one via
    /// the configured load-balancing strategy.
    async fn discover_a(&self, name: &str) -> Result<Option<ServiceRegistration>, ServiceClientError> {
        let candidates = self.discover_a_candidates(name).await?;
        if candidates.is_empty() {
            return Ok(None);
        }
        let chosen = self.select_endpoint(name, &candidates).unwrap();
        Ok(Some(self.build_registration(name, chosen, &candidates)))
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

    /// Set the load-balancing strategy.
    pub fn load_balance(mut self, strategy: LoadBalanceStrategy) -> Self {
        self.config.load_balance = strategy;
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

    // ===== Load balancing / selection unit tests (no network required) =====

    fn fake_candidates(count: u16, base_priority: u16, base_weight: u16) -> Vec<EndpointCandidate> {
        (0..count)
            .map(|i| EndpointCandidate {
                base_url: format!("http://host{}:{}", i, 8000 + u16::from(i)),
                host: format!("host{}", i),
                port: 8000 + u16::from(i),
                priority: base_priority,
                weight: if base_weight == 0 { 0 } else { base_weight + i },
                metadata: HashMap::new(),
            })
            .collect()
    }

    fn discovery_with(strategy: LoadBalanceStrategy) -> DnsServiceDiscovery {
        DnsServiceDiscovery::new(DnsConfig {
            load_balance: strategy,
            ..Default::default()
        })
        .unwrap()
    }

    #[test]
    fn test_lb_strategy_default_is_weighted_srv() {
        assert_eq!(LoadBalanceStrategy::default(), LoadBalanceStrategy::WeightedSrv);
        let cfg = DnsConfig::default();
        assert_eq!(cfg.load_balance, LoadBalanceStrategy::WeightedSrv);
    }

    #[test]
    fn test_select_endpoint_empty_returns_none() {
        let d = discovery_with(LoadBalanceStrategy::First);
        assert!(d.select_endpoint("any", &[]).is_none());
    }

    #[test]
    fn test_select_first_always_index_zero() {
        let d = discovery_with(LoadBalanceStrategy::First);
        let c = fake_candidates(5, 10, 1);
        for _ in 0..10 {
            let chosen = d.select_endpoint("svc", &c).unwrap();
            assert_eq!(chosen.port, 8000);
        }
    }

    #[test]
    fn test_select_round_robin_cycles_through_candidates() {
        let d = discovery_with(LoadBalanceStrategy::RoundRobin);
        let c = fake_candidates(3, 10, 1);
        let picks: Vec<u16> = (0..6)
            .map(|_| d.select_endpoint("rr-svc", &c).unwrap().port)
            .collect();
        assert_eq!(picks, vec![8000, 8001, 8002, 8000, 8001, 8002]);
    }

    #[test]
    fn test_select_round_robin_per_service_is_independent() {
        let d = discovery_with(LoadBalanceStrategy::RoundRobin);
        let c = fake_candidates(2, 10, 1);
        // Three hits on "a", one on "b", then on "a" again should pick index 0 (3 % 2 = 1?) Wait no:
        // counter(a)=0->1->2->3 -> picks: idx0, idx1, idx0, idx1
        // counter(b)=0->1 -> picks: idx0, idx1
        let picks_a = (0..4)
            .map(|_| d.select_endpoint("a", &c).unwrap().port)
            .collect::<Vec<_>>();
        let picks_b = (0..2)
            .map(|_| d.select_endpoint("b", &c).unwrap().port)
            .collect::<Vec<_>>();
        assert_eq!(picks_a, vec![8000, 8001, 8000, 8001]);
        assert_eq!(picks_b, vec![8000, 8001]);
    }

    #[test]
    fn test_select_random_picks_within_range() {
        let d = discovery_with(LoadBalanceStrategy::Random);
        let c = fake_candidates(4, 10, 1);
        for _ in 0..20 {
            let port = d.select_endpoint("x", &c).unwrap().port;
            assert!((8000..=8003).contains(&port));
        }
    }

    #[test]
    fn test_weighted_srv_picks_lowest_priority_group_first() {
        let d = discovery_with(LoadBalanceStrategy::WeightedSrv);
        let c = vec![
            // Higher-priority group (worse priority value per RFC 2782)
            EndpointCandidate {
                base_url: "http://slow:9000".to_string(),
                host: "slow".to_string(), port: 9000,
                priority: 100, weight: 60000, metadata: HashMap::new(),
            },
            // Lower-priority number = should win, even with tiny weight.
            EndpointCandidate {
                base_url: "http://fast1:9001".to_string(),
                host: "fast1".to_string(), port: 9001,
                priority: 10, weight: 1, metadata: HashMap::new(),
            },
            EndpointCandidate {
                base_url: "http://fast2:9002".to_string(),
                host: "fast2".to_string(), port: 9002,
                priority: 10, weight: 1, metadata: HashMap::new(),
            },
        ];
        for _ in 0..50 {
            let port = d.select_endpoint("s", &c).unwrap().port;
            assert!(port == 9001 || port == 9002, "expected lowest priority group, got {}", port);
        }
    }

    #[test]
    fn test_weighted_srv_zero_weight_still_participates() {
        let d = discovery_with(LoadBalanceStrategy::WeightedSrv);
        let c = vec![
            EndpointCandidate {
                base_url: "http://a:1".to_string(), host: "a".to_string(),
                port: 1, priority: 0, weight: 0, metadata: HashMap::new(),
            },
            EndpointCandidate {
                base_url: "http://b:2".to_string(), host: "b".to_string(),
                port: 2, priority: 0, weight: 0, metadata: HashMap::new(),
            },
        ];
        // With both weights == 0 they become weight=1 each, so both are reachable.
        let mut seen = std::collections::BTreeSet::new();
        for _ in 0..50 {
            seen.insert(d.select_endpoint("z", &c).unwrap().port);
        }
        assert!(seen.contains(&1) && seen.contains(&2), "both zero-weight endpoints should be reachable; seen={:?}", seen);
    }

    #[test]
    fn test_build_registration_stashes_all_endpoints() {
        let d = discovery_with(LoadBalanceStrategy::First);
        let candidates = fake_candidates(3, 0, 5);
        let chosen = candidates[1].clone();
        let reg = d.build_registration("crm", chosen, &candidates);
        assert_eq!(reg.metadata.get("endpoint_count").unwrap(), "3");
        let all = reg.metadata.get("all_endpoints").unwrap();
        let list: Vec<String> = serde_json::from_str(all).unwrap();
        assert_eq!(list.len(), 3);
        assert!(list.iter().any(|u| u == "http://host0:8000"));
        assert!(list.iter().any(|u| u == "http://host2:8002"));
        assert!(reg.metadata.get("load_balance_strategy").is_some());
    }

    #[test]
    fn test_builder_sets_load_balance_strategy() {
        let b = DnsServiceDiscoveryBuilder::default();
        let built = b.load_balance(LoadBalanceStrategy::RoundRobin).build().unwrap();
        assert_eq!(built.config.load_balance, LoadBalanceStrategy::RoundRobin);
    }

    #[test]
    fn test_lb_strategy_serde_snake_case() {
        use serde_json::json;
        let s: LoadBalanceStrategy = serde_json::from_value(json!("weighted_srv")).unwrap();
        assert_eq!(s, LoadBalanceStrategy::WeightedSrv);
        let s: LoadBalanceStrategy = serde_json::from_value(json!("round_robin")).unwrap();
        assert_eq!(s, LoadBalanceStrategy::RoundRobin);
        assert_eq!(
            serde_json::to_value(LoadBalanceStrategy::WeightedSrv).unwrap(),
            json!("weighted_srv")
        );
    }
}
