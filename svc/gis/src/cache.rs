use std::num::NonZeroUsize;
use std::time::Duration;
use tokio::sync::RwLock;

use lru::LruCache;

pub struct GisCache {
    factory_maps: RwLock<LruCache<String, serde_json::Value>>,
    device_locations: RwLock<LruCache<String, serde_json::Value>>,
    geodata: RwLock<LruCache<String, serde_json::Value>>,
    statistics: RwLock<LruCache<String, serde_json::Value>>,
    ttl: Duration,
}

impl GisCache {
    pub fn new(max_size: usize, ttl_minutes: u64) -> Self {
        let capacity = NonZeroUsize::new(max_size).unwrap_or_else(|| {
            NonZeroUsize::new(1000)
                .unwrap_or_else(|| NonZeroUsize::new(100).expect("100 is non-zero"))
        });
        Self {
            factory_maps: RwLock::new(LruCache::new(capacity)),
            device_locations: RwLock::new(LruCache::new(capacity)),
            geodata: RwLock::new(LruCache::new(capacity)),
            statistics: RwLock::new(LruCache::new(capacity)),
            ttl: Duration::from_secs(ttl_minutes * 60),
        }
    }

    pub async fn get_factory_map(&self, key: &str) -> Option<serde_json::Value> {
        self.get_entry(&self.factory_maps, key).await
    }

    pub async fn set_factory_map(&self, key: &str, value: serde_json::Value) {
        self.set_entry(&self.factory_maps, key, value).await
    }

    pub async fn remove_factory_map(&self, key: &str) {
        self.factory_maps.write().await.pop(key);
    }

    pub async fn get_device_location(&self, key: &str) -> Option<serde_json::Value> {
        self.get_entry(&self.device_locations, key).await
    }

    pub async fn set_device_location(&self, key: &str, value: serde_json::Value) {
        self.set_entry(&self.device_locations, key, value).await
    }

    pub async fn remove_device_location(&self, key: &str) {
        self.device_locations.write().await.pop(key);
    }

    pub async fn get_geodata(&self, key: &str) -> Option<serde_json::Value> {
        self.get_entry(&self.geodata, key).await
    }

    pub async fn set_geodata(&self, key: &str, value: serde_json::Value) {
        self.set_entry(&self.geodata, key, value).await
    }

    pub async fn remove_geodata(&self, key: &str) {
        self.geodata.write().await.pop(key);
    }

    pub async fn get_statistics(&self, key: &str) -> Option<serde_json::Value> {
        self.get_entry(&self.statistics, key).await
    }

    pub async fn set_statistics(&self, key: &str, value: serde_json::Value) {
        self.set_entry(&self.statistics, key, value).await
    }

    async fn get_entry(
        &self,
        cache: &RwLock<LruCache<String, serde_json::Value>>,
        key: &str,
    ) -> Option<serde_json::Value> {
        let mut cache = cache.write().await;
        if let Some(value) = cache.get(key) {
            Some(value.clone())
        } else {
            None
        }
    }

    async fn set_entry(
        &self,
        cache: &RwLock<LruCache<String, serde_json::Value>>,
        key: &str,
        value: serde_json::Value,
    ) {
        let mut cache = cache.write().await;
        cache.put(key.to_string(), value);
    }

    pub async fn invalidate_all(&self) {
        self.factory_maps.write().await.clear();
        self.device_locations.write().await.clear();
        self.geodata.write().await.clear();
        self.statistics.write().await.clear();
    }

    pub async fn invalidate_factory_maps(&self) {
        self.factory_maps.write().await.clear();
    }

    pub async fn invalidate_device_locations(&self) {
        self.device_locations.write().await.clear();
    }

    pub async fn invalidate_geodata(&self) {
        self.geodata.write().await.clear();
    }

    pub async fn invalidate_statistics(&self) {
        self.statistics.write().await.clear();
    }
}
