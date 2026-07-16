use crate::config::CacheConfig;
use crate::error::TopemsError;
use crate::redis::{CacheService, RedisCacheService};
use crate::Result;
use async_trait::async_trait;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::task;

#[derive(Debug, Clone)]
struct CacheEntry {
    value: String,
    expires_at: Option<Instant>,
    last_accessed: Instant,
    access_count: u64,
    created_at: Instant,
}

impl CacheEntry {
    fn new(value: String, ttl: Option<Duration>) -> Self {
        let now = Instant::now();
        Self {
            value,
            expires_at: ttl.map(|d| now + d),
            last_accessed: now,
            access_count: 0,
            created_at: now,
        }
    }

    fn is_expired(&self) -> bool {
        self.expires_at.map(|e| Instant::now() > e).unwrap_or(false)
    }

    fn access(&mut self) {
        self.last_accessed = Instant::now();
        self.access_count += 1;
    }
}

#[derive(Debug, Clone)]
pub enum EvictionPolicy {
    LRU,
    LFU,
    FIFO,
    TTL,
}

impl From<&str> for EvictionPolicy {
    fn from(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "LFU" => EvictionPolicy::LFU,
            "FIFO" => EvictionPolicy::FIFO,
            "TTL" => EvictionPolicy::TTL,
            _ => EvictionPolicy::LRU,
        }
    }
}

#[derive(Debug, Clone)]
pub struct CacheStatistics {
    pub total_entries: usize,
    pub hit_count: u64,
    pub miss_count: u64,
    pub hit_rate: f64,
    pub evictions: u64,
}

#[derive(Debug, Clone)]
pub struct InMemoryCache {
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    config: CacheConfig,
    hit_count: Arc<std::sync::atomic::AtomicU64>,
    miss_count: Arc<std::sync::atomic::AtomicU64>,
    evictions: Arc<std::sync::atomic::AtomicU64>,
}

