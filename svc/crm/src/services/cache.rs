// CRM 服务缓存模块
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};

struct CacheEntry<V> {
    value: V,
    expires_at: Option<Instant>,
}

impl<V> CacheEntry<V> {
    fn new(value: V, ttl_seconds: Option<u64>) -> Self {
        let expires_at = ttl_seconds.map(|ttl| Instant::now() + Duration::from_secs(ttl));
        Self { value, expires_at }
    }

    fn is_expired(&self) -> bool {
        self.expires_at.map(|exp| Instant::now() > exp).unwrap_or(false)
    }
}

pub struct CrmCacheService {
    customer_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    contact_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    opportunity_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    dashboard_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    default_ttl: u64,
}

impl Default for CrmCacheService {
    fn default() -> Self {
        Self::new()
    }
}

impl CrmCacheService {
    pub fn new() -> Self {
        Self {
            customer_cache: Arc::new(RwLock::new(HashMap::new())),
            contact_cache: Arc::new(RwLock::new(HashMap::new())),
            opportunity_cache: Arc::new(RwLock::new(HashMap::new())),
            dashboard_cache: Arc::new(RwLock::new(HashMap::new())),
            default_ttl: 3600,
        }
    }

    // 客户缓存
    pub async fn get_customer(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.customer_cache.read().await;
        cache.get(id).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_customer(&self, id: &str, customer: serde_json::Value) {
        let mut cache = self.customer_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(customer, Some(self.default_ttl)));
    }

    pub async fn delete_customer(&self, id: &str) {
        let mut cache = self.customer_cache.write().await;
        cache.remove(id);
    }

    // 联系人缓存
    pub async fn get_contact(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.contact_cache.read().await;
        cache.get(id).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_contact(&self, id: &str, contact: serde_json::Value) {
        let mut cache = self.contact_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(contact, Some(self.default_ttl)));
    }

    // 商机缓存
    pub async fn get_opportunity(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.opportunity_cache.read().await;
        cache.get(id).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_opportunity(&self, id: &str, opportunity: serde_json::Value) {
        let mut cache = self.opportunity_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(opportunity, Some(self.default_ttl)));
    }

    // 仪表盘缓存（较短 TTL）
    pub async fn get_dashboard(&self, key: &str) -> Option<serde_json::Value> {
        let cache = self.dashboard_cache.read().await;
        cache.get(key).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_dashboard(&self, key: &str, data: serde_json::Value) {
        let mut cache = self.dashboard_cache.write().await;
        // 仪表盘缓存 5 分钟
        cache.insert(key.to_string(), CacheEntry::new(data, Some(300)));
    }

    pub async fn get_stats(&self) -> CacheStats {
        CacheStats {
            customer_count: self.customer_cache.read().await.len(),
            contact_count: self.contact_cache.read().await.len(),
            opportunity_count: self.opportunity_cache.read().await.len(),
            dashboard_count: self.dashboard_cache.read().await.len(),
            default_ttl: self.default_ttl,
        }
    }

    pub async fn clear_all(&self) {
        self.customer_cache.write().await.clear();
        self.contact_cache.write().await.clear();
        self.opportunity_cache.write().await.clear();
        self.dashboard_cache.write().await.clear();
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CacheStats {
    pub customer_count: usize,
    pub contact_count: usize,
    pub opportunity_count: usize,
    pub dashboard_count: usize,
    pub default_ttl: u64,
}
