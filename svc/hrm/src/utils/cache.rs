// HRM 模块内存缓存工具
// 基于 dashmap 的线程安全内存缓存，支持 TTL 过期策略
// 注意：当前为单节点内存缓存，未来可迁移至 Redis 分布式缓存

use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct CacheEntry<T: Clone + Send + Sync + 'static> {
    value: T,
    expires_at: Option<Instant>,
}

pub struct InMemoryCache<T: Clone + Send + Sync + 'static> {
    data: Arc<DashMap<String, CacheEntry<T>>>,
    default_ttl: Option<Duration>,
}

impl<T: Clone + Send + Sync + 'static> InMemoryCache<T> {
    pub fn new() -> Self {
        Self {
            data: Arc::new(DashMap::new()),
            default_ttl: None,
        }
    }

    pub fn with_ttl(default_ttl: Duration) -> Self {
        Self {
            data: Arc::new(DashMap::new()),
            default_ttl: Some(default_ttl),
        }
    }

    pub fn get(&self, key: &str) -> Option<T> {
        let entry = self.data.get(key)?;
        if let Some(expires_at) = entry.expires_at {
            if Instant::now() > expires_at {
                drop(entry);
                self.data.remove(key);
                return None;
            }
        }
        Some(entry.value.clone())
    }

    pub fn set(&self, key: impl Into<String>, value: T) {
        let expires_at = self.default_ttl.map(|ttl| Instant::now() + ttl);
        self.data.insert(key.into(), CacheEntry { value, expires_at });
    }

    pub fn set_with_ttl(&self, key: impl Into<String>, value: T, ttl: Duration) {
        let expires_at = Some(Instant::now() + ttl);
        self.data.insert(key.into(), CacheEntry { value, expires_at });
    }

    pub fn remove(&self, key: &str) -> Option<T> {
        self.data.remove(key).map(|(_, entry)| entry.value)
    }

    pub fn contains_key(&self, key: &str) -> bool {
        if let Some(entry) = self.data.get(key) {
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    drop(entry);
                    self.data.remove(key);
                    return false;
                }
            }
            true
        } else {
            false
        }
    }

    pub fn clear(&self) {
        self.data.clear();
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    pub fn clean_expired(&self) -> usize {
        let mut removed = 0;
        let now = Instant::now();
        self.data.retain(|_, entry| {
            if let Some(expires_at) = entry.expires_at {
                if now > expires_at {
                    removed += 1;
                    return false;
                }
            }
            true
        });
        removed
    }
}

impl<T: Clone + Send + Sync + 'static> Default for InMemoryCache<T> {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_set_get() {
        let cache = InMemoryCache::new();
        cache.set("key1", "value1".to_string());
        assert_eq!(cache.get("key1"), Some("value1".to_string()));
    }

    #[test]
    fn test_remove() {
        let cache = InMemoryCache::new();
        cache.set("key1", "value1".to_string());
        assert_eq!(cache.remove("key1"), Some("value1".to_string()));
        assert_eq!(cache.get("key1"), None);
    }

    #[test]
    fn test_contains_key() {
        let cache = InMemoryCache::new();
        cache.set("key1", "value1".to_string());
        assert!(cache.contains_key("key1"));
        assert!(!cache.contains_key("nonexistent"));
    }

    #[test]
    fn test_with_ttl() {
        let cache = InMemoryCache::<String>::with_ttl(Duration::from_millis(100));
        cache.set("key1", "value1".to_string());
        assert_eq!(cache.get("key1"), Some("value1".to_string()));
        std::thread::sleep(Duration::from_millis(150));
        assert_eq!(cache.get("key1"), None);
    }
}
