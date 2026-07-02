use sqlx::PgPool;

pub mod handlers;
pub mod models;
pub mod service;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_migration_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plugin_name VARCHAR(128) NOT NULL,
            version VARCHAR(64) NOT NULL,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            applied_at TIMESTAMP,
            duration_ms BIGINT,
            success BOOLEAN DEFAULT TRUE,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (plugin_name, version)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_migration_history_plugin ON core_migration_history(plugin_name)")
        .execute(pool)
        .await?;

    Ok(())
}
