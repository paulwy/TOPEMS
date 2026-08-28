//! DSH AI 缓存模块
//!
//! 提供多层缓存机制，包括：
//! - 工具调用结果缓存
//! - LLM 响应缓存
//! - 会话上下文缓存
//! - 基于 TTL 的缓存过期
//! - LRU 淘汰策略

use std::collections::HashMap;
use std::hash::Hash;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::info;

// ============================================================================
// 类型定义
// ============================================================================

/// 缓存配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// 是否启用缓存
    pub enabled: bool,
    /// 最大缓存条目数
    pub max_entries: usize,
    /// 默认 TTL（秒）
    pub default_ttl_secs: u64,
    /// 工具调用缓存 TTL（秒）
    pub tool_call_ttl_secs: u64,
    /// LLM 响应缓存 TTL（秒）
    pub llm_response_ttl_secs: u64,
    /// 会话上下文缓存 TTL（秒）
    pub session_context_ttl_secs: u64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_entries: 10000,
            default_ttl_secs: 300,
            tool_call_ttl_secs: 60,
            llm_response_ttl_secs: 300,
            session_context_ttl_secs: 1800,
        }
    }
}

/// 缓存条目
#[derive(Debug, Clone)]
struct CacheEntry<V: Clone> {
    value: V,
    expires_at: Option<Instant>,
    last_accessed: Instant,
    access_count: u64,
}

impl<V: Clone> CacheEntry<V> {
    fn new(value: V, ttl: Option<Duration>) -> Self {
        let now = Instant::now();
        Self {
            value,
            expires_at: ttl.map(|d| now + d),
            last_accessed: now,
            access_count: 0,
        }
    }

    fn is_expired(&self) -> bool {
        match self.expires_at {
            Some(expires) => Instant::now() >= expires,
            None => false,
        }
    }

    fn access(&mut self) -> &V {
        self.last_accessed = Instant::now();
        self.access_count += 1;
        &self.value
    }
}

/// 缓存统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub name: String,
    pub current_entries: usize,
    pub max_entries: usize,
    pub hits: u64,
    pub misses: u64,
    pub hit_rate: f64,
    pub evictions: u64,
    pub expirations: u64,
}

// ============================================================================
// 通用 LRU 缓存
// ============================================================================

#[derive(Debug, Default)]
struct CacheStatsInternal {
    hits: u64,
    misses: u64,
    evictions: u64,
    expirations: u64,
}

/// 通用 LRU 缓存（带 TTL）
pub struct LruCache<K: Eq + Hash + Clone, V: Clone> {
    name: String,
    config: CacheConfig,
    entries: Mutex<HashMap<K, CacheEntry<V>>>,
    stats: Mutex<CacheStatsInternal>,
}

impl<K: Eq + Hash + Clone, V: Clone> LruCache<K, V> {
    pub fn new(name: String, config: CacheConfig) -> Self {
        Self {
            name,
            config,
            entries: Mutex::new(HashMap::new()),
            stats: Mutex::new(CacheStatsInternal::default()),
        }
    }

    pub fn get(&self, key: &K) -> Option<V> {
        if !self.config.enabled {
            return None;
        }

        let mut entries = self.entries.lock();

        if let Some(entry) = entries.get_mut(key) {
            if entry.is_expired() {
                entries.remove(key);
                drop(entries);
                self.stats.lock().expirations += 1;
                self.stats.lock().misses += 1;
                return None;
            }

            let value = entry.access().clone();
            drop(entries);
            self.stats.lock().hits += 1;
            Some(value)
        } else {
            drop(entries);
            self.stats.lock().misses += 1;
            None
        }
    }

    pub fn set(&self, key: K, value: V, ttl: Option<Duration>) {
        if !self.config.enabled {
            return;
        }

        let mut entries = self.entries.lock();

        if entries.len() >= self.config.max_entries && !entries.contains_key(&key) {
            self.evict_lru(&mut entries);
        }

        let entry = CacheEntry::new(value, ttl);
        entries.insert(key, entry);
    }

    pub fn set_with_default_ttl(&self, key: K, value: V) {
        let ttl = Duration::from_secs(self.config.default_ttl_secs);
        self.set(key, value, Some(ttl));
    }

    pub fn remove(&self, key: &K) -> Option<V> {
        let mut entries = self.entries.lock();
        entries.remove(key).map(|e| e.value)
    }

    pub fn contains(&self, key: &K) -> bool {
        let entries = self.entries.lock();
        entries.get(key).map(|e| !e.is_expired()).unwrap_or(false)
    }

