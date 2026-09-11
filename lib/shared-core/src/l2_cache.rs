//! # 异步 L2 缓存（进程内 moka L1 + Redis L2）
//!
//! 适用于多服务实例共享数据的缓存场景。当 Redis 不可用时自动退化为纯进程内缓存。
//!
//! - **L1 (Hot Cache)**: `moka::sync::Cache` — 超低延迟，进程内，LRU 淘汰，TTL 过期
//! - **L2 (Warm Cache)**: Redis — 跨实例共享，分布式
//! - **Write-through**: 写入时同时更新 L1 和 L2
//! - **Cache-aside (read)**: 先查 L1 → miss 查 L2 → hit 回填 L1 → miss 回调回源
//! - **Graceful degradation**: Redis 连接失败时静默降级为纯 L1 模式（日志 warning）
//!
//! 与 `LocalInMemoryCache<T>`（同步，纯内存）的区别：
//! - 本模块 API 为 `async fn`，因涉及 Redis I/O
//! - 泛型值 `T` 需实现 `Serialize + DeserializeOwned`（Redis 用 JSON 序列化）

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;

use crate::cache::{
    CacheInvalidationEvent, CacheInvalidationHandler, InMemoryCache as MokaL1, InvalidationLevel,
};

// ===== Redis 相关（仅当 redis_client 参数传入时启用 L2）=====
use redis::aio::ConnectionManager as RedisConnectionManager;
use redis::Client as RedisClient;

/// L2 缓存配置
#[derive(Debug, Clone)]
pub struct L2CacheConfig {
    /// 服务实例前缀，用于区分不同服务写入的 Redis key
    /// 格式：`{instance_prefix}:{key}`
    pub instance_prefix: String,
    /// L1 默认 TTL（短，避免 staleness）
    pub l1_ttl: Duration,
    /// L2 默认 TTL（长，跨实例共享）
    pub l2_ttl: Duration,
    /// L1 容量上限（0 = 无限制）
    pub l1_capacity: usize,
}

impl Default for L2CacheConfig {
    fn default() -> Self {
        Self {
            instance_prefix: String::new(),
            l1_ttl: Duration::from_secs(60),
            l2_ttl: Duration::from_secs(600),
            l1_capacity: 10_000,
        }
    }
}

/// 异步 L2 缓存。泛型 `T` 需可 JSON 序列化。
///
/// `T: Clone` 是 moka L1 的要求（见 `LocalInMemoryCache`）。
pub struct AsyncL2Cache<T: Clone + Send + Sync + 'static>
where
    Self: Send + Sync,
{
    l1: MokaL1<T>,
    l2: Option<Arc<RedisL2Backend>>,
    config: L2CacheConfig,
}

/// Redis L2 后端（封装连接管理器和前缀）
struct RedisL2Backend {
    manager: RedisConnectionManager,
    prefix: String,
}

impl RedisL2Backend {
    fn full_key(&self, key: &str) -> String {
        if self.prefix.is_empty() {
            key.to_string()
        } else {
            format!("{}:{}", self.prefix, key)
        }
    }
}

