use crate::config::DatabaseConfig;
use crate::error::TopemsError;
use crate::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::info;

pub async fn create_database_pool(config: &DatabaseConfig) -> Result<PgPool> {
    let options = PgPoolOptions::new()
        .max_connections(config.pool_max_size)
        .min_connections(config.pool_min_size)
        .acquire_timeout(std::time::Duration::from_secs(config.connect_timeout))
        .idle_timeout(std::time::Duration::from_secs(config.idle_timeout));

    let pool = options
        .connect(&config.url)
        .await
        .map_err(|e| TopemsError::Database(format!("Failed to create database pool: {}", e)))?;

    info!("✅ 数据库连接池创建成功");
    Ok(pool)
}

pub async fn test_database_connection(pool: &PgPool) -> Result<()> {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .map_err(|e| TopemsError::Database(format!("Database connection test failed: {}", e)))?;
    
    info!("✅ 数据库连接测试通过");
    Ok(())
}