    pub fn clear(&self) {
        let mut entries = self.entries.lock();
        let count = entries.len();
        entries.clear();
        drop(entries);
        info!(cache = %self.name, cleared = count, "Cache cleared");
    }

    pub fn stats(&self) -> CacheStats {
        let entries = self.entries.lock();
        let stats = self.stats.lock();

        let total = stats.hits + stats.misses;
        let hit_rate = if total > 0 {
            stats.hits as f64 / total as f64
        } else {
            0.0
        };

        CacheStats {
            name: self.name.clone(),
            current_entries: entries.len(),
            max_entries: self.config.max_entries,
            hits: stats.hits,
            misses: stats.misses,
            hit_rate,
            evictions: stats.evictions,
            expirations: stats.expirations,
        }
    }

    pub fn len(&self) -> usize {
        self.entries.lock().len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.lock().is_empty()
    }

    fn evict_lru(&self, entries: &mut HashMap<K, CacheEntry<V>>) {
        if entries.is_empty() {
            return;
        }

        let lru_key = entries
            .iter()
            .min_by_key(|(_, entry)| entry.last_accessed)
            .map(|(key, _)| key.clone());

        if let Some(key) = lru_key {
            entries.remove(&key);
            self.stats.lock().evictions += 1;
        }
    }

    pub fn cleanup_expired(&self) -> usize {
        let mut entries = self.entries.lock();
        let before = entries.len();

        entries.retain(|_, entry| !entry.is_expired());

        let removed = before - entries.len();
        drop(entries);

        if removed > 0 {
            self.stats.lock().expirations += removed as u64;
        }

        removed
    }
}

// ============================================================================
// 工具调用缓存
// ============================================================================

#[derive(Debug, Clone, Eq, PartialEq, Hash)]
pub struct ToolCallCacheKey {
    pub tool_name: String,
    pub arguments_hash: String,
}