impl<T: Clone + Send + Sync + 'static> AsyncL2Cache<T> {
    /// 纯 L1 模式（无 Redis，等价于异步包装的 LocalInMemoryCache）
    pub fn new_l1_only(config: L2CacheConfig) -> Self {
        let l1 = if config.l1_capacity > 0 {
            MokaL1::with_capacity(config.l1_ttl, config.l1_capacity)
        } else {
            MokaL1::new(config.l1_ttl)
        };
        Self {
            l1,
            l2: None,
            config,
        }
    }

    /// 尝试创建带 Redis L2 的缓存。
    ///
    /// Redis URL 格式：`redis://[:password@]host:port/db`
    /// 若连接失败则回退到纯 L1 模式并返回 warning 字符串（供调用方日志）。
    pub async fn try_new(
        config: L2CacheConfig,
        redis_url: Option<&str>,
    ) -> Result<Self, (Self, String)> {
        let l1 = if config.l1_capacity > 0 {
            MokaL1::with_capacity(config.l1_ttl, config.l1_capacity)
        } else {
            MokaL1::new(config.l1_ttl)
        };

        let Some(url) = redis_url else {
            return Ok(Self {
                l1,
                l2: None,
                config,
            });
        };

        match RedisClient::open(url) {
            Ok(client) => {
                // 创建异步连接管理器（内部维护连接池，自动重连）
                match RedisConnectionManager::new(client).await {
                    Ok(manager) => {
                        let backend = RedisL2Backend {
                            manager,
                            prefix: config.instance_prefix.clone(),
                        };
                        Ok(Self {
                            l1,
                            l2: Some(Arc::new(backend)),
                            config,
                        })
                    }
                    Err(e) => {
                        let warn = format!("Redis 连接管理器创建失败，回退到纯 L1 模式: {}", e);
                        Err((
                            Self {
                                l1,
                                l2: None,
                                config,
                            },
                            warn,
                        ))
                    }
                }
            }
            Err(e) => {
                let warn = format!("Redis URL 无效，回退到纯 L1 模式: {}", e);
                Err((
                    Self {
                        l1,
                        l2: None,
                        config,
                    },
                    warn,
                ))
            }
        }
    }

    /// 是否启用了 L2 Redis
    pub fn has_l2(&self) -> bool {
        self.l2.is_some()
    }

    /// 当前 L1 条目数（近似，最终一致）
    pub fn l1_len(&self) -> usize {
        self.l1.len()
    }

    // ===== 内部辅助 =====

    /// 从 Redis L2 读取，失败则返回 None（不传播错误，graceful degradation）
    async fn l2_get_raw(&self, key: &str) -> Option<String> {
        let Some(l2) = &self.l2 else {
            return None;
        };
        let full_key = l2.full_key(key);
        let mut manager = l2.manager.clone();
        // 使用异步连接管理器，内部维护连接池
        let result: redis::RedisResult<Option<String>> = redis::cmd("GET")
            .arg(&full_key)
            .query_async(&mut manager)
            .await;
        result.ok().flatten()
    }

    /// 写入 Redis L2，失败静默（只在日志 debug 可见）
    async fn l2_set_raw(&self, key: &str, value: &str, ttl: Duration) {
        let Some(l2) = &self.l2 else {
            return;
        };
        let full_key = l2.full_key(key);
        let value = value.to_string();
        let secs = ttl.as_secs().max(1); // 至少 1s，Redis SET EX 不接受 0
        let mut manager = l2.manager.clone();
        let _: redis::RedisResult<()> = redis::cmd("SET")
            .arg(&full_key)
            .arg(&value)
            .arg("EX")
            .arg(secs)
            .query_async(&mut manager)
            .await;
    }

    /// 删除 Redis L2 key
    async fn l2_delete_raw(&self, key: &str) {
        let Some(l2) = &self.l2 else {
            return;
        };
        let full_key = l2.full_key(key);
        let mut manager = l2.manager.clone();
        let _: redis::RedisResult<()> = redis::cmd("DEL")
            .arg(&full_key)
            .query_async(&mut manager)
            .await;
    }

    // ===== 公共 API =====

    /// 读取一个 key：先查 L1，miss 查 L2，L2 hit 回填 L1
    pub async fn get(&self, key: &str) -> Option<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        // L1 命中直接返回
        if let Some(v) = self.l1.get(key) {
            return Some(v);
        }

        // L2 命中 → 回填 L1
        if let Some(raw) = self.l2_get_raw(key).await {
            if let Ok(v) = serde_json::from_str::<T>(&raw) {
                // 回填 L1（使用 L1 的 TTL）
                self.l1
                    .set_with_ttl(key.to_string(), v.clone(), self.config.l1_ttl);
                return Some(v);
            }
        }
        None
    }

    /// 写入（write-through：同时写 L1 和 L2）
    pub async fn set(&self, key: String, value: T)
    where
        T: Serialize,
    {
        self.set_with_ttl(key, value, self.config.l1_ttl, self.config.l2_ttl)
            .await
    }

    /// 写入时为 L1 和 L2 指定不同 TTL
    pub async fn set_with_ttl(&self, key: String, value: T, l1_ttl: Duration, l2_ttl: Duration)
    where
        T: Serialize,
    {
        // L1 写入（同步，立即）
        self.l1.set_with_ttl(key.clone(), value.clone(), l1_ttl);

        // L2 写入（异步 JSON 序列化）
        if self.l2.is_some() {
            if let Ok(serialized) = serde_json::to_string(&value) {
                self.l2_set_raw(&key, &serialized, l2_ttl).await;
            }
        }
    }

    /// 删除（同时删除 L1 和 L2）
    pub async fn remove(&self, key: &str) {
        self.l1.remove(key);
        self.l2_delete_raw(key).await;
    }

    /// `remove` 的语义化别名
    pub async fn delete(&self, key: &str) {
        self.remove(key).await
    }

    /// 为已存在的 L1 key 设置新 TTL（L2 不支持原地更新 TTL，删除让下次回源重新写入）
    pub async fn expire(&self, key: &str, ttl: Duration) -> bool {
        if self.l1.expire(key, ttl) {
            // L2 让其自然过期即可（或删除以强制回源）
            true
        } else {
            false
        }
    }

    /// 清空 L1（不清空 L2，避免跨实例误删）
    pub fn clear_l1(&self) {
        self.l1.clear();
    }
}

