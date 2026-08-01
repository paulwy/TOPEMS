use crate::event::{CacheInvalidatedPayload, RabbitMqPublisher};
use crate::redis::{CacheService, RedisCacheService};
use async_trait::async_trait;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::task;
use topems_shared_core::config::CacheConfig;
use topems_shared_core::error::Result;
use topems_shared_core::error::TopemsError;
use tracing::{debug, info, warn};

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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

    /// V20.0: 按模式批量删除缓存
    ///
    /// 支持通配符 `*` 匹配，例如：
    /// - `tenant123:erp:dict:*` 删除指定租户 ERP 字典所有缓存
    /// - `tenant123:hrm:employee:123` 精确删除
    pub async fn delete_by_pattern(&self, pattern: &str) -> usize {
        let mut cache = self.cache.write();
        let keys_to_delete: Vec<String> = cache
            .keys()
            .filter(|k| matches_pattern(k, pattern))
            .cloned()
            .collect();
        let count = keys_to_delete.len();
        for key in keys_to_delete {
            cache.remove(&key);
        }
        count
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
                            let _ = runtime.block_on(l1_cache_clone.set(
                                full_key.clone(),
                                value.clone(),
                                l1_ttl,
                            ));
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

// ============================================================================
// V20.0 跨层架构优化：缓存一致性增强
// ============================================================================

/// V20.0: 统一缓存键生成器
///
/// 强制执行缓存键命名规范：`{tenant}:{module}:{entity}:{id}`
/// 避免各服务自定义键格式导致冲突和管理困难。
///
/// 示例：
/// - `tenant123:erp:dict:currency` - ERP 字典缓存
/// - `tenant123:hrm:employee:550e8400-e29b-41d4-a716-446655440000` - HRM 员工缓存
/// - `tenant123:wms:inventory:*` - WMS 库存所有缓存（用于批量失效）
#[derive(Debug, Clone)]
pub struct CacheKeyGenerator {
    tenant_id: String,
    module: String,
}

impl CacheKeyGenerator {
    pub fn new(tenant_id: &str, module: &str) -> Self {
        Self {
            tenant_id: tenant_id.to_string(),
            module: module.to_string(),
        }
    }

    /// 生成实体缓存键：`{tenant}:{module}:{entity}:{id}`
    pub fn entity_key(&self, entity: &str, id: &str) -> String {
        format!("{}:{}:{}:{}", self.tenant_id, self.module, entity, id)
    }

    /// 生成集合缓存键：`{tenant}:{module}:{entity}:collection:{collection_id}`
    pub fn collection_key(&self, entity: &str, collection_id: &str) -> String {
        format!(
            "{}:{}:{}:collection:{}",
            self.tenant_id, self.module, entity, collection_id
        )
    }

    /// 生成查询缓存键：`{tenant}:{module}:{entity}:query:{query_hash}`
    pub fn query_key(&self, entity: &str, query_hash: &str) -> String {
        format!(
            "{}:{}:{}:query:{}",
            self.tenant_id, self.module, entity, query_hash
        )
    }

    /// 生成实体通配符模式：`{tenant}:{module}:{entity}:*`
    /// 用于批量失效某类实体的所有缓存
    pub fn entity_pattern(&self, entity: &str) -> String {
        format!("{}:{}:{}:*", self.tenant_id, self.module, entity)
    }

    /// 生成模块通配符模式：`{tenant}:{module}:*`
    /// 用于批量失效某模块的所有缓存（谨慎使用）
    pub fn module_pattern(&self) -> String {
        format!("{}:{}:*", self.tenant_id, self.module)
    }

    /// 生成租户通配符模式：`{tenant}:*`
    /// 用于租户数据清理时失效所有缓存
    pub fn tenant_pattern(&self) -> String {
        format!("{}:*", self.tenant_id)
    }
}

/// V20.0: 缓存键通配符匹配
///
/// 支持简单的通配符匹配：
/// - `*` 匹配任意字符（包括分隔符 `:`）
/// - 其他字符精确匹配
///
/// 示例：
/// - `matches_pattern("tenant:erp:dict:currency", "tenant:erp:dict:*")` → true
/// - `matches_pattern("tenant:erp:dict:currency", "tenant:hrm:*")` → false
fn matches_pattern(key: &str, pattern: &str) -> bool {
    // 简化实现：将 `*` 转为正则 `.*`，其他字符转义
    let mut regex_pattern = String::with_capacity(pattern.len() * 2);
    for ch in pattern.chars() {
        match ch {
            '*' => regex_pattern.push_str(".*"),
            // 需要转义的正则特殊字符
            '.' | '+' | '(' | ')' | '|' | '[' | ']' | '{' | '}' | '^' | '$' | '?' | '\\' => {
                regex_pattern.push('\\');
                regex_pattern.push(ch);
            }
            _ => regex_pattern.push(ch),
        }
    }
    regex_pattern.push('$');

    // 使用 regex 库进行匹配（已在 dependencies 中）
    // 为避免引入 regex 依赖到 cache 模块，这里使用简单的手动匹配
    simple_wildcard_match(key, pattern)
}

/// 简单通配符匹配实现（不依赖正则表达式）
fn simple_wildcard_match(text: &str, pattern: &str) -> bool {
    let text_bytes = text.as_bytes();
    let pattern_bytes = pattern.as_bytes();
    let (mut ti, mut pi) = (0usize, 0usize);
    let (mut star_pi, mut match_ti): (Option<usize>, usize) = (None, 0);

    while ti < text_bytes.len() {
        if pi < pattern_bytes.len()
            && (pattern_bytes[pi] == b'?' || pattern_bytes[pi] == text_bytes[ti])
        {
            ti += 1;
            pi += 1;
        } else if pi < pattern_bytes.len() && pattern_bytes[pi] == b'*' {
            star_pi = Some(pi);
            match_ti = ti;
            pi += 1;
        } else if let Some(sp) = star_pi {
            pi = sp + 1;
            match_ti += 1;
            ti = match_ti;
        } else {
            return false;
        }
    }

    while pi < pattern_bytes.len() && pattern_bytes[pi] == b'*' {
        pi += 1;
    }

    pi == pattern_bytes.len()
}

/// V20.0: 多实例缓存一致性管理器
///
/// 包装 MultiLevelCacheManager，增加：
/// 1. 本地失效后主动广播给其他实例
/// 2. 接收其他实例的失效广播并处理
/// 3. 支持模式匹配批量失效
pub struct DistributedCacheManager {
    inner: MultiLevelCacheManager,
    /// 可选的 RabbitMQ 发布器，用于广播缓存失效
    publisher: Option<Arc<RabbitMqPublisher>>,
    /// 当前实例标识，用于过滤自身发出的广播
    instance_id: String,
}

impl DistributedCacheManager {
    /// 创建分布式缓存管理器
    ///
    /// 参数：
    /// - `config`: 缓存配置
    /// - `redis_cache`: 可选的 L2 Redis 缓存
    /// - `publisher`: 可选的 RabbitMQ 发布器，用于广播失效
    pub fn new(
        config: &CacheConfig,
        redis_cache: Option<Arc<RedisCacheService>>,
        publisher: Option<Arc<RabbitMqPublisher>>,
    ) -> Self {
        let instance_id = publisher
            .as_ref()
            .map(|p| p.instance_id().to_string())
            .unwrap_or_else(|| {
                format!(
                    "local:{}:{}",
                    hostname::get()
                        .map(|h| h.to_string_lossy().to_string())
                        .unwrap_or_else(|_| "unknown".to_string()),
                    std::process::id()
                )
            });

        Self {
            inner: MultiLevelCacheManager::new(config, redis_cache),
            publisher,
            instance_id,
        }
    }

    /// 获取底层 MultiLevelCacheManager 引用
    pub fn inner(&self) -> &MultiLevelCacheManager {
        &self.inner
    }

    /// V20.0: 失效单个键并广播
    ///
    /// 1. 删除本地 L1 缓存
    /// 2. 删除 L2 Redis 缓存
    /// 3. 广播给其他实例删除 L1
    pub async fn invalidate(&self, key: &str, reason: &str) -> Result<()> {
        debug!("Invalidating cache key: {} (reason: {})", key, reason);

        // 1. 本地 L1 + L2 失效
        self.inner.delete(key).await?;

        // 2. 广播给其他实例
        if let Some(publisher) = &self.publisher {
            if let Err(e) = publisher
                .publish_cache_invalidation(key, "specific", Some(reason))
                .await
            {
                warn!(
                    "Failed to broadcast cache invalidation for key {}: {:?}",
                    key, e
                );
            }
        }

        Ok(())
    }

    /// V20.0: 按模式批量失效并广播
    ///
    /// 1. 本地 L1 按模式删除
    /// 2. 广播给其他实例按模式删除
    pub async fn invalidate_pattern(&self, pattern: &str, reason: &str) -> Result<usize> {
        debug!(
            "Invalidating cache by pattern: {} (reason: {})",
            pattern, reason
        );

        // 1. 本地 L1 批量删除
        let count = self.inner.l1_cache.delete_by_pattern(pattern).await;

        // 2. 广播给其他实例
        if let Some(publisher) = &self.publisher {
            if let Err(e) = publisher
                .publish_cache_invalidation(pattern, "pattern", Some(reason))
                .await
            {
                warn!(
                    "Failed to broadcast cache invalidation for pattern {}: {:?}",
                    pattern, e
                );
            }
        }

        Ok(count)
    }

    /// V20.0: 清空全部缓存并广播
    pub async fn invalidate_all(&self, reason: &str) -> Result<()> {
        warn!("Clearing all cache (reason: {})", reason);

        // 1. 本地清空
        self.inner.l1_cache.clear().await;

        // 2. 广播给其他实例
        if let Some(publisher) = &self.publisher {
            if let Err(e) = publisher
                .publish_cache_invalidation("*", "all", Some(reason))
                .await
            {
                warn!("Failed to broadcast cache clear: {:?}", e);
            }
        }

        Ok(())
    }

    /// V20.0: 处理收到的缓存失效广播
    ///
    /// 由 RabbitMqSubscriber::subscribe_cache_invalidation 调用，
    /// 根据失效级别处理本地 L1 缓存。
    pub async fn handle_invalidation(&self, payload: CacheInvalidatedPayload) -> Result<()> {
        // 过滤自身发出的广播
        if payload.source_instance == self.instance_id {
            debug!("Ignoring self-invalidation: {}", payload.cache_key_pattern);
            return Ok(());
        }

        debug!(
            "Processing cache invalidation from {}: pattern={}, level={}",
            payload.source_instance, payload.cache_key_pattern, payload.invalidation_level
        );

        match payload.invalidation_level.as_str() {
            "specific" => {
                self.inner.l1_cache.delete(&payload.cache_key_pattern).await;
            }
            "pattern" => {
                let count = self
                    .inner
                    .l1_cache
                    .delete_by_pattern(&payload.cache_key_pattern)
                    .await;
                debug!(
                    "Pattern invalidation removed {} entries for: {}",
                    count, payload.cache_key_pattern
                );
            }
            "all" => {
                self.inner.l1_cache.clear().await;
                warn!("Cleared all L1 cache due to broadcast");
            }
            _ => {
                warn!("Unknown invalidation level: {}", payload.invalidation_level);
            }
        }

        Ok(())
    }

    /// 获取实例标识
    pub fn instance_id(&self) -> &str {
        &self.instance_id
    }
}

// DistributedCacheManager 委托方法到 MultiLevelCacheManager
impl std::ops::Deref for DistributedCacheManager {
    type Target = MultiLevelCacheManager;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

/// V20.0: 缓存预热器
///
/// 在服务启动时或定时任务中，预加载热点数据到 L1 缓存，
/// 减少冷启动期间的缓存未命中。
///
/// 典型用法：
/// ```ignore
/// let warmer = CacheWarmer::new(cache_manager);
/// warmer.add_warmup_task("dict", || Box::pin(async {
///     // 从数据库加载字典数据
///     Ok(vec![("key1".to_string(), "value1".to_string())])
/// }));
/// warmer.warmup().await;
/// ```
pub struct CacheWarmer {
    cache: Arc<MultiLevelCacheManager>,
    tasks: Vec<WarmupTask>,
}

/// 预热任务定义
struct WarmupTask {
    /// 任务名称，用于日志和监控
    name: String,
    /// 数据加载函数（同步）
    loader: Box<dyn Fn() -> Result<Vec<(String, String)>> + Send + Sync>,
}

impl CacheWarmer {
    pub fn new(cache: Arc<MultiLevelCacheManager>) -> Self {
        Self {
            cache,
            tasks: Vec::new(),
        }
    }

    /// 添加预热任务
    ///
    /// 每个任务返回一个 (key, value) 列表，所有键值对会被写入 L1 和 L2 缓存。
    pub fn add_warmup_task<F>(&mut self, name: &str, loader: F) -> &mut Self
    where
        F: Fn() -> Result<Vec<(String, String)>> + Send + Sync + 'static,
    {
        self.tasks.push(WarmupTask {
            name: name.to_string(),
            loader: Box::new(loader),
        });
        self
    }

    /// 执行所有预热任务
    ///
    /// 返回成功预热的条目总数。
    /// 单个任务失败不会影响其他任务。
    pub async fn warmup(&self) -> Result<usize> {
        let mut total_count = 0;

        for task in &self.tasks {
            let start = Instant::now();
            match (task.loader)() {
                Ok(entries) => {
                    let mut task_count = 0;
                    for (key, value) in entries {
                        if let Ok(()) = self.cache.set(&key, &value, None).await {
                            task_count += 1;
                        }
                    }
                    let elapsed = start.elapsed();
                    info!(
                        "Cache warmup task '{}' completed: {} entries in {:?}",
                        task.name, task_count, elapsed
                    );
                    total_count += task_count;
                }
                Err(e) => {
                    warn!("Cache warmup task '{}' failed: {:?}", task.name, e);
                }
            }
        }

        info!("Cache warmup completed: {} total entries", total_count);
        Ok(total_count)
    }
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

        cache
            .set("test_key", &"test_value", None)
            .await
            .expect("cache set failed");
        let result: Option<String> = cache.get("test_key").await.expect("cache get failed");
        assert_eq!(result, Some("test_value".to_string()));
    }

    #[tokio::test]
    async fn test_multi_level_cache_statistics() {
        let config = CacheConfig::default();
        let cache = MultiLevelCacheManager::new(&config, None);

        cache
            .set("stat_key", &"stat_value", None)
            .await
            .expect("cache set failed");
        let _: Option<String> = cache.get("stat_key").await.expect("cache get failed");
        let _: Option<String> = cache.get("stat_key").await.expect("cache get failed");
        let _: Option<String> = cache.get("miss_key").await.expect("cache get failed");

        let stats = cache.get_statistics();
        assert_eq!(stats.l1_hits, 2);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.total_requests, 3);
    }

    #[test]
    fn test_wildcard_match() {
        assert!(simple_wildcard_match("hello", "hello"));
        assert!(simple_wildcard_match("hello", "h*"));
        assert!(simple_wildcard_match("hello", "*o"));
        assert!(simple_wildcard_match("hello", "h*o"));
        assert!(simple_wildcard_match(
            "tenant:erp:dict:currency",
            "tenant:erp:dict:*"
        ));
        assert!(simple_wildcard_match(
            "tenant:erp:dict:currency",
            "tenant:erp:*"
        ));
        assert!(simple_wildcard_match(
            "tenant:erp:dict:currency",
            "tenant:*"
        ));
        assert!(!simple_wildcard_match(
            "tenant:erp:dict:currency",
            "tenant:hrm:*"
        ));
        assert!(!simple_wildcard_match("hello", "world"));
    }

    #[tokio::test]
    async fn test_delete_by_pattern() {
        let config = CacheConfig::default();
        let cache = InMemoryCache::new(config);

        cache
            .set(
                "tenant1:erp:dict:currency".to_string(),
                "value1".to_string(),
                None,
            )
            .await;
        cache
            .set(
                "tenant1:erp:dict:status".to_string(),
                "value2".to_string(),
                None,
            )
            .await;
        cache
            .set(
                "tenant1:hrm:employee:123".to_string(),
                "value3".to_string(),
                None,
            )
            .await;

        let count = cache.delete_by_pattern("tenant1:erp:dict:*").await;
        assert_eq!(count, 2);

        assert!(cache.get("tenant1:erp:dict:currency").await.is_none());
        assert!(cache.get("tenant1:erp:dict:status").await.is_none());
        assert!(cache.get("tenant1:hrm:employee:123").await.is_some());
    }

    #[test]
    fn test_cache_key_generator() {
        let gen = CacheKeyGenerator::new("tenant123", "erp");
        assert_eq!(
            gen.entity_key("dict", "currency"),
            "tenant123:erp:dict:currency"
        );
        assert_eq!(
            gen.collection_key("employee", "dept-001"),
            "tenant123:erp:employee:collection:dept-001"
        );
        assert_eq!(
            gen.query_key("employee", "abc123"),
            "tenant123:erp:employee:query:abc123"
        );
        assert_eq!(gen.entity_pattern("dict"), "tenant123:erp:dict:*");
        assert_eq!(gen.module_pattern(), "tenant123:erp:*");
        assert_eq!(gen.tenant_pattern(), "tenant123:*");
    }

    #[tokio::test]
    async fn test_distributed_cache_invalidate() {
        let config = CacheConfig::default();
        let cache = DistributedCacheManager::new(&config, None, None);

        cache
            .set("test_key", &"test_value", None)
            .await
            .expect("cache set failed");

        cache
            .invalidate("test_key", "test_invalidation")
            .await
            .expect("invalidate failed");

        let result: Option<String> = cache.get("test_key").await.expect("cache get failed");
        assert_eq!(result, None);
    }
}
