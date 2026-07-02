//! 向量存储模块
//!
//! 支持 Redis 和本地 pgvector 两种存储后端

use anyhow::Result;
use async_trait::async_trait;
use redis::{aio::ConnectionManager, AsyncCommands, Client};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// 向量元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorMetadata {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub name: Option<String>,
    pub category: Option<String>,
    pub created_at: String,
}

impl VectorMetadata {
    pub fn new(entity_type: &str, entity_id: &str) -> Self {
        Self {
            id: format!("{}:{}", entity_type, entity_id),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            name: None,
            category: None,
            created_at: chrono_now(),
        }
    }

    pub fn with_name(mut self, name: String) -> Self {
        self.name = Some(name);
        self
    }

    pub fn with_category(mut self, category: String) -> Self {
        self.category = Some(category);
        self
    }
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}

/// 搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub score: f32,
    pub metadata: VectorMetadata,
}

/// 向量存储 trait
#[async_trait]
pub trait VectorStore: Send + Sync {
    /// 存储向量
    async fn store(&self, key: &str, vector: &[f32], metadata: VectorMetadata) -> Result<()>;

    /// 批量存储向量
    async fn store_batch(&self, items: Vec<(&str, &[f32], VectorMetadata)>) -> Result<()>;

    /// 搜索相似向量
    async fn search(&self, vector: &[f32], limit: usize) -> Result<Vec<SearchResult>>;

    /// 按 ID 获取向量
    async fn get(&self, key: &str) -> Result<Option<(Vec<f32>, VectorMetadata)>>;

    /// 删除向量
    async fn delete(&self, key: &str) -> Result<()>;

    /// 检查向量是否存在
    async fn exists(&self, key: &str) -> Result<bool>;
}

/// Redis 向量存储实现
#[derive(Clone)]
pub struct RedisVectorStore {
    conn: ConnectionManager,
    prefix: String,
}

impl RedisVectorStore {
    pub async fn new(redis_url: &str, prefix: &str) -> Result<Self> {
        let client = Client::open(redis_url)?;
        let conn = ConnectionManager::new(client).await?;

        Ok(Self {
            conn,
            prefix: prefix.to_string(),
        })
    }

    fn make_key(&self, key: &str) -> String {
        format!("{}:{}", self.prefix, key)
    }

    /// 初始化 Redis 向量索引
    pub async fn init_index(&self) -> Result<()> {
        let mut conn = self.conn.clone();

        let script = r#"
local index_name = KEYS[1]
local dimension = tonumber(ARGV[1])
local prefix = ARGV[2]

-- 检查索引是否存在
local exists = redis.call('FT.INFO', index_name)
if exists then
    return 'Index already exists'
end

-- 创建向量索引
redis.call('FT.CREATE', index_name,
    'ON', 'HASH',
    'PREFIX', '1', prefix,
    'SCHEMA',
    'embedding', 'VECTOR', 'HNSW', '6',
    'DIM', dimension,
    'TYPE', 'FLOAT32',
    'DISTANCE_METRIC', 'COSINE',
    'metadata', 'JSON'
)

return 'Index created'
"#;

        let _: String = redis::Script::new(script)
            .key(&self.prefix)
            .invoke_async(&mut conn)
            .await?;

        Ok(())
    }
}

#[async_trait]
impl VectorStore for RedisVectorStore {
    async fn store(&self, key: &str, vector: &[f32], metadata: VectorMetadata) -> Result<()> {
        let mut conn = self.conn.clone();
        let full_key = self.make_key(key);

        // 序列化向量为字节
        let vector_bytes: Vec<u8> = vector.iter().flat_map(|f| f.to_le_bytes()).collect();

        // 序列化元数据
        let metadata_json = serde_json::to_string(&metadata)?;

        // 使用 HSET 存储
        let _: () = redis::pipe()
            .hset(&full_key, "embedding", vector_bytes)
            .hset(&full_key, "metadata", metadata_json)
            .query_async(&mut conn)
            .await?;

        Ok(())
    }

    async fn store_batch(&self, items: Vec<(&str, &[f32], VectorMetadata)>) -> Result<()> {
        let mut conn = self.conn.clone();
        let mut pipe = redis::pipe();

        for (key, vector, metadata) in items {
            let full_key = self.make_key(key);
            let vector_bytes: Vec<u8> = vector.iter().flat_map(|f| f.to_le_bytes()).collect();
            let metadata_json = serde_json::to_string(&metadata)?;

            pipe.hset(&full_key, "embedding", vector_bytes).hset(
                &full_key,
                "metadata",
                metadata_json,
            );
        }

        let _: () = pipe.query_async(&mut conn).await?;
        Ok(())
    }

    async fn search(&self, vector: &[f32], limit: usize) -> Result<Vec<SearchResult>> {
        let mut conn = self.conn.clone();

        // 序列化查询向量
        let vector_bytes: Vec<u8> = vector.iter().flat_map(|f| f.to_le_bytes()).collect();

        // 使用 KNN 搜索
        let index_name = format!("{}:index", self.prefix);
        let query = format!("*=>[KNN {} @embedding $vector AS score]", limit);

        let results: Vec<(String, f32, String)> = redis::cmd("FT.SEARCH")
            .arg(&index_name)
            .arg(&query)
            .arg("PARAMS")
            .arg(2)
            .arg("vector")
            .arg(&vector_bytes)
            .arg("RETURN")
            .arg(2)
            .arg("score")
            .arg("metadata")
            .query_async(&mut conn)
            .await?;

        let mut search_results = Vec::new();
        for (id, score, metadata_json) in results {
            if let Ok(metadata) = serde_json::from_str::<VectorMetadata>(&metadata_json) {
                search_results.push(SearchResult {
                    id,
                    score: 1.0 - score, // 转换为相似度
                    metadata,
                });
            }
        }

        Ok(search_results)
    }

