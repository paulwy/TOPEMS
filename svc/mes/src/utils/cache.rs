// 重新导出共享库的缓存模块
pub use topems_shared::cache::{CacheManager, InMemoryCache as SharedInMemoryCache, CacheStatistics, EvictionPolicy};
pub use topems_shared::config::CacheConfig;

// 保留原有实现以确保 API 兼容
use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Clone)]
struct CacheEntry<T> {
    value: T,
    expires_at: Instant,
}

pub struct InMemoryCache<T: Clone + Send + Sync + 'static> {
    cache: Arc<DashMap<String, CacheEntry<T>>>,
    default_ttl: Duration,
}

impl<T: Clone + Send + Sync + 'static> InMemoryCache<T> {
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            cache: Arc::new(DashMap::new()),
            default_ttl,
        }
    }

    pub fn get(&self, key: &str) -> Option<T> {
        if let Some(entry) = self.cache.get(key) {
            if entry.expires_at > Instant::now() {
                return Some(entry.value.clone());
            } else {
                self.cache.remove(key);
            }
        }
        None
    }

    pub fn set(&self, key: String, value: T) {
        self.set_with_ttl(key, value, self.default_ttl);
    }

    pub fn set_with_ttl(&self, key: String, value: T, ttl: Duration) {
        let entry = CacheEntry {
            value,
            expires_at: Instant::now() + ttl,
        };
        self.cache.insert(key, entry);
    }

    pub fn remove(&self, key: &str) {
        self.cache.remove(key);
    }

    pub fn clear(&self) {
        self.cache.clear();
    }
}

impl<T: Clone + Send + Sync + 'static> Default for InMemoryCache<T> {
    fn default() -> Self {
        Self::new(Duration::from_secs(300))
    }
}
