use crate::config::enhanced::RedisConfig;
use crate::error::TopemsError;
use crate::Result;
use redis::{Client, Connection, RedisResult};
use std::sync::Arc;
use async_trait::async_trait;

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
}

impl RedisCacheService {
    pub fn new(pool: Arc<RedisPool>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl CacheService for RedisCacheService {
    async fn get(&self, key: &str) -> Result<Option<String>> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<Option<String>> = redis::cmd("GET").arg(key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis GET failed: {}", e)))
    }

    async fn set(&self, key: &str, value: &str, ttl_seconds: Option<u64>) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        if let Some(ttl) = ttl_seconds {
            redis::cmd("SET").arg(key).arg(value).arg("EX").arg(ttl).query::<()>(&mut conn)
        } else {
            redis::cmd("SET").arg(key).arg(value).query::<()>(&mut conn)
        }.map_err(|e| TopemsError::Config(format!("Redis SET failed: {}", e)))?;
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("DEL").arg(key).query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis DEL failed: {}", e)))?;
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<bool> = redis::cmd("EXISTS").arg(key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis EXISTS failed: {}", e)))
    }

    async fn incr(&self, key: &str) -> Result<i64> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<i64> = redis::cmd("INCR").arg(key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis INCR failed: {}", e)))
    }

    async fn hset(&self, key: &str, field: &str, value: &str) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("HSET").arg(key).arg(field).arg(value).query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis HSET failed: {}", e)))?;
        Ok(())
    }

    async fn hget(&self, key: &str, field: &str) -> Result<Option<String>> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<Option<String>> = redis::cmd("HGET").arg(key).arg(field).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis HGET failed: {}", e)))
    }

    async fn hdel(&self, key: &str, field: &str) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("HDEL").arg(key).arg(field).query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis HDEL failed: {}", e)))?;
        Ok(())
    }

    async fn expire(&self, key: &str, seconds: u64) -> Result<bool> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<bool> = redis::cmd("EXPIRE").arg(key).arg(seconds).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis EXPIRE failed: {}", e)))
    }

    async fn ttl(&self, key: &str) -> Result<i64> {
        let mut conn = self.pool.get_connection().await?;
        let result: RedisResult<i64> = redis::cmd("TTL").arg(key).query(&mut conn);
        result.map_err(|e| TopemsError::Config(format!("Redis TTL failed: {}", e)))
    }

    async fn flush_db(&self) -> Result<()> {
        let mut conn = self.pool.get_connection().await?;
        redis::cmd("FLUSHDB").query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis FLUSHDB failed: {}", e)))?;
        Ok(())
    }
}