impl InMemoryCache {
    pub fn new(config: CacheConfig) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            config,
            hit_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            miss_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            evictions: Arc::new(std::sync::atomic::AtomicU64::new(0)),
        }
    }

    pub async fn get(&self, key: &str) -> Option<String> {
        let mut cache = self.cache.write();

        if let Some(entry) = cache.get_mut(key) {
            if entry.is_expired() {
                cache.remove(key);
                self.miss_count
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                return None;
            }
            entry.access();
            self.hit_count
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            Some(entry.value.clone())
        } else {
            self.miss_count
                .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            None
        }
    }

    pub async fn set(&self, key: String, value: String, ttl: Option<Duration>) {
        let mut cache = self.cache.write();

        let entry = CacheEntry::new(
            value,
            ttl.or(Some(Duration::from_secs(self.config.default_ttl))),
        );
        cache.insert(key, entry);

        self.evict_if_needed(&mut cache);
    }

    pub async fn delete(&self, key: &str) {
        self.cache.write().remove(key);
    }

    pub async fn exists(&self, key: &str) -> bool {
        self.cache.read().contains_key(key)
    }

    pub async fn clear(&self) {
        self.cache.write().clear();
    }

    pub fn get_statistics(&self) -> CacheStatistics {
        let cache = self.cache.read();
        let hits = self.hit_count.load(std::sync::atomic::Ordering::Relaxed);
        let misses = self.miss_count.load(std::sync::atomic::Ordering::Relaxed);
        let total = hits + misses;

        CacheStatistics {
            total_entries: cache.len(),
            hit_count: hits,
            miss_count: misses,
            hit_rate: if total == 0 {
                1.0
            } else {
                hits as f64 / total as f64
            },
            evictions: self.evictions.load(std::sync::atomic::Ordering::Relaxed),
        }
    }

    fn evict_if_needed(&self, cache: &mut HashMap<String, CacheEntry>) {
        while cache.len() > self.config.memory_cache_size {
            let keys_to_evict: Vec<String> = cache
                .iter()
                .filter(|(_, entry)| entry.is_expired())
                .map(|(k, _)| k.clone())
                .collect();

            if !keys_to_evict.is_empty() {
                for key in keys_to_evict {
                    cache.remove(&key);
                    self.evictions
                        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                }
                continue;
            }

            if cache.len() > self.config.memory_cache_size {
                let eviction_policy = EvictionPolicy::from(self.config.eviction_policy.as_str());
                let key_to_remove = {
                    let mut sorted_entries: Vec<_> = cache.iter().collect();

                    match eviction_policy {
                        EvictionPolicy::LRU => {
                            sorted_entries.sort_by_key(|(_, entry)| entry.last_accessed);
                        }
                        EvictionPolicy::LFU => {
                            sorted_entries.sort_by_key(|(_, entry)| entry.access_count);
                        }
                        EvictionPolicy::FIFO => {
                            sorted_entries.sort_by_key(|(_, entry)| entry.created_at);
                        }
                        EvictionPolicy::TTL => {
                            sorted_entries.sort_by_key(|(_, entry)| {
                                entry.expires_at.unwrap_or(Instant::now())
                            });
                        }
                    }

                    sorted_entries.first().map(|(key, _)| (*key).clone())
                };

                if let Some(key) = key_to_remove {
                    cache.remove(&key);
                    self.evictions
                        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                }
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct CacheManager {
    cache: Arc<InMemoryCache>,
    prefix: String,
}

impl CacheManager {
    pub fn new(config: &CacheConfig) -> Self {
        Self {
            cache: Arc::new(InMemoryCache::new(config.clone())),
            prefix: config.prefix.clone(),
        }
    }

    fn build_key(&self, key: &str) -> String {
        if self.prefix.is_empty() {
            key.to_string()
        } else {
            format!("{}:{}", self.prefix, key)
        }
    }

    pub async fn get<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Result<Option<T>> {
        let full_key = self.build_key(key);
        if let Some(value) = self.cache.get(&full_key).await {
            serde_json::from_str(&value)
                .map(Some)
                .map_err(TopemsError::Serialization)
        } else {
            Ok(None)
        }
    }

    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<()> {
        let full_key = self.build_key(key);
        let serialized = serde_json::to_string(value).map_err(TopemsError::Serialization)?;
        self.cache.set(full_key, serialized, ttl).await;
        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<()> {
        let full_key = self.build_key(key);
        self.cache.delete(&full_key).await;
        Ok(())
    }

    pub async fn exists(&self, key: &str) -> Result<bool> {
        let full_key = self.build_key(key);
        Ok(self.cache.exists(&full_key).await)
    }

    pub async fn clear(&self) -> Result<()> {
        self.cache.clear().await;
        Ok(())
    }

    pub fn get_statistics(&self) -> CacheStatistics {
        self.cache.get_statistics()
    }
}

#[async_trait]
impl CacheService for InMemoryCache {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        Ok(self.get(key).await)
    }

    async fn set(&self, key: &str, value: &str, ttl_seconds: Option<u64>) -> Result<()> {
        let ttl = ttl_seconds.map(Duration::from_secs);
        self.set(key.to_string(), value.to_string(), ttl).await;
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<()> {
        self.delete(key).await;
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        Ok(self.exists(key).await)
    }

    async fn incr(&self, key: &str) -> Result<i64> {
        let value = self.get(key).await;
        let current: i64 = value.unwrap_or("0".to_string()).parse().unwrap_or(0);
        let new_value = current + 1;
        self.set(key.to_string(), new_value.to_string(), None).await;
        Ok(new_value)
    }

    async fn hset(&self, key: &str, field: &str, value: &str) -> Result<()> {
        let hash_key = format!("{}:{}", key, field);
        self.set(hash_key, value.to_string(), None).await;
        Ok(())
    }

    async fn hget(&self, key: &str, field: &str) -> Result<Option<String>> {
        let hash_key = format!("{}:{}", key, field);
        Ok(self.get(&hash_key).await)
    }

    async fn hdel(&self, key: &str, field: &str) -> Result<()> {
        let hash_key = format!("{}:{}", key, field);
        self.delete(&hash_key).await;
        Ok(())
    }

    async fn expire(&self, key: &str, seconds: u64) -> Result<bool> {
        if let Some(value) = self.get(key).await {
            self.set(key.to_string(), value, Some(Duration::from_secs(seconds)))
                .await;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    async fn ttl(&self, key: &str) -> Result<i64> {
        let cache = self.cache.read();
        if let Some(entry) = cache.get(key) {
            if let Some(expires_at) = entry.expires_at {
                let remaining = expires_at.saturating_duration_since(Instant::now());
                Ok(remaining.as_secs() as i64)
            } else {
                Ok(-1)
            }
        } else {
            Ok(-2)
        }
    }

    async fn flush_db(&self) -> Result<()> {
        self.cache.write().clear();
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct MultiLevelCacheManager {
    l1_cache: Arc<InMemoryCache>,
    l2_cache: Option<Arc<RedisCacheService>>,
    config: CacheConfig,
    l1_hit_count: Arc<std::sync::atomic::AtomicU64>,
    l2_hit_count: Arc<std::sync::atomic::AtomicU64>,
    miss_count: Arc<std::sync::atomic::AtomicU64>,
}

impl MultiLevelCacheManager {
    pub fn new(config: &CacheConfig, redis_cache: Option<Arc<RedisCacheService>>) -> Self {
        Self {
            l1_cache: Arc::new(InMemoryCache::new(config.clone())),
            l2_cache: redis_cache,
            config: config.clone(),
            l1_hit_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            l2_hit_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            miss_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
        }
    }

    pub async fn get<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Result<Option<T>> {
        let full_key = self.build_key(key);

        if self.config.enable_multi_level {
            if let Some(value) = self.l1_cache.get(&full_key).await {
                self.l1_hit_count
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                return serde_json::from_str(&value)
                    .map(Some)
                    .map_err(TopemsError::Serialization);
            }

            if let Some(l2) = &self.l2_cache {
                if let Ok(Some(value)) = l2.get(&full_key).await {
                    self.l2_hit_count
                        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    let l1_ttl = Some(Duration::from_secs(self.config.l1_ttl));
                    self.l1_cache
                        .set(full_key.clone(), value.clone(), l1_ttl)
                        .await;
                    return serde_json::from_str(&value)
                        .map(Some)
                        .map_err(TopemsError::Serialization);
                }
            }
        } else {
            if let Some(value) = self.l1_cache.get(&full_key).await {
                self.l1_hit_count
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                return serde_json::from_str(&value)
                    .map(Some)
                    .map_err(TopemsError::Serialization);
            }
        }

        self.miss_count
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Ok(None)
    }

    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<()> {
        let full_key = self.build_key(key);
        let serialized = serde_json::to_string(value).map_err(TopemsError::Serialization)?;

        let l1_ttl = ttl.or(Some(Duration::from_secs(self.config.l1_ttl)));
        self.l1_cache
            .set(full_key.clone(), serialized.clone(), l1_ttl)
            .await;

        if self.config.enable_multi_level && self.config.write_through {
            if let Some(l2) = &self.l2_cache {
                let l2_ttl = ttl.map(|d| d.as_secs()).or(Some(self.config.l2_ttl));
                l2.set(&full_key, &serialized, l2_ttl).await?;
            }
        }

        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<()> {
        let full_key = self.build_key(key);
        self.l1_cache.delete(&full_key).await;

        if self.config.enable_multi_level && self.config.write_through {
            if let Some(l2) = &self.l2_cache {
                l2.delete(&full_key).await?;
            }
        }

        Ok(())
    }

    pub async fn warm_up<F>(&self, keys: Vec<String>, fetcher: F) -> Result<usize>
    where
        F: Fn(&str) -> Result<String> + Send + Sync + 'static,
    {
        if !self.config.enable_cache_warming {
            return Ok(0);
        }

        let config_clone = self.config.clone();
        let l1_cache_clone = self.l1_cache.clone();
        let l2_cache_clone = self.l2_cache.clone();

        let results = task::spawn_blocking(move || {
            let mut count = 0;
            for key in keys {
                match fetcher(&key) {
                    Ok(value) => {
                        let full_key = format!("{}:{}", config_clone.prefix, key);
                        let l1_ttl = Some(Duration::from_secs(config_clone.l1_ttl));
                        if let Ok(runtime) = tokio::runtime::Runtime::new() {
                            #[allow(clippy::let_unit_value)]
                            let _ = runtime.block_on(l1_cache_clone.set(full_key.clone(), value.clone(), l1_ttl));
                            if let Some(l2) = &l2_cache_clone {
                                #[allow(clippy::let_unit_value)]
                                let _ = runtime.block_on(l2.set(
                                    &full_key,
                                    &value,
                                    Some(config_clone.l2_ttl),
                                ));
                            }
                            count += 1;
                        }
                    }
                    Err(_) => continue,
                }
            }
            count
        })
        .await
        .map_err(|e| TopemsError::Config(format!("Cache warm-up failed: {}", e)))?;

        Ok(results)
    }

    fn build_key(&self, key: &str) -> String {
        if self.config.prefix.is_empty() {
            key.to_string()
        } else {
            format!("{}:{}", self.config.prefix, key)
        }
    }

    pub fn get_statistics(&self) -> MultiLevelCacheStatistics {
        let l1_stats = self.l1_cache.get_statistics();
        let l1_hits = self.l1_hit_count.load(std::sync::atomic::Ordering::Relaxed);
        let l2_hits = self.l2_hit_count.load(std::sync::atomic::Ordering::Relaxed);
        let misses = self.miss_count.load(std::sync::atomic::Ordering::Relaxed);
        let total = l1_hits + l2_hits + misses;

        MultiLevelCacheStatistics {
            l1_hits,
            l2_hits,
            misses,
            total_requests: total,
            l1_hit_rate: if total == 0 {
                0.0
            } else {
                l1_hits as f64 / total as f64
            },
            l2_hit_rate: if total == 0 {
                0.0
            } else {
                l2_hits as f64 / total as f64
            },
            combined_hit_rate: if total == 0 {
                0.0
            } else {
                (l1_hits + l2_hits) as f64 / total as f64
            },
            l1_total_entries: l1_stats.total_entries,
            l1_evictions: l1_stats.evictions,
        }
    }
}

#[derive(Debug, Clone)]
pub struct MultiLevelCacheStatistics {
    pub l1_hits: u64,
    pub l2_hits: u64,
    pub misses: u64,
    pub total_requests: u64,
    pub l1_hit_rate: f64,
    pub l2_hit_rate: f64,
    pub combined_hit_rate: f64,
    pub l1_total_entries: usize,
    pub l1_evictions: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_basic_operations() {
        let config = CacheConfig::default();
        let cache = InMemoryCache::new(config);

        cache
            .set("key1".to_string(), "value1".to_string(), None)
            .await;
        let value = cache.get("key1").await;
        assert_eq!(value, Some("value1".to_string()));

        cache.delete("key1").await;
        let value = cache.get("key1").await;
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_cache_ttl() {
        let config = CacheConfig::default();
        let cache = InMemoryCache::new(config);

        cache
            .set(
                "key_ttl".to_string(),
                "value_ttl".to_string(),
                Some(Duration::from_millis(100)),
            )
            .await;
        let value = cache.get("key_ttl").await;
        assert_eq!(value, Some("value_ttl".to_string()));

        tokio::time::sleep(Duration::from_millis(200)).await;
        let value = cache.get("key_ttl").await;
        assert_eq!(value, None);
    }

    #[tokio::test]
    async fn test_multi_level_cache_get_set() {
        let config = CacheConfig::default();
        let cache = MultiLevelCacheManager::new(&config, None);

        cache.set("test_key", &"test_value", None).await.expect("cache set failed");
        let result: Option<String> = cache.get("test_key").await.expect("cache get failed");
        assert_eq!(result, Some("test_value".to_string()));
    }

    #[tokio::test]
    async fn test_multi_level_cache_statistics() {
        let config = CacheConfig::default();
        let cache = MultiLevelCacheManager::new(&config, None);

        cache.set("stat_key", &"stat_value", None).await.expect("cache set failed");
        let _: Option<String> = cache.get("stat_key").await.expect("cache get failed");
        let _: Option<String> = cache.get("stat_key").await.expect("cache get failed");
        let _: Option<String> = cache.get("miss_key").await.expect("cache get failed");

        let stats = cache.get_statistics();
        assert_eq!(stats.l1_hits, 2);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.total_requests, 3);
    }
}