impl ToolCallCacheKey {
    pub fn new(tool_name: &str, arguments: &serde_json::Value) -> Self {
        let arguments_hash = format!("{:x}", fnv_hash(&arguments.to_string()));
        Self {
            tool_name: tool_name.to_string(),
            arguments_hash,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ToolCallCacheValue {
    pub result: serde_json::Value,
    pub success: bool,
    pub duration_ms: u64,
}

pub type ToolCallCache = LruCache<ToolCallCacheKey, ToolCallCacheValue>;

// ============================================================================
// LLM 响应缓存
// ============================================================================

#[derive(Debug, Clone, Eq, PartialEq, Hash)]
pub struct LlmResponseCacheKey {
    pub model: String,
    pub prompt_hash: String,
    pub temperature: String,
}

impl LlmResponseCacheKey {
    pub fn new(model: &str, prompt: &str, temperature: f32) -> Self {
        let prompt_hash = format!("{:x}", fnv_hash(prompt));
        Self {
            model: model.to_string(),
            prompt_hash,
            temperature: temperature.to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct LlmResponseCacheValue {
    pub content: String,
    pub tokens_used: u32,
    pub model: String,
}

pub type LlmResponseCache = LruCache<LlmResponseCacheKey, LlmResponseCacheValue>;

// ============================================================================
// 会话上下文缓存
// ============================================================================

#[derive(Debug, Clone, Eq, PartialEq, Hash)]
pub struct SessionContextCacheKey {
    pub session_id: String,
}

impl SessionContextCacheKey {
    pub fn new(session_id: &str) -> Self {
        Self {
            session_id: session_id.to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SessionContextCacheValue {
    pub context_data: serde_json::Value,
    pub message_count: usize,
    pub last_updated: String,
}

pub type SessionContextCache = LruCache<SessionContextCacheKey, SessionContextCacheValue>;

// ============================================================================
// 缓存管理器
// ============================================================================

#[derive(Clone)]
pub struct CacheManager {
    config: CacheConfig,
    tool_call_cache: Arc<ToolCallCache>,
    llm_response_cache: Arc<LlmResponseCache>,
    session_context_cache: Arc<SessionContextCache>,
}

impl CacheManager {
    pub fn new(config: CacheConfig) -> Self {
        let tool_call_config = CacheConfig {
            max_entries: config.max_entries,
            default_ttl_secs: config.tool_call_ttl_secs,
            ..config.clone()
        };

        let llm_config = CacheConfig {
            max_entries: config.max_entries,
            default_ttl_secs: config.llm_response_ttl_secs,
            ..config.clone()
        };

        let session_config = CacheConfig {
            max_entries: config.max_entries,
            default_ttl_secs: config.session_context_ttl_secs,
            ..config.clone()
        };

        Self {
            config,
            tool_call_cache: Arc::new(LruCache::new("tool_call".to_string(), tool_call_config)),
            llm_response_cache: Arc::new(LruCache::new("llm_response".to_string(), llm_config)),
            session_context_cache: Arc::new(LruCache::new(
                "session_context".to_string(),
                session_config,
            )),
        }
    }

    pub fn with_defaults() -> Self {
        Self::new(CacheConfig::default())
    }

    pub fn tool_call_cache(&self) -> &Arc<ToolCallCache> {
        &self.tool_call_cache
    }

    pub fn llm_response_cache(&self) -> &Arc<LlmResponseCache> {
        &self.llm_response_cache
    }

    pub fn session_context_cache(&self) -> &Arc<SessionContextCache> {
        &self.session_context_cache
    }

    pub fn config(&self) -> &CacheConfig {
        &self.config
    }

    pub fn clear_all(&self) {
        self.tool_call_cache.clear();
        self.llm_response_cache.clear();
        self.session_context_cache.clear();
        info!("All caches cleared");
    }

    pub fn all_stats(&self) -> Vec<CacheStats> {
        vec![
            self.tool_call_cache.stats(),
            self.llm_response_cache.stats(),
            self.session_context_cache.stats(),
        ]
    }

    pub fn cleanup_all_expired(&self) -> usize {
        let mut total = 0;
        total += self.tool_call_cache.cleanup_expired();
        total += self.llm_response_cache.cleanup_expired();
        total += self.session_context_cache.cleanup_expired();
        total
    }

    pub fn cache_tool_call(
        &self,
        tool_name: &str,
        arguments: &serde_json::Value,
        result: serde_json::Value,
        success: bool,
        duration_ms: u64,
    ) {
        let key = ToolCallCacheKey::new(tool_name, arguments);
        let value = ToolCallCacheValue {
            result,
            success,
            duration_ms,
        };
        let ttl = Duration::from_secs(self.config.tool_call_ttl_secs);
        self.tool_call_cache.set(key, value, Some(ttl));
    }

    pub fn get_cached_tool_call(
        &self,
        tool_name: &str,
        arguments: &serde_json::Value,
    ) -> Option<ToolCallCacheValue> {
        let key = ToolCallCacheKey::new(tool_name, arguments);
        self.tool_call_cache.get(&key)
    }

    pub fn cache_llm_response(
        &self,
        model: &str,
        prompt: &str,
        temperature: f32,
        content: String,
        tokens_used: u32,
    ) {
        let key = LlmResponseCacheKey::new(model, prompt, temperature);
        let value = LlmResponseCacheValue {
            content,
            tokens_used,
            model: model.to_string(),
        };
        let ttl = Duration::from_secs(self.config.llm_response_ttl_secs);
        self.llm_response_cache.set(key, value, Some(ttl));
    }

    pub fn get_cached_llm_response(
        &self,
        model: &str,
        prompt: &str,
        temperature: f32,
    ) -> Option<LlmResponseCacheValue> {
        let key = LlmResponseCacheKey::new(model, prompt, temperature);
        self.llm_response_cache.get(&key)
    }
}

// ============================================================================
// 工具函数
// ============================================================================

fn fnv_hash(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lru_cache_basic_operations() {
        let config = CacheConfig {
            max_entries: 10,
            default_ttl_secs: 60,
            ..Default::default()
        };
        let cache = LruCache::new("test".to_string(), config);

        cache.set("key1", "value1", None);
        assert_eq!(cache.get(&"key1"), Some("value1"));
        assert_eq!(cache.get(&"key2"), None);

        cache.set("key1", "value2", None);
        assert_eq!(cache.get(&"key1"), Some("value2"));

        cache.remove(&"key1");
        assert_eq!(cache.get(&"key1"), None);
    }

    #[test]
    fn test_lru_cache_ttl_expiration() {
        let config = CacheConfig {
            max_entries: 10,
            default_ttl_secs: 1,
            ..Default::default()
        };
        let cache = LruCache::new("test".to_string(), config);

        cache.set("key1", "value1", Some(Duration::from_millis(1)));
        assert_eq!(cache.get(&"key1"), Some("value1"));

        std::thread::sleep(Duration::from_millis(10));
        assert_eq!(cache.get(&"key1"), None);
    }

    #[test]
    fn test_lru_cache_eviction() {
        let config = CacheConfig {
            max_entries: 3,
            default_ttl_secs: 60,
            ..Default::default()
        };
        let cache = LruCache::new("test".to_string(), config);

        cache.set("key1", "value1", None);
        cache.set("key2", "value2", None);
        cache.set("key3", "value3", None);

        cache.get(&"key1");
        cache.set("key4", "value4", None);

        assert_eq!(cache.get(&"key2"), None);
        assert_eq!(cache.get(&"key1"), Some("value1"));
        assert_eq!(cache.get(&"key3"), Some("value3"));
        assert_eq!(cache.get(&"key4"), Some("value4"));
    }

    #[test]
    fn test_lru_cache_stats() {
        let config = CacheConfig {
            max_entries: 10,
            default_ttl_secs: 60,
            ..Default::default()
        };
        let cache = LruCache::new("test".to_string(), config);

        cache.set("key1", "value1", None);
        cache.get(&"key1");
        cache.get(&"key1");
        cache.get(&"key2");

        let stats = cache.stats();
        assert_eq!(stats.hits, 2);
        assert_eq!(stats.misses, 1);
        assert!((stats.hit_rate - 2.0 / 3.0).abs() < 0.01);
        assert_eq!(stats.current_entries, 1);
    }

    #[test]
    fn test_lru_cache_clear() {
        let config = CacheConfig::default();
        let cache = LruCache::new("test".to_string(), config);

        cache.set("key1", "value1", None);
        cache.set("key2", "value2", None);
        assert_eq!(cache.len(), 2);

        cache.clear();
        assert_eq!(cache.len(), 0);
        assert!(cache.is_empty());
    }

    #[test]
    fn test_tool_call_cache_key() {
        let args1 = serde_json::json!({"query": "test"});
        let args2 = serde_json::json!({"query": "test"});
        let args3 = serde_json::json!({"query": "other"});

        let key1 = ToolCallCacheKey::new("search", &args1);
        let key2 = ToolCallCacheKey::new("search", &args2);
        let key3 = ToolCallCacheKey::new("search", &args3);

        assert_eq!(key1, key2);
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_cache_manager_creation() {
        let manager = CacheManager::with_defaults();
        assert!(manager.config().enabled);
        assert_eq!(manager.tool_call_cache().len(), 0);
        assert_eq!(manager.llm_response_cache().len(), 0);
        assert_eq!(manager.session_context_cache().len(), 0);
    }

    #[test]
    fn test_cache_manager_tool_call_cache() {
        let manager = CacheManager::with_defaults();

        let args = serde_json::json!({"query": "test"});

        manager.cache_tool_call(
            "search",
            &args,
            serde_json::json!({"results": []}),
            true,
            100,
        );

        let cached = manager.get_cached_tool_call("search", &args);
        assert!(cached.is_some());
        let value = cached.unwrap();
        assert!(value.success);
        assert_eq!(value.duration_ms, 100);

        let other_args = serde_json::json!({"query": "other"});
        assert!(manager.get_cached_tool_call("search", &other_args).is_none());
    }

    #[test]
    fn test_cache_manager_llm_response_cache() {
        let manager = CacheManager::with_defaults();

        manager.cache_llm_response(
            "gpt-4",
            "Hello, how are you?",
            0.7,
            "I'm doing well, thank you!".to_string(),
            50,
        );

        let cached = manager.get_cached_llm_response("gpt-4", "Hello, how are you?", 0.7);
        assert!(cached.is_some());
        let value = cached.unwrap();
        assert_eq!(value.content, "I'm doing well, thank you!");
        assert_eq!(value.tokens_used, 50);

        assert!(manager.get_cached_llm_response("gpt-4", "Hello, how are you?", 0.5).is_none());
    }

    #[test]
    fn test_cache_manager_all_stats() {
        let manager = CacheManager::with_defaults();

        manager.cache_tool_call("tool1", &serde_json::json!({}), serde_json::json!({}), true, 100);
        manager.cache_llm_response("model1", "prompt", 0.5, "response".to_string(), 10);

        let stats = manager.all_stats();
        assert_eq!(stats.len(), 3);
        assert_eq!(stats[0].name, "tool_call");
        assert_eq!(stats[1].name, "llm_response");
        assert_eq!(stats[2].name, "session_context");
    }

    #[test]
    fn test_fnv_hash() {
        let hash1 = fnv_hash("test");
        let hash2 = fnv_hash("test");
        let hash3 = fnv_hash("other");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }
}
