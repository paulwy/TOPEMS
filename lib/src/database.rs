use crate::config::DatabaseConfig;
use crate::error::TopemsError;
use crate::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::time::Duration;
use tracing::{info, error};

pub async fn create_database_pool(config: &DatabaseConfig) -> Result<PgPool> {
    let search_path = std::env::var("SEARCH_PATH").unwrap_or_else(|_| "rs, erp, public".to_string());
    
    let options = PgPoolOptions::new()
        .max_connections(config.pool_max_size)
        .min_connections(config.pool_min_size)
        .acquire_timeout(Duration::from_secs(config.connect_timeout))
        .idle_timeout(Duration::from_secs(config.idle_timeout))
        .max_lifetime(Duration::from_secs(1800)) 
        .test_before_acquire(true)
        .after_connect(move |conn, _meta| {
            let search_path = search_path.clone();
            Box::pin(async move {
                let query = format!("SET search_path TO {}", search_path);
                let result = sqlx::query(&query)
                    .execute(conn)
                    .await;
                result.map_err(|e| {
                    error!("Failed to set search path: {}", e);
                    e
                })?;
                Ok(())
            })
        });

    let pool = options
        .connect(&config.url)
        .await
        .map_err(|e| TopemsError::Database(format!("Failed to create database pool: {}", e)))?;

    info!("✅ 数据库连接池创建成功 (max: {}, min: {}, timeout: {}s)", 
          config.pool_max_size, config.pool_min_size, config.connect_timeout);
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

#[derive(Debug, Clone)]
pub struct HealthCheckResult {
    pub healthy: bool,
    pub latency: Option<Duration>,
    pub error: Option<String>,
}

pub async fn check_pool_health(pool: &PgPool) -> HealthCheckResult {
    let start = std::time::Instant::now();
    
    let result = match sqlx::query("SELECT 1").fetch_one(pool).await {
        Ok(_) => HealthCheckResult {
            healthy: true,
            latency: Some(start.elapsed()),
            error: None,
        },
        Err(e) => HealthCheckResult {
            healthy: false,
            latency: None,
            error: Some(e.to_string()),
        },
    };
    
    result
}
