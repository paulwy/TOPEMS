//! 分布式锁实现

use redis::{AsyncCommands, Client};
use std::time::Duration;
use uuid::Uuid;

use crate::error::{MigrationError, Result};

/// 分布式锁
#[derive(Clone)]
pub struct DistLock {
    redis_url: String,
    lock_prefix: String,
    default_ttl: Duration,
}

impl DistLock {
    /// 创建分布式锁
    pub fn new(redis_url: &str) -> Self {
        Self {
            redis_url: redis_url.to_string(),
            lock_prefix: "migration:lock:".to_string(),
            default_ttl: Duration::from_secs(300),
        }
    }

    /// 设置锁前缀
    pub fn with_prefix(mut self, prefix: &str) -> Self {
        self.lock_prefix = prefix.to_string();
        self
    }

    /// 设置默认 TTL
    pub fn with_ttl(mut self, ttl: Duration) -> Self {
        self.default_ttl = ttl;
        self
    }

    /// 获取连接
    fn get_client(&self) -> Result<Client> {
        Client::open(self.redis_url.as_str()).map_err(|e| MigrationError::Redis(e))
    }

    /// 尝试获取锁
    pub async fn acquire(&self, resource: &str) -> Result<Option<LockGuard>> {
        self.acquire_with_ttl(resource, self.default_ttl).await
    }

    /// 尝试获取锁，带超时
    pub async fn acquire_with_ttl(
        &self,
        resource: &str,
        ttl: Duration,
    ) -> Result<Option<LockGuard>> {
        let lock_key = format!("{}{}", self.lock_prefix, resource);
        let lock_value = Uuid::new_v4().to_string();

        let client = self.get_client()?;
        let mut conn = client.get_multiplexed_async_connection().await?;

        let result: bool = redis::cmd("SET")
            .arg(&lock_key)
            .arg(&lock_value)
            .arg("NX")
            .arg("EX")
            .arg(ttl.as_secs())
            .query_async(&mut conn)
            .await
            .map_err(MigrationError::Redis)?;

        if result {
            Ok(Some(LockGuard {
                redis_url: self.redis_url.clone(),
                lock_key,
                lock_value,
                acquired: true,
            }))
        } else {
            Ok(None)
        }
    }

    /// 释放锁
    pub async fn release(&self, lock_key: &str, lock_value: &str) -> Result<bool> {
        let client = self.get_client()?;
        let mut conn = client.get_multiplexed_async_connection().await?;

        let script = r#"
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        "#;

        let result: i32 = redis::cmd("EVAL")
            .arg(script)
            .arg(1)
            .arg(lock_key)
            .arg(lock_value)
            .query_async(&mut conn)
            .await
            .map_err(MigrationError::Redis)?;

        Ok(result == 1)
    }

    /// 检查锁是否存在
    pub async fn is_locked(&self, resource: &str) -> Result<bool> {
        let lock_key = format!("{}{}", self.lock_prefix, resource);
        let client = self.get_client()?;
        let mut conn = client.get_multiplexed_async_connection().await?;

        let exists: bool = conn.exists(&lock_key).await?;
        Ok(exists)
    }

    /// 延长锁的 TTL
    pub async fn extend(&self, resource: &str, lock_value: &str, ttl: Duration) -> Result<bool> {
        let lock_key = format!("{}{}", self.lock_prefix, resource);
        let client = self.get_client()?;
        let mut conn = client.get_multiplexed_async_connection().await?;

        let script = r#"
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("expire", KEYS[1], ARGV[2])
            else
                return 0
            end
        "#;

        let result: i32 = redis::cmd("EVAL")
            .arg(script)
            .arg(1)
            .arg(&lock_key)
            .arg(lock_value)
            .arg(ttl.as_secs())
            .query_async(&mut conn)
            .await
            .map_err(MigrationError::Redis)?;

        Ok(result == 1)
    }
}

/// 锁guard，用于自动释放锁
pub struct LockGuard {
    redis_url: String,
    lock_key: String,
    lock_value: String,
    acquired: bool,
}

impl LockGuard {
    /// 手动释放锁
    pub async fn release(mut self) -> Result<bool> {
        if !self.acquired {
            return Ok(false);
        }

        let lock = DistLock::new(&self.redis_url);
        let result = lock.release(&self.lock_key, &self.lock_value).await?;
        self.acquired = false;
        Ok(result)
    }

    /// 获取锁键
    pub fn key(&self) -> &str {
        &self.lock_key
    }

    /// 检查锁是否仍然有效
    pub fn is_valid(&self) -> bool {
        self.acquired
    }
}

impl Drop for LockGuard {
    fn drop(&mut self) {
        if self.acquired {
            let redis_url = self.redis_url.clone();
            let lock_key = self.lock_key.clone();

            tokio::spawn(async move {
                if let Ok(Some(lock_guard)) = DistLock::new(&redis_url).acquire(&lock_key).await {
                    let _ = lock_guard.release().await;
                }
            });
        }
    }
}

/// 锁上下文管理器
pub struct LockContext {
    lock: Option<LockGuard>,
}

impl LockContext {
    pub async fn lock(redis_url: &str, resource: &str) -> Result<Self> {
        let lock = DistLock::new(redis_url);
        match lock.acquire(resource).await? {
            Some(guard) => Ok(Self { lock: Some(guard) }),
            None => Err(MigrationError::LockFailed(format!(
                "Failed to acquire lock for resource: {}",
                resource
            ))),
        }
    }

    pub fn release(&mut self) {
        if let Some(_guard) = self.lock.take() {}
    }
}
