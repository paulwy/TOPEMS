use crate::config::DatabaseConfig;
use crate::error::TopemsError;
use crate::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tracing::info;

pub async fn create_database_pool(config: &DatabaseConfig) -> Result<PgPool> {
    let search_path = std::env::var("SEARCH_PATH").unwrap_or_else(|_| "rs, erp, public".to_string());
    
    let options = PgPoolOptions::new()
        .max_connections(config.pool_max_size)
        .min_connections(config.pool_min_size)
        .after_connect(move |conn, _meta| {
            let search_path = search_path.clone();
            Box::pin(async move {
                tracing::info!("after_connect called for new connection");
                let query = format!("SET search_path TO {}", search_path);
                let result = sqlx::query(&query)
                    .execute(conn)
                    .await;
                tracing::info!("after_connect SET search_path result: {:?}", result);
                result.map_err(|e| {
                    tracing::error!("Failed to set search path: {}", e);
                    e
                })?;
                Ok(())
            })
        });

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
