use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;
use tokio::sync::RwLock;
use once_cell::sync::Lazy;

pub mod memory;

pub use memory::MemoryCache;

pub trait Cache: Send + Sync {
    fn get<T: DeserializeOwned + Serialize + Send + Sync + 'static>(&self, key: &str) -> Option<T>;
    fn set<T: Serialize + Send + Sync + 'static>(&self, key: &str, value: T, ttl: Duration);
    fn remove(&self, key: &str);
    fn clear(&self);
}

static CACHE: Lazy<RwLock<MemoryCache>> = Lazy::new(|| RwLock::new(MemoryCache::new()));

pub async fn cache_get<T: DeserializeOwned + Serialize + Send + Sync + 'static>(key: &str) -> Option<T> {
    let cache = CACHE.read().await;
    cache.get(key)
}

pub async fn cache_set<T: Serialize + Send + Sync + 'static>(key: &str, value: T, ttl: Duration) {
    let mut cache = CACHE.write().await;
    cache.set(key, value, ttl);
}

pub async fn cache_remove(key: &str) {
    let mut cache = CACHE.write().await;
    cache.remove(key);
}

pub async fn cache_clear() {
    let mut cache = CACHE.write().await;
    cache.clear();
}