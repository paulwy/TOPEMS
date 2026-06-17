//! BI module - Business Intelligence

pub mod dashboard;
pub mod widget;
pub mod datasource;
pub mod visualization;
pub mod analysis;

use sqlx::PgPool;

/// Initialize BI database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create dashboards table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_dashboards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            layout JSONB,
            owner_id VARCHAR(64) NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create widgets table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_widgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            dashboard_id UUID,
            name VARCHAR(128) NOT NULL,
            widget_type VARCHAR(32) NOT NULL,
            config JSONB,
            position JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create datasources table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_datasources (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            source_type VARCHAR(32) NOT NULL,
            connection_config JSONB,
            query_template TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON analytics_dashboards(owner_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON analytics_widgets(dashboard_id)")
        .execute(pool)
        .await?;

    Ok(())
}
