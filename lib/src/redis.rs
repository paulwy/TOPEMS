use crate::config::enhanced::RedisConfig;
use crate::error::TopemsError;
use crate::Result;
use async_trait::async_trait;
use parking_lot::{Mutex, RwLock};
use rand::Rng;
use redis::{Client, Connection, RedisResult};
use serde::{Deserialize, Serialize};
use std::hash::Hasher;
use std::sync::Arc;
use std::time::Duration;
use futures::Future;

#[derive(Debug)]
pub struct RedisPool {
    client: Arc<Client>,
}

impl RedisPool {
    pub async fn new(config: &RedisConfig) -> Result<Self> {
        let client = Client::open(config.url.clone())
            .map_err(|e| TopemsError::Config(format!("Failed to create Redis client: {}", e)))?;

        Ok(Self {
            client: Arc::new(client),
        })
    }

    pub async fn get_connection(&self) -> Result<Connection> {
        self.client
            .get_connection()
            .map_err(|e| TopemsError::Config(format!("Failed to get Redis connection: {}", e)))
    }

    pub fn client(&self) -> &Client {
        &self.client
    }
}

#[async_trait]
pub trait CacheService {
    async fn get(&self, key: &str) -> Result<Option<String>>;
    async fn set(&self, key: &str, value: &str, ttl_seconds: Option<u64>) -> Result<()>;
    async fn delete(&self, key: &str) -> Result<()>;
    async fn exists(&self, key: &str) -> Result<bool>;
    async fn incr(&self, key: &str) -> Result<i64>;
    async fn hset(&self, key: &str, field: &str, value: &str) -> Result<()>;
    async fn hget(&self, key: &str, field: &str) -> Result<Option<String>>;
    async fn hdel(&self, key: &str, field: &str) -> Result<()>;
    async fn expire(&self, key: &str, seconds: u64) -> Result<bool>;
    async fn ttl(&self, key: &str) -> Result<i64>;
    async fn flush_db(&self) -> Result<()>;
}

#[derive(Debug)]
pub struct RedisCacheService {
    pool: Arc<RedisPool>,
    stats: Arc<CacheStatisticsCollector>,
    key_prefix: String,
    protection_config: CacheProtectionConfig,
}

impl RedisCacheService {
    pub fn new(pool: Arc<RedisPool>) -> Self {
        Self {
            pool,
            stats: Arc::new(CacheStatisticsCollector::new()),
            key_prefix: "cache".to_string(),
            protection_config: CacheProtectionConfig::default(),
        }
    }

    pub fn with_prefix(mut self, prefix: &str) -> Self {
        self.key_prefix = prefix.to_string();
        self
    }

    pub fn with_protection(mut self, config: CacheProtectionConfig) -> Self {
        self.protection_config = config;
        self
    }

    pub fn get_statistics(&self) -> CacheStatistics {
        self.stats.get_statistics()
    }

    pub fn build_key(&self, key: &str) -> String {
        if self.key_prefix.is_empty() {
            key.to_string()
        } else {
            format!("{}:{}", self.key_prefix, key)
        }
    }

    async fn get_with_protection(&self, key: &str) -> Result<Option<String>> {
        let full_key = self.build_key(key);

        if self.protection_config.enable_bloom_filter {
            if let Some(bloom) = &self.protection_config.bloom_filter {
                if !bloom.might_contain(&full_key) {
                    self.stats.record_miss();
                    return Ok(None);
                }
            }
        }

        let result = self.get_raw(&full_key).await;

        match result {
            Ok(Some(value)) => {
                self.stats.record_hit();
                Ok(Some(value))
            }
            Ok(None) => {
                self.stats.record_miss();
                Ok(None)
            }
            Err(e) => Err(e),
        }
    }

    async fn set_with_protection(&self, key: &str, value: &str, ttl_seconds: Option<u64>) -> Result<()> {
        let full_key = self.build_key(key);

        let ttl = match ttl_seconds {
            Some(ttl) => {
                if self.protection_config.enable_random_ttl {
                    let jitter = rand::thread_rng().gen_range(
                        0..self.protection_config.random_ttl_jitter_seconds,
                    );
                    Some(ttl + jitter)
                } else {
                    Some(ttl)
                }
            }
            None => None,
        };

        if self.protection_config.enable_bloom_filter {
            if let Some(bloom) = &self.protection_config.bloom_filter {
                bloom.insert(&full_key);
            }
        }

        self.set_raw(&full_key, value, ttl).await
    }