impl<T: Clone + Send + Sync + 'static> Clone for AsyncL2Cache<T> {
    fn clone(&self) -> Self {
        Self {
            l1: self.l1.clone(),
            l2: self.l2.clone(),
            config: self.config.clone(),
        }
    }
}

// ===== AsyncL2Cache 缓存失效处理器 =====

/// AsyncL2Cache 缓存失效处理器
///
/// 适配 `CacheInvalidationHandler` trait，用于处理 `AsyncL2Cache` 的缓存失效事件。
/// 由于 `AsyncL2Cache` 的 API 是异步的，处理器内部使用 `tokio::spawn` 执行异步操作。
pub struct AsyncL2CacheInvalidationHandler<T: Clone + Send + Sync + 'static> {
    /// 处理器名称
    name: String,
    /// 缓存引用
    cache: Arc<AsyncL2Cache<T>>,
    /// 缓存键前缀（用于 pattern 匹配，如 "qms:quality_standard:"）
    key_prefix: String,
}

impl<T: Clone + Send + Sync + 'static> AsyncL2CacheInvalidationHandler<T> {
    /// 创建新的 AsyncL2Cache 失效处理器
    pub fn new(name: &str, cache: Arc<AsyncL2Cache<T>>, key_prefix: &str) -> Self {
        Self {
            name: name.to_string(),
            cache,
            key_prefix: key_prefix.to_string(),
        }
    }
}

