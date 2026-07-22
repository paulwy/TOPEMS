use sqlx::{PgPool, Postgres};

/// 读写分离配置
#[derive(Debug, Clone)]
pub struct ReadWriteConfig {
    /// 主库连接池（用于写操作）
    pub primary_pool: PgPool,
    /// 副本连接池（用于读操作，可选）
    pub replica_pool: Option<PgPool>,
    /// 是否强制走主库（用于事务内读）
    pub force_primary: bool,
}

/// 读写分离管理器
pub struct ReadWritePool {
    config: ReadWriteConfig,
}

impl ReadWritePool {
    pub fn new(config: ReadWriteConfig) -> Self {
        Self { config }
    }

    /// 获取读连接池（优先副本）
    pub fn read_pool(&self) -> &PgPool {
        if self.config.force_primary {
            return &self.config.primary_pool;
        }
        self.config
            .replica_pool
            .as_ref()
            .unwrap_or(&self.config.primary_pool)
    }

    /// 获取写连接池（始终是主库）
    pub fn write_pool(&self) -> &PgPool {
        &self.config.primary_pool
    }

    /// 在事务中执行（自动走主库）
    pub async fn transaction<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: for<'c> FnOnce(
                &mut sqlx::Transaction<'c, Postgres>,
            ) -> std::pin::Pin<
                Box<dyn std::future::Future<Output = Result<T, E>> + Send + 'c>,
            > + Send
            + 'static,
        E: From<sqlx::Error>,
    {
        let mut tx = self.config.primary_pool.begin().await?;
        let result = f(&mut tx).await;
        match result {
            Ok(value) => {
                tx.commit().await?;
                Ok(value)
            }
            Err(e) => {
                tx.rollback().await?;
                Err(e)
            }
        }
    }

    /// 创建只读连接池（用于报表等重查询）
    pub fn read_only(&self) -> ReadWritePool {
        let config = ReadWriteConfig {
            primary_pool: self.config.primary_pool.clone(),
            replica_pool: self.config.replica_pool.clone(),
            force_primary: false,
        };
        ReadWritePool::new(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_write_pool_creation() {
        // 测试创建读写分离池的基本逻辑
        let config = ReadWriteConfig {
            primary_pool: PgPool::connect_lazy("postgres://test").unwrap(),
            replica_pool: None,
            force_primary: false,
        };
        let pool = ReadWritePool::new(config);
        assert!(pool.read_pool().is_some());
    }
}