    async fn get_raw(&self, key: &str) -> Result<Option<String>> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<Option<String>> = redis::cmd("GET").arg(key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis GET failed: {}", e)))
    }

    async fn set_raw(&self, key: &str, value: &str, ttl_seconds: Option<u64>) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        if let Some(ttl) = ttl_seconds {
            redis::cmd("SET")
                .arg(key)
                .arg(value)
                .arg("EX")
                .arg(ttl)
                .query::<()>(&mut conn)
        } else {
            redis::cmd("SET").arg(key).arg(value).query::<()>(&mut conn)
        }
        .map_err(|e| TopemsError::Config(format!("Redis SET failed: {}", e)))?;
        Ok(())
    }

    pub async fn with_cache<T, F, Fut>(
        &self,
        key: &str,
        ttl: Option<u64>,
        fallback: F,
    ) -> Result<T>
    where
        T: for<'de> Deserialize<'de> + Serialize + Send + 'static,
        F: FnOnce() -> Fut + Send + 'static,
        Fut: Future<Output = Result<T>> + Send + 'static,
    {
        let full_key = self.build_key(key);

        if self.protection_config.enable_bloom_filter {
            if let Some(bloom) = &self.protection_config.bloom_filter {
                if !bloom.might_contain(&full_key) {
                    let result = fallback().await?;
                    let serialized = serde_json::to_string(&result).map_err(TopemsError::Serialization)?;
                    self.set_raw(&full_key, &serialized, ttl).await?;
                    bloom.insert(&full_key);
                    return Ok(result);
                }
            }
        }

        if let Ok(Some(value)) = self.get_raw(&full_key).await {
            self.stats.record_hit();
            return serde_json::from_str(&value).map_err(TopemsError::Serialization);
        }

        if self.protection_config.enable_mutex_protection {
            let lock_key = format!("lock:{}", full_key);
            let acquired = self.try_acquire_lock(&lock_key).await?;

            if !acquired {
                tokio::time::sleep(Duration::from_millis(50)).await;
                return self.with_cache(key, ttl, fallback).await;
            }

            let result = fallback().await?;
            let serialized = serde_json::to_string(&result).map_err(TopemsError::Serialization)?;
            let ttl_with_jitter = if self.protection_config.enable_random_ttl {
                ttl.map(|t| {
                    let jitter = rand::thread_rng().gen_range(
                        0..self.protection_config.random_ttl_jitter_seconds,
                    );
                    t + jitter
                })
            } else {
                ttl
            };
            self.set_raw(&full_key, &serialized, ttl_with_jitter).await?;
            self.release_lock(&lock_key).await?;

            if self.protection_config.enable_bloom_filter {
                if let Some(bloom) = &self.protection_config.bloom_filter {
                    bloom.insert(&full_key);
                }
            }

            return Ok(result);
        }

        self.stats.record_miss();
        let result = fallback().await?;
        let serialized = serde_json::to_string(&result).map_err(TopemsError::Serialization)?;
        let ttl_with_jitter = if self.protection_config.enable_random_ttl {
            ttl.map(|t| {
                let jitter = rand::thread_rng().gen_range(
                    0..self.protection_config.random_ttl_jitter_seconds,
                );
                t + jitter
            })
        } else {
            ttl
        };
        self.set_raw(&full_key, &serialized, ttl_with_jitter).await?;

        if self.protection_config.enable_bloom_filter {
            if let Some(bloom) = &self.protection_config.bloom_filter {
                bloom.insert(&full_key);
            }
        }

        Ok(result)
    }

    async fn try_acquire_lock(&self, lock_key: &str) -> Result<bool> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<bool> = redis::cmd("SETNX")
            .arg(lock_key)
            .arg("1")
            .arg("EX")
            .arg(5)
            .query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis SETNX failed: {}", e)))
    }

    async fn release_lock(&self, lock_key: &str) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("DEL")
            .arg(lock_key)
            .query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis DEL failed: {}", e)))?;
        Ok(())
    }

    pub async fn warm_up<F>(
        &self,
        keys: Vec<String>,
        fetcher: F,
        ttl: Option<u64>,
    ) -> Result<usize>
    where
        F: Fn(&str) -> Result<String> + Send + Sync + 'static,
    {
        let mut count = 0;
        for key in keys {
            match fetcher(&key) {
                Ok(value) => {
                    self.set_with_protection(&key, &value, ttl).await?;
                    count += 1;
                }
                Err(_) => continue,
            }
        }
        Ok(count)
    }
}

