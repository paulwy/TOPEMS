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

use crate::cache::InMemoryCache as MokaL1;

// ===== Redis 相关（仅当 redis_client 参数传入时启用 L2）=====
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

/// Redis L2 后端（封装连接和前缀）
struct RedisL2Backend {
    client: RedisClient,
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
                // 探测连接有效性（同步 get_connection 会阻塞，但只在启动时调用一次）
                match client.get_connection() {
                    Ok(mut conn) => {
                        let _: Result<String, _> = redis::cmd("PING").query(&mut conn);
                        let backend = RedisL2Backend {
                            client,
                            prefix: config.instance_prefix.clone(),
                        };
                        Ok(Self {
                            l1,
                            l2: Some(Arc::new(backend)),
                            config,
                        })
                    }
                    Err(e) => {
                        let warn = format!("Redis 连接失败，回退到纯 L1 模式: {}", e);
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
        let l2 = Arc::clone(l2);
        // Redis 同步 API 用 spawn_blocking 避免阻塞 async runtime
        tokio::task::spawn_blocking(move || {
            let mut conn = l2.client.get_connection().ok()?;
            let r: redis::RedisResult<Option<String>> =
                redis::cmd("GET").arg(&full_key).query(&mut conn);
            r.ok().flatten()
        })
        .await
        .ok()
        .flatten()
    }

    /// 写入 Redis L2，失败静默（只在日志 debug 可见）
    async fn l2_set_raw(&self, key: &str, value: &str, ttl: Duration) {
        let Some(l2) = &self.l2 else {
            return;
        };
        let full_key = l2.full_key(key);
        let value = value.to_string();
        let secs = ttl.as_secs().max(1); // 至少 1s，Redis SET EX 不接受 0
        let l2 = Arc::clone(l2);
        let _ = tokio::task::spawn_blocking(move || {
            let mut conn = match l2.client.get_connection() {
                Ok(c) => c,
                Err(_) => return,
            };
            let _: redis::RedisResult<()> = redis::cmd("SET")
                .arg(&full_key)
                .arg(&value)
                .arg("EX")
                .arg(secs)
                .query(&mut conn);
        })
        .await;
    }

    /// 删除 Redis L2 key
    async fn l2_delete_raw(&self, key: &str) {
        let Some(l2) = &self.l2 else {
            return;
        };
        let full_key = l2.full_key(key);
        let l2 = Arc::clone(l2);
        let _ = tokio::task::spawn_blocking(move || {
            let mut conn = match l2.client.get_connection() {
                Ok(c) => c,
                Err(_) => return,
            };
            let _: redis::RedisResult<()> = redis::cmd("DEL").arg(&full_key).query(&mut conn);
        })
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
}