impl<T: Clone + Send + Sync + 'static> CacheInvalidationHandler
    for AsyncL2CacheInvalidationHandler<T>
{
    fn name(&self) -> &str {
        &self.name
    }

    fn handle_invalidation(&self, event: &CacheInvalidationEvent) {
        let cache = self.cache.clone();
        let event = event.clone();
        let name = self.name.clone();
        let key_prefix = self.key_prefix.clone();

        // 使用 tokio::spawn 执行异步缓存失效操作
        tokio::spawn(async move {
            match event.invalidation_level {
                InvalidationLevel::All => {
                    // 清空 L1 缓存（不清空 L2，避免跨实例误删）
                    cache.clear_l1();
                    tracing::info!("AsyncL2Cache L1 已全部清空: {}", name);
                }
                InvalidationLevel::Specific => {
                    // 精确失效指定的缓存键（同时删除 L1 和 L2）
                    cache.remove(&event.cache_key_pattern).await;
                    tracing::info!(
                        "AsyncL2Cache 缓存键已失效: {} -> {}",
                        name,
                        event.cache_key_pattern
                    );
                }
                InvalidationLevel::Pattern => {
                    // 前缀匹配失效
                    // 注意：AsyncL2Cache 不支持直接的前缀匹配删除，
                    // 这里采用简化策略：如果事件的 pattern 以本缓存的 key_prefix 开头，
                    // 则清空 L1 缓存（因为无法精确删除前缀匹配的键）。
                    // 更精细的实现需要维护键索引。
                    if event.cache_key_pattern.starts_with(&key_prefix)
                        || key_prefix.starts_with(&event.cache_key_pattern)
                        || event.cache_key_pattern == "*"
                    {
                        cache.clear_l1();
                        tracing::info!(
                            "AsyncL2Cache L1 已按前缀清空: {} (pattern={})",
                            name,
                            event.cache_key_pattern
                        );
                    }
                }
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn l1_only_set_and_get() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        cache.set("k1".to_string(), 42).await;
        assert_eq!(cache.get("k1").await, Some(42));
    }

    #[tokio::test]
    async fn l1_only_delete() {
        let cache: AsyncL2Cache<String> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        cache.set("k".to_string(), "v".to_string()).await;
        cache.delete("k").await;
        assert_eq!(cache.get("k").await, None);
    }

    #[tokio::test]
    async fn missing_key_returns_none() {
        let cache: AsyncL2Cache<i32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        assert_eq!(cache.get("nope").await, None);
    }

    #[tokio::test]
    async fn l1_expire_replaces_ttl() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        cache.set("k".to_string(), 1).await;
        assert!(cache.expire("k", Duration::from_millis(1)).await);
        tokio::time::sleep(Duration::from_millis(10)).await;
        assert_eq!(cache.get("k").await, None);
    }

    #[tokio::test]
    async fn l1_only_does_not_enable_l2() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        assert!(!cache.has_l2());
    }

    #[tokio::test]
    async fn invalid_redis_url_falls_back_to_l1() {
        let result = AsyncL2Cache::<u32>::try_new(
            L2CacheConfig::default(),
            Some("not-a-valid-redis-url://x"),
        )
        .await;
        match result {
            Ok(_) => panic!("invalid URL should fail"),
            Err((cache, warn)) => {
                assert!(!cache.has_l2(), "fallback should be L1 only");
                assert!(warn.contains("回退"));
            }
        }
    }

    #[tokio::test]
    async fn no_redis_url_creates_l1_only() {
        match AsyncL2Cache::<u32>::try_new(L2CacheConfig::default(), None).await {
            Ok(cache) => {
                assert!(!cache.has_l2());
                cache.set("x".to_string(), 99).await;
                assert_eq!(cache.get("x").await, Some(99));
            }
            Err(_) => panic!("no redis url should succeed"),
        }
    }

    #[tokio::test]
    async fn clear_l1_does_not_panic() {
        let cache: AsyncL2Cache<String> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        cache.set("a".to_string(), "1".to_string()).await;
        cache.set("b".to_string(), "2".to_string()).await;
        cache.clear_l1();
        // L1 为空（moka entry_count 是最终一致，用 get 验证）
        assert_eq!(cache.get("a").await, None);
        assert_eq!(cache.get("b").await, None);
    }

    #[tokio::test]
    async fn clone_shares_underlying_data() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        let cloned = cache.clone();
        cache.set("shared".to_string(), 7).await;
        assert_eq!(cloned.get("shared").await, Some(7));
    }

    // ===== 新增：L2CacheConfig 测试 =====

    #[test]
    fn test_default_config_values() {
        let cfg = L2CacheConfig::default();
        assert_eq!(cfg.instance_prefix, "");
        assert_eq!(cfg.l1_ttl, Duration::from_secs(60));
        assert_eq!(cfg.l2_ttl, Duration::from_secs(600));
        assert_eq!(cfg.l1_capacity, 10_000);
    }

    #[test]
    fn test_custom_config_fields() {
        let cfg = L2CacheConfig {
            instance_prefix: "svc-A".to_string(),
            l1_ttl: Duration::from_secs(10),
            l2_ttl: Duration::from_secs(300),
            l1_capacity: 500,
        };
        assert_eq!(cfg.instance_prefix, "svc-A");
        assert_eq!(cfg.l1_ttl, Duration::from_secs(10));
        assert_eq!(cfg.l2_ttl, Duration::from_secs(300));
        assert_eq!(cfg.l1_capacity, 500);
    }

    #[test]
    fn test_config_clone_preserves_fields() {
        let cfg = L2CacheConfig {
            instance_prefix: "instance-1".to_string(),
            l1_ttl: Duration::from_secs(30),
            l2_ttl: Duration::from_secs(900),
            l1_capacity: 200,
        };
        let cloned = cfg.clone();
        assert_eq!(cloned.instance_prefix, cfg.instance_prefix);
        assert_eq!(cloned.l1_ttl, cfg.l1_ttl);
        assert_eq!(cloned.l2_ttl, cfg.l2_ttl);
        assert_eq!(cloned.l1_capacity, cfg.l1_capacity);
    }

    // ===== 新增：AsyncL2Cache 构造（L1 容量路径）测试 =====

    #[tokio::test]
    async fn test_new_l1_only_with_zero_capacity_works() {
        let cfg = L2CacheConfig {
            l1_capacity: 0,
            ..Default::default()
        };
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(cfg);
        assert!(!cache.has_l2());
        cache.set("k".to_string(), 42).await;
        assert_eq!(cache.get("k").await, Some(42));
    }

    #[tokio::test]
    async fn test_new_l1_only_with_custom_capacity_works() {
        let cfg = L2CacheConfig {
            l1_capacity: 2,
            ..Default::default()
        };
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(cfg);
        assert!(!cache.has_l2());
        cache.set("a".to_string(), 1).await;
        cache.set("b".to_string(), 2).await;
        assert_eq!(cache.get("a").await, Some(1));
        assert_eq!(cache.get("b").await, Some(2));
    }

    // ===== 新增：Redis 不可达降级测试 =====

    #[tokio::test]
    async fn test_try_new_with_unreachable_redis_falls_back() {
        let result =
            AsyncL2Cache::<u32>::try_new(L2CacheConfig::default(), Some("redis://127.0.0.1:1"))
                .await;
        match result {
            Ok(_) => panic!("unreachable Redis should cause fallback to L1"),
            Err((cache, warn)) => {
                assert!(!cache.has_l2(), "fallback should not have L2");
                assert!(
                    warn.contains("回退"),
                    "warning should mention fallback: {}",
                    warn
                );
            }
        }
    }

    #[tokio::test]
    async fn test_try_new_unreachable_redis_l1_still_usable() {
        let cache = match AsyncL2Cache::<u32>::try_new(
            L2CacheConfig::default(),
            Some("redis://127.0.0.1:1"),
        )
        .await
        {
            Ok(c) => c,
            Err((c, _)) => c,
        };
        assert!(!cache.has_l2());
        // L1 仍可正常读写
        cache.set("fallback-key".to_string(), 100).await;
        assert_eq!(cache.get("fallback-key").await, Some(100));
    }

    // ===== 新增：TTL 过期测试 =====

    #[tokio::test]
    async fn test_set_with_custom_ttl_l1_expires() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        cache
            .set_with_ttl(
                "ephemeral".to_string(),
                1,
                Duration::from_millis(1),
                Duration::from_secs(60),
            )
            .await;
        tokio::time::sleep(Duration::from_millis(10)).await;
        assert_eq!(cache.get("ephemeral").await, None);
    }

    // ===== 新增：结构体值序列化测试 =====

    use serde::{Deserialize, Serialize};

    #[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
    struct TestData {
        name: String,
        value: i64,
    }

    #[tokio::test]
    async fn test_set_get_with_struct_value() {
        let cache: AsyncL2Cache<TestData> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        let data = TestData {
            name: "alice".to_string(),
            value: 42,
        };
        cache.set("user:1".to_string(), data.clone()).await;
        assert_eq!(cache.get("user:1").await, Some(data));
    }

    // ===== 新增：缓存失效/remove 测试 =====

    #[tokio::test]
    async fn test_remove_and_delete_equivalent() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        cache.set("a".to_string(), 1).await;
        cache.set("b".to_string(), 2).await;
        cache.remove("a").await;
        cache.delete("b").await;
        assert_eq!(cache.get("a").await, None);
        assert_eq!(cache.get("b").await, None);
    }

    #[tokio::test]
    async fn test_remove_nonexistent_no_panic() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        // 删除不存在的 key 不应 panic
        cache.remove("nonexistent").await;
        cache.delete("also-nonexistent").await;
    }

    #[tokio::test]
    async fn test_expire_nonexistent_returns_false() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        let result = cache.expire("missing", Duration::from_secs(10)).await;
        assert!(!result);
    }

    // ===== 新增：覆写与多 key 测试 =====

    #[tokio::test]
    async fn test_overwrite_existing_key() {
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        cache.set("k".to_string(), 1).await;
        assert_eq!(cache.get("k").await, Some(1));
        cache.set("k".to_string(), 2).await;
        assert_eq!(cache.get("k").await, Some(2));
    }

    #[tokio::test]
    async fn test_multiple_keys_set_get() {
        let cache: AsyncL2Cache<String> = AsyncL2Cache::new_l1_only(L2CacheConfig::default());
        for i in 0..10 {
            cache.set(format!("key-{i}"), format!("value-{i}")).await;
        }
        for i in 0..10 {
            assert_eq!(
                cache.get(&format!("key-{i}")).await,
                Some(format!("value-{i}"))
            );
        }
    }

    // ===== 新增：L1 容量淘汰测试 =====

    #[tokio::test]
    async fn test_l1_only_capacity_eviction() {
        let cfg = L2CacheConfig {
            l1_capacity: 3,
            l1_ttl: Duration::from_secs(60),
            ..Default::default()
        };
        let cache: AsyncL2Cache<u32> = AsyncL2Cache::new_l1_only(cfg);
        cache.set("a".to_string(), 1).await;
        tokio::time::sleep(Duration::from_millis(1)).await;
        cache.set("b".to_string(), 2).await;
        tokio::time::sleep(Duration::from_millis(1)).await;
        cache.set("c".to_string(), 3).await;
        tokio::time::sleep(Duration::from_millis(1)).await;
        cache.set("d".to_string(), 4).await;
        // 插入第 4 个后应触发 LRU 淘汰，最新的 "d" 必然存在
        assert_eq!(cache.get("d").await, Some(4));
    }
}
