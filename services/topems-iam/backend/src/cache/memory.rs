use super::Cache;
use dashmap::DashMap;
use serde::{de::DeserializeOwned, Serialize};
use std::time::{Duration, Instant};

pub struct CacheEntry<T> {
    value: T,
    expires_at: Instant,
}

pub struct MemoryCache {
    data: DashMap<String, Box<dyn CacheEntryTrait>>,
}

trait CacheEntryTrait: Send + Sync {
    fn is_expired(&self) -> bool;
    fn as_any(&self) -> &dyn std::any::Any;
}

impl<T: Send + Sync + 'static> CacheEntryTrait for CacheEntry<T> {
    fn is_expired(&self) -> bool {
        Instant::now() > self.expires_at
    }
    
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

impl MemoryCache {
    pub fn new() -> Self {
        Self {
            data: DashMap::new(),
        }
    }
    
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            data: DashMap::with_capacity(capacity),
        }
    }
}

impl Default for MemoryCache {
    fn default() -> Self {
        Self::new()
    }
}

impl Cache for MemoryCache {
    fn get<T: DeserializeOwned + Serialize + Send + Sync + 'static>(&self, key: &str) -> Option<T> {
        let entry = self.data.get(key)?;
        
        if entry.is_expired() {
            drop(entry);
            self.data.remove(key);
            return None;
        }
        
        let entry = entry.value();
        let any = entry.as_any();
        let cache_entry = any.downcast_ref::<CacheEntry<T>>()?;
        serde_json::from_value(serde_json::to_value(&cache_entry.value).ok()?).ok()
    }

    fn set<T: Serialize + Send + Sync + 'static>(&self, key: &str, value: T, ttl: Duration) {
        let entry = CacheEntry {
            value,
            expires_at: Instant::now() + ttl,
        };
        self.data.insert(key.to_string(), Box::new(entry));
    }

    fn remove(&self, key: &str) {
        self.data.remove(key);
    }

    fn clear(&self) {
        self.data.clear();
    }
}

impl Drop for MemoryCache {
    fn drop(&mut self) {
        self.data.clear();
    }
}