#[async_trait]
impl CacheService for RedisCacheService {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        self.get_with_protection(key).await
    }

    async fn set(&self, key: &str, value: &str, ttl_seconds: Option<u64>) -> Result<()> {
        self.set_with_protection(key, value, ttl_seconds).await
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("DEL")
            .arg(full_key)
            .query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis DEL failed: {}", e)))?;
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<bool> = redis::cmd("EXISTS").arg(full_key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis EXISTS failed: {}", e)))
    }

    async fn incr(&self, key: &str) -> Result<i64> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<i64> = redis::cmd("INCR").arg(full_key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis INCR failed: {}", e)))
    }

    async fn hset(&self, key: &str, field: &str, value: &str) -> Result<()> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("HSET")
            .arg(full_key)
            .arg(field)
            .arg(value)
            .query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis HSET failed: {}", e)))?;
        Ok(())
    }

    async fn hget(&self, key: &str, field: &str) -> Result<Option<String>> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<Option<String>> =
            redis::cmd("HGET").arg(full_key).arg(field).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis HGET failed: {}", e)))
    }

    async fn hdel(&self, key: &str, field: &str) -> Result<()> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("HDEL")
            .arg(full_key)
            .arg(field)
            .query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis HDEL failed: {}", e)))?;
        Ok(())
    }

    async fn expire(&self, key: &str, seconds: u64) -> Result<bool> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<bool> = redis::cmd("EXPIRE").arg(full_key).arg(seconds).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis EXPIRE failed: {}", e)))
    }

    async fn ttl(&self, key: &str) -> Result<i64> {
        let full_key = self.build_key(key);
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<i64> = redis::cmd("TTL").arg(full_key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis TTL failed: {}", e)))
    }

    async fn flush_db(&self) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("FLUSHDB")
            .query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis FLUSHDB failed: {}", e)))?;
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
pub struct CacheProtectionConfig {
    pub enable_bloom_filter: bool,
    pub bloom_filter: Option<Arc<BloomFilter>>,
    pub enable_mutex_protection: bool,
    pub enable_random_ttl: bool,
    pub random_ttl_jitter_seconds: u64,
}

#[derive(Debug, Clone)]
pub struct BloomFilter {
    bits: Arc<RwLock<Vec<bool>>>,
    num_hashes: usize,
    seed: u64,
}

impl BloomFilter {
    pub fn new(expected_elements: usize, false_positive_rate: f64) -> Self {
        let bits_needed = Self::calculate_bits_needed(expected_elements, false_positive_rate);
        let num_hashes = Self::calculate_num_hashes(bits_needed, expected_elements);

        Self {
            bits: Arc::new(RwLock::new(vec![false; bits_needed])),
            num_hashes,
            seed: rand::thread_rng().gen(),
        }
    }

    fn calculate_bits_needed(expected_elements: usize, false_positive_rate: f64) -> usize {
        let numerator = -1.0 * expected_elements as f64 * false_positive_rate.ln();
        let denominator = (2.0f64).ln().powi(2);
        (numerator / denominator).ceil() as usize
    }

    fn calculate_num_hashes(bits: usize, expected_elements: usize) -> usize {
        ((bits as f64 / expected_elements as f64) * (2.0f64).ln()).ceil() as usize
    }

    fn hash(&self, key: &str, hash_index: usize) -> usize {
        use std::collections::hash_map::DefaultHasher;
        let mut hasher = DefaultHasher::new();
        hasher.write_u64(self.seed);
        hasher.write_usize(hash_index);
        hasher.write(key.as_bytes());
        hasher.finish() as usize % self.bits.read().len()
    }

    pub fn insert(&self, key: &str) {
        let mut bits = self.bits.write();
        for i in 0..self.num_hashes {
            let idx = self.hash(key, i);
            bits[idx] = true;
        }
    }

    pub fn might_contain(&self, key: &str) -> bool {
        let bits = self.bits.read();
        for i in 0..self.num_hashes {
            let idx = self.hash(key, i);
            if !bits[idx] {
                return false;
            }
        }
        true
    }

    pub fn clear(&self) {
        let mut bits = self.bits.write();
        bits.fill(false);
    }
}

#[derive(Debug, Clone, Default)]
pub struct CacheStatistics {
    pub total_hits: u64,
    pub total_misses: u64,
    pub hit_rate: f64,
    pub total_sets: u64,
    pub total_deletes: u64,
    pub total_expirations: u64,
    pub average_latency_ms: f64,
    pub current_entries: usize,
}

#[derive(Debug, Clone)]
pub struct CacheStatisticsCollector {
    hits: Arc<std::sync::atomic::AtomicU64>,
    misses: Arc<std::sync::atomic::AtomicU64>,
    sets: Arc<std::sync::atomic::AtomicU64>,
    deletes: Arc<std::sync::atomic::AtomicU64>,
    expirations: Arc<std::sync::atomic::AtomicU64>,
    latencies: Arc<Mutex<Vec<u64>>>,
    max_latencies: usize,
}

impl CacheStatisticsCollector {
    pub fn new() -> Self {
        Self {
            hits: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            misses: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            sets: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            deletes: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            expirations: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            latencies: Arc::new(Mutex::new(Vec::new())),
            max_latencies: 1000,
        }
    }

    pub fn record_hit(&self) {
        self.hits.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn record_miss(&self) {
        self.misses.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn record_set(&self) {
        self.sets.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn record_delete(&self) {
        self.deletes.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn record_expiration(&self) {
        self.expirations.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn record_latency(&self, duration: Duration) {
        let mut latencies = self.latencies.lock();
        latencies.push(duration.as_millis() as u64);
        if latencies.len() > self.max_latencies {
            latencies.remove(0);
        }
    }

    pub fn get_statistics(&self) -> CacheStatistics {
        let hits = self.hits.load(std::sync::atomic::Ordering::Relaxed);
        let misses = self.misses.load(std::sync::atomic::Ordering::Relaxed);
        let sets = self.sets.load(std::sync::atomic::Ordering::Relaxed);
        let deletes = self.deletes.load(std::sync::atomic::Ordering::Relaxed);
        let expirations = self.expirations.load(std::sync::atomic::Ordering::Relaxed);

        let total = hits + misses;
        let hit_rate = if total == 0 { 0.0 } else { hits as f64 / total as f64 };

        let latencies = self.latencies.lock();
        let avg_latency = if latencies.is_empty() {
            0.0
        } else {
            latencies.iter().sum::<u64>() as f64 / latencies.len() as f64
        };

        CacheStatistics {
            total_hits: hits,
            total_misses: misses,
            hit_rate,
            total_sets: sets,
            total_deletes: deletes,
            total_expirations: expirations,
            average_latency_ms: avg_latency,
            current_entries: 0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct CacheKeyGenerator {
    namespace: String,
    separator: char,
}

impl CacheKeyGenerator {
    pub fn new(namespace: &str) -> Self {
        Self {
            namespace: namespace.to_string(),
            separator: ':',
        }
    }

    pub fn with_separator(mut self, separator: char) -> Self {
        self.separator = separator;
        self
    }

    pub fn generate(&self, parts: &[&str]) -> String {
        let mut parts_vec = vec![self.namespace.clone()];
        parts_vec.extend(parts.iter().map(|p| p.to_string()));
        parts_vec.join(&self.separator.to_string())
    }

    pub fn generate_with_prefix(&self, prefix: &str, parts: &[&str]) -> String {
        let mut parts_vec = vec![prefix.to_string(), self.namespace.clone()];
        parts_vec.extend(parts.iter().map(|p| p.to_string()));
        parts_vec.join(&self.separator.to_string())
    }

    pub fn get_namespace(&self) -> &str {
        &self.namespace
    }
}

#[derive(Debug, Clone)]
pub struct UnifiedCacheManager {
    redis_cache: Arc<RedisCacheService>,
    key_generator: CacheKeyGenerator,
    default_ttl: u64,
}

impl UnifiedCacheManager {
    pub fn new(redis_cache: Arc<RedisCacheService>, namespace: &str) -> Self {
        Self {
            redis_cache,
            key_generator: CacheKeyGenerator::new(namespace),
            default_ttl: 3600,
        }
    }

    pub fn with_default_ttl(mut self, ttl: u64) -> Self {
        self.default_ttl = ttl;
        self
    }

    pub async fn get<T: for<'de> Deserialize<'de>>(&self, parts: &[&str]) -> Result<Option<T>> {
        let key = self.key_generator.generate(parts);
        if let Ok(Some(value)) = self.redis_cache.get(&key).await {
            serde_json::from_str(&value).map(Some).map_err(TopemsError::Serialization)
        } else {
            Ok(None)
        }
    }

    pub async fn set<T: Serialize>(&self, parts: &[&str], value: &T, ttl: Option<u64>) -> Result<()> {
        let key = self.key_generator.generate(parts);
        let serialized = serde_json::to_string(value).map_err(TopemsError::Serialization)?;
        self.redis_cache.set(&key, &serialized, ttl.or(Some(self.default_ttl))).await
    }

    pub async fn delete(&self, parts: &[&str]) -> Result<()> {
        let key = self.key_generator.generate(parts);
        self.redis_cache.delete(&key).await
    }

    pub async fn exists(&self, parts: &[&str]) -> Result<bool> {
        let key = self.key_generator.generate(parts);
        self.redis_cache.exists(&key).await
    }

    pub async fn with_cache<T, F, Fut>(&self, parts: &[&str], ttl: Option<u64>, fallback: F) -> Result<T>
    where
        T: for<'de> Deserialize<'de> + Serialize + Send + 'static,
        F: FnOnce() -> Fut + Send + 'static,
        Fut: Future<Output = Result<T>> + Send + 'static,
    {
        let key = self.key_generator.generate(parts);
        self.redis_cache.with_cache(&key, ttl.or(Some(self.default_ttl)), fallback).await
    }

    pub async fn warm_up<F>(&self, key_parts_list: Vec<Vec<&str>>, fetcher: F, ttl: Option<u64>) -> Result<usize>
    where
        F: Fn(&str) -> Result<String> + Send + Sync + 'static,
    {
        let keys: Vec<String> = key_parts_list
            .into_iter()
            .map(|parts| self.key_generator.generate(&parts))
            .collect();
        self.redis_cache.warm_up(keys, fetcher, ttl).await
    }

    pub fn get_statistics(&self) -> CacheStatistics {
        self.redis_cache.get_statistics()
    }

    pub fn get_key_generator(&self) -> &CacheKeyGenerator {
        &self.key_generator
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_bloom_filter() {
        let bloom = BloomFilter::new(1000, 0.01);
        bloom.insert("test_key");
        assert!(bloom.might_contain("test_key"));
        assert!(!bloom.might_contain("unknown_key"));
    }

    #[test]
    fn test_cache_key_generator() {
        let generator = CacheKeyGenerator::new("user");
        let key = generator.generate(&["123", "profile"]);
        assert_eq!(key, "user:123:profile");
    }

    #[test]
    fn test_cache_key_generator_with_separator() {
        let generator = CacheKeyGenerator::new("session").with_separator('_');
        let key = generator.generate(&["abc123"]);
        assert_eq!(key, "session_abc123");
    }

    #[test]
    fn test_cache_statistics_collector() {
        let collector = CacheStatisticsCollector::new();
        collector.record_hit();
        collector.record_hit();
        collector.record_miss();
        collector.record_set();
        collector.record_delete();
        collector.record_latency(Duration::from_millis(10));

        let stats = collector.get_statistics();
        assert_eq!(stats.total_hits, 2);
        assert_eq!(stats.total_misses, 1);
        assert_eq!(stats.hit_rate, 2.0 / 3.0);
        assert_eq!(stats.total_sets, 1);
        assert_eq!(stats.total_deletes, 1);
        assert_eq!(stats.average_latency_ms, 10.0);
    }
}
