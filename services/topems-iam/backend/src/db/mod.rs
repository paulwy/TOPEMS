use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;
use tracing;

pub async fn create_pool() -> Result<PgPool, String> {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems@localhost:5432/topems".to_string());

    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("✅ Connected to PostgreSQL database");
            pool
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to PostgreSQL: {}", e);
            return Err(format!("Failed to connect to database: {}", e));
        }
    };

    Ok(pool)
}