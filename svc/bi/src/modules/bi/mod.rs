//! BI module - Business Intelligence

pub mod analysis;
pub mod analytics;
pub mod chart_service;
pub mod dashboard;
pub mod datasource;
pub mod plugin;
pub mod visualization;
pub mod websocket;
pub mod widget;

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
            auto_refresh_enabled BOOLEAN DEFAULT FALSE,
            auto_refresh_interval INTEGER,
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
            datasource_id UUID,
            query_config JSONB,
            cache_ttl_seconds INTEGER DEFAULT 60,
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

    // Create dashboard templates table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_dashboard_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            layout JSONB,
            preview_image VARCHAR(256),
            category VARCHAR(64),
            tags TEXT[],
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create dashboard shares table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_dashboard_shares (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            dashboard_id UUID NOT NULL REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
            shared_with TEXT[] DEFAULT '{}',
            permission VARCHAR(16) NOT NULL DEFAULT 'view',
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
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
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_templates_active ON analytics_dashboard_templates(is_active)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_templates_category ON analytics_dashboard_templates(category)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_shares_dashboard ON analytics_dashboard_shares(dashboard_id)")
        .execute(pool)
        .await?;

    Ok(())
}
