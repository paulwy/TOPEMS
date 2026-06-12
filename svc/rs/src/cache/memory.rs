use super::Cache;
use dashmap::DashMap;
use serde::{de::DeserializeOwned, Serialize};
use std::time::{Duration, Instant};

pub struct CacheEntry {
    value: String, // 存储为 JSON 字符串，简化类型问题
    expires_at: Instant,
}

pub struct MemoryCache {
    pub data: DashMap<String, CacheEntry>,
}

impl MemoryCache {
    pub fn new() -> Self {
        Self {
            data: DashMap::new(),
        }
    }
}

impl Default for MemoryCache {
    fn default() -> Self {
        Self::new()
    }
}

impl Cache for MemoryCache {
    fn get<T: DeserializeOwned>(&self, key: &str) -> Option<T> {
        let entry = self.data.get(key)?;

        if entry.expires_at < Instant::now() {
            drop(entry);
            self.data.remove(key);
            return None;
        }

        // 尝试反序列化
        serde_json::from_str(&entry.value).ok()
    }

    fn set<T: Serialize>(&self, key: &str, value: T, ttl: Duration) {
        // 先序列化为 JSON
        if let Ok(json_str) = serde_json::to_string(&value) {
            let entry = CacheEntry {
                value: json_str,
                expires_at: Instant::now() + ttl,
            };
            self.data.insert(key.to_string(), entry);
        }
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
