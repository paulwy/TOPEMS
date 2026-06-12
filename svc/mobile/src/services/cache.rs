// Mobile 服务缓存模块
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

pub struct MobileCacheService {
    task_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    patrol_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    scan_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    device_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    offline_queue: Arc<RwLock<Vec<serde_json::Value>>>,
    default_ttl: u64,
}

impl Default for MobileCacheService {
    fn default() -> Self {
        Self::new()
    }
}

impl MobileCacheService {
    pub fn new() -> Self {
        Self {
            task_cache: Arc::new(RwLock::new(HashMap::new())),
            patrol_cache: Arc::new(RwLock::new(HashMap::new())),
            scan_cache: Arc::new(RwLock::new(HashMap::new())),
            device_cache: Arc::new(RwLock::new(HashMap::new())),
            offline_queue: Arc::new(RwLock::new(Vec::new())),
            default_ttl: 3600,
        }
    }

    // 任务缓存
    pub async fn get_task(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.task_cache.read().await;
        cache.get(id).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_task(&self, id: &str, task: serde_json::Value) {
        let mut cache = self.task_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(task, Some(self.default_ttl)));
    }

    pub async fn delete_task(&self, id: &str) {
        let mut cache = self.task_cache.write().await;
        cache.remove(id);
    }

    // 巡检缓存
    pub async fn get_patrol(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.patrol_cache.read().await;
        cache.get(id).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_patrol(&self, id: &str, patrol: serde_json::Value) {
        let mut cache = self.patrol_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(patrol, Some(self.default_ttl)));
    }

    // 扫码缓存
    pub async fn get_scan(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.scan_cache.read().await;
        cache.get(id).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_scan(&self, id: &str, scan: serde_json::Value) {
        let mut cache = self.scan_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(scan, Some(self.default_ttl)));
    }

    // 设备缓存
    pub async fn get_device(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.device_cache.read().await;
        cache.get(id).and_then(|e| if e.is_expired() { None } else { Some(e.value.clone()) })
    }

    pub async fn set_device(&self, id: &str, device: serde_json::Value) {
        let mut cache = self.device_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(device, Some(self.default_ttl)));
    }

    // 离线队列
    pub async fn add_to_offline_queue(&self, data: serde_json::Value) {
        let mut queue = self.offline_queue.write().await;
        queue.push(data);
    }

    pub async fn get_offline_queue(&self) -> Vec<serde_json::Value> {
        let queue = self.offline_queue.read().await;
        queue.clone()
    }

    pub async fn clear_offline_queue(&self) {
        let mut queue = self.offline_queue.write().await;
        queue.clear();
    }

    pub async fn get_stats(&self) -> CacheStats {
        CacheStats {
            task_count: self.task_cache.read().await.len(),
            patrol_count: self.patrol_cache.read().await.len(),
            scan_count: self.scan_cache.read().await.len(),
            device_count: self.device_cache.read().await.len(),
            offline_queue_size: self.offline_queue.read().await.len(),
            default_ttl: self.default_ttl,
        }
    }

    pub async fn clear_all(&self) {
        self.task_cache.write().await.clear();
        self.patrol_cache.write().await.clear();
        self.scan_cache.write().await.clear();
        self.device_cache.write().await.clear();
        self.offline_queue.write().await.clear();
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CacheStats {
    pub task_count: usize,
    pub patrol_count: usize,
    pub scan_count: usize,
    pub device_count: usize,
    pub offline_queue_size: usize,
    pub default_ttl: u64,
}