    async fn get(&self, key: &str) -> Result<Option<(Vec<f32>, VectorMetadata)>> {
        let mut conn = self.conn.clone();
        let full_key = self.make_key(key);

        let result: Option<(Vec<u8>, String)> = conn.hgetall(&full_key).await?;

        match result {
            Some((vector_bytes, metadata_json)) => {
                // 反序列化向量
                let vector: Vec<f32> = vector_bytes
                    .chunks_exact(4)
                    .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                    .collect();

                let metadata: VectorMetadata = serde_json::from_str(&metadata_json)?;

                Ok(Some((vector, metadata)))
            }
            None => Ok(None),
        }
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let mut conn = self.conn.clone();
        let full_key = self.make_key(key);

        let _: () = conn.del(&full_key).await?;
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        let mut conn = self.conn.clone();
        let full_key = self.make_key(key);

        let exists: bool = conn.exists(&full_key).await?;
        Ok(exists)
    }
}

/// 使用本地 pgvector 的向量存储（开发环境）
#[cfg(feature = "pgvector")]
pub mod pgvector_store {
    use super::*;
    use sqlx::PgPool;

    pub struct PgVectorStore {
        pool: PgPool,
        table_name: String,
    }

    impl PgVectorStore {
        pub fn new(pool: PgPool, table_name: &str) -> Self {
            Self {
                pool,
                table_name: table_name.to_string(),
            }
        }
    }

    #[async_trait]
    impl VectorStore for PgVectorStore {
        async fn store(&self, key: &str, vector: &[f32], metadata: VectorMetadata) -> Result<()> {
            let vector_str = format!(
                "[{}]",
                vector
                    .iter()
                    .map(|f| f.to_string())
                    .collect::<Vec<_>>()
                    .join(",")
            );

            sqlx::query!(
                r#"
                INSERT INTO plugin_hrm.vectors (key, embedding, metadata)
                VALUES ($1, $2::vector, $3)
                ON CONFLICT (key) DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
                "#,
                key,
                vector_str,
                serde_json::to_value(&metadata)?,
            )
            .execute(&self.pool)
            .await?;

            Ok(())
        }

        async fn store_batch(&self, items: Vec<(&str, &[f32], VectorMetadata)>) -> Result<()> {
            for (key, vector, metadata) in items {
                self.store(key, vector, metadata).await?;
            }
            Ok(())
        }

        async fn search(&self, vector: &[f32], limit: usize) -> Result<Vec<SearchResult>> {
            let vector_str = format!(
                "[{}]",
                vector
                    .iter()
                    .map(|f| f.to_string())
                    .collect::<Vec<_>>()
                    .join(",")
            );

            let rows = sqlx::query!(
                r#"
                SELECT key, 1 - (embedding <=> $1::vector) as score, metadata
                FROM plugin_hrm.vectors
                ORDER BY embedding <=> $1::vector
                LIMIT $2
                "#,
                vector_str,
                limit as i64,
            )
            .fetch_all(&self.pool)
            .await?;

            let results = rows
                .into_iter()
                .filter_map(|row| {
                    Some(SearchResult {
                        id: row.key?,
                        score: row.score? as f32,
                        metadata: serde_json::from_value(row.metadata?).ok()?,
                    })
                })
                .collect();

            Ok(results)
        }

        async fn get(&self, key: &str) -> Result<Option<(Vec<f32>, VectorMetadata)>> {
            let row = sqlx::query!(
                r#"SELECT embedding::text, metadata FROM plugin_hrm.vectors WHERE key = $1"#,
                key,
            )
            .fetch_optional(&self.pool)
            .await?;

            match row {
                Some(r) => {
                    let embedding_str = r.embedding.trim_start_matches('[').trim_end_matches(']');
                    let vector: Vec<f32> = embedding_str
                        .split(',')
                        .filter_map(|s| s.trim().parse().ok())
                        .collect();
                    let metadata: VectorMetadata = serde_json::from_value(r.metadata)?;

                    Ok(Some((vector, metadata)))
                }
                None => Ok(None),
            }
        }

        async fn delete(&self, key: &str) -> Result<()> {
            sqlx::query!("DELETE FROM plugin_hrm.vectors WHERE key = $1", key)
                .execute(&self.pool)
                .await?;
            Ok(())
        }

        async fn exists(&self, key: &str) -> Result<bool> {
            let result: Option<(i64,)> =
                sqlx::query_as("SELECT 1 FROM plugin_hrm.vectors WHERE key = $1")
                    .bind(key)
                    .fetch_optional(&self.pool)
                    .await?;

            Ok(result.is_some())
        }
    }
}

/// 工厂函数：根据配置创建向量存储
pub async fn create_vector_store(
    redis_url: &str,
    use_pgvector: bool,
    _pool: Option<sqlx::PgPool>,
) -> Result<Arc<dyn VectorStore>> {
    if use_pgvector {
        #[cfg(feature = "pgvector")]
        {
            if let Some(_pg_pool) = pool {
                let store = pgvector_store::PgVectorStore::new(_pg_pool, "vectors");
                return Ok(Arc::new(store));
            }
        }
        anyhow::bail!("pgvector pool not available");
    }

    let store = RedisVectorStore::new(redis_url, "topems").await?;
    Ok(Arc::new(store))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_metadata() {
        let metadata = VectorMetadata::new("employee", "123")
            .with_name("张三".to_string())
            .with_category("Engineering".to_string());

        assert_eq!(metadata.entity_type, "employee");
        assert_eq!(metadata.entity_id, "123");
        assert_eq!(metadata.name, Some("张三".to_string()));
    }
}
