// 重新导出共享库的缓存模块

use once_cell::sync::Lazy;
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;
use tokio::sync::RwLock;

mod memory;

pub use memory::MemoryCache;

pub trait Cache: Send + Sync {
    fn get<T: DeserializeOwned>(&self, key: &str) -> Option<T>;
    fn set<T: Serialize>(&self, key: &str, value: T, ttl: Duration);
    fn remove(&self, key: &str);
    #[allow(dead_code)]
    fn clear(&self);
}

static CACHE: Lazy<RwLock<MemoryCache>> = Lazy::new(|| RwLock::new(MemoryCache::new()));

pub async fn cache_get<T: DeserializeOwned + Send + 'static>(key: &str) -> Option<T> {
    let cache = CACHE.read().await;
    cache.get(key)
}

pub async fn cache_set<T: Serialize + Send + 'static>(key: &str, value: T, ttl: Duration) {
    let cache = CACHE.write().await;
    cache.set(key, value, ttl);
}

#[allow(dead_code)]
pub async fn cache_remove(key: &str) {
    let cache = CACHE.write().await;
    cache.remove(key);
}

#[allow(dead_code)]
pub async fn cache_clear() {
    let cache = CACHE.write().await;
    cache.clear();
}

pub async fn invalidate_project_cache(project_id: &str) {
    let cache = CACHE.read().await;
    let keys_to_remove: Vec<_> = cache
        .data
        .iter()
        .filter(|entry| entry.key().contains(project_id))
        .map(|entry| entry.key().to_string())
        .collect();

    drop(cache);

    let cache = CACHE.write().await;
    for key in keys_to_remove {
        cache.remove(&key);
    }
}
