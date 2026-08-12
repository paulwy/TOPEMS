//! BI module - Business Intelligence

pub mod analysis;
pub mod analytics;
pub mod chart_service;
pub mod comparison_analysis;
pub mod dashboard;
pub mod data_drilldown;
pub mod dataset;
pub mod dataset_whitelist;
pub mod datasource;
pub mod multidimensional_analysis;
pub mod plugin;
pub mod predictive_analysis;
pub mod row_level_permission;
pub mod self_service_report;
#[cfg(test)]
mod sql_injection_tests;
pub mod sync_records;
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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
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
            status VARCHAR(16) NOT NULL DEFAULT 'inactive',
            host VARCHAR(256),
            database VARCHAR(128),
            port INTEGER,
            username VARCHAR(128),
            password VARCHAR(256),
            connection_string TEXT,
            last_sync TIMESTAMP,
            data_volume BIGINT DEFAULT 0,
            sync_frequency VARCHAR(32),
            description TEXT,
            is_enabled BOOLEAN DEFAULT TRUE,
            connection_config JSONB,
            query_template TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Add columns if missing (idempotent migration for older deployments)
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'inactive'")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS host VARCHAR(256)")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS database VARCHAR(128)")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS port INTEGER")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS username VARCHAR(128)")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS password VARCHAR(256)")
        .execute(pool)
        .await
        .ok();
    sqlx::query(
        "ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS connection_string TEXT",
    )
    .execute(pool)
    .await
    .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP")
        .execute(pool)
        .await
        .ok();
    sqlx::query(
        "ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS data_volume BIGINT DEFAULT 0",
    )
    .execute(pool)
    .await
    .ok();
    sqlx::query(
        "ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS sync_frequency VARCHAR(32)",
    )
    .execute(pool)
    .await
    .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS description TEXT")
        .execute(pool)
        .await
        .ok();
    sqlx::query("ALTER TABLE analytics_datasources ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE")
        .execute(pool)
        .await
        .ok();

    // Create indexes for datasources
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_datasources_name ON analytics_datasources(name)")
        .execute(pool)
        .await
        .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_datasources_type ON analytics_datasources(source_type)",
    )
    .execute(pool)
    .await
    .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_datasources_status ON analytics_datasources(status)",
    )
    .execute(pool)
    .await
    .ok();
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_datasources_enabled ON analytics_datasources(is_enabled)",
    )
    .execute(pool)
    .await
    .ok();

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
            created_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON analytics_dashboards(owner_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_is_public ON analytics_dashboards(is_public)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_created_at ON analytics_dashboards(created_at)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON analytics_widgets(dashboard_id)",
    )
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

    // Create self-service reports table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_self_service_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            datasource_id UUID NOT NULL,
            fields JSONB DEFAULT '[]',
            filters JSONB,
            config JSONB,
            owner_id VARCHAR(64) NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create drilldown paths table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_drilldown_paths (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            datasource_id UUID NOT NULL,
            levels JSONB DEFAULT '[]',
            measures JSONB DEFAULT '[]',
            owner_id VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create drilldown history table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_drilldown_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(64) NOT NULL,
            path_id UUID NOT NULL REFERENCES analytics_drilldown_paths(id) ON DELETE CASCADE,
            action VARCHAR(32) NOT NULL,
            from_level INTEGER NOT NULL DEFAULT 0,
            to_level INTEGER NOT NULL DEFAULT 0,
            drill_dimension VARCHAR(64),
            drill_value VARCHAR(256),
            filters JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create row-level permissions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_row_level_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            datasource_id UUID NOT NULL,
            table_name VARCHAR(128) NOT NULL,
            rule_type VARCHAR(32) NOT NULL,
            condition JSONB DEFAULT '{}',
            role_ids TEXT[] DEFAULT '{}',
            user_ids TEXT[] DEFAULT '{}',
            is_active BOOLEAN DEFAULT TRUE,
            created_by VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for new tables
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_reports_owner ON analytics_self_service_reports(owner_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_reports_datasource ON analytics_self_service_reports(datasource_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_drilldown_owner ON analytics_drilldown_paths(owner_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_drilldown_datasource ON analytics_drilldown_paths(datasource_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_drilldown_history_user ON analytics_drilldown_history(user_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_drilldown_history_path ON analytics_drilldown_history(path_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_rlp_datasource ON analytics_row_level_permissions(datasource_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rlp_table ON analytics_row_level_permissions(table_name)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_rlp_active ON analytics_row_level_permissions(is_active)",
    )
    .execute(pool)
    .await?;

    // Create BI sync records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_sync_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            data_source_id UUID,
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            sync_type VARCHAR(64) NOT NULL,
            records_count BIGINT,
            affected_records BIGINT,
            error_message TEXT,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMP,
            duration_ms BIGINT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_records_datasource ON analytics_sync_records(data_source_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_sync_records_status ON analytics_sync_records(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_sync_records_type ON analytics_sync_records(sync_type)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_sync_records_started_at ON analytics_sync_records(started_at)")
        .execute(pool)
        .await?;

    // Create comparison analyses table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_comparison_analyses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            comparison_type VARCHAR(32) NOT NULL,
            dimension_a VARCHAR(128) NOT NULL,
            dimension_b VARCHAR(128) NOT NULL,
            indicators JSONB DEFAULT '[]',
            filters JSONB,
            status VARCHAR(16) NOT NULL DEFAULT 'draft',
            last_run_at TIMESTAMP,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create comparison results table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_comparison_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            comparison_id UUID NOT NULL REFERENCES analytics_comparison_analyses(id) ON DELETE CASCADE,
            status VARCHAR(16) NOT NULL DEFAULT 'success',
            data JSONB DEFAULT '[]',
            summary JSONB,
            generated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create comparison indexes
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_comparison_status ON analytics_comparison_analyses(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_comparison_type ON analytics_comparison_analyses(comparison_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_comparison_created_at ON analytics_comparison_analyses(created_at)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_comparison_results_comparison ON analytics_comparison_results(comparison_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_comparison_results_generated_at ON analytics_comparison_results(generated_at)")
        .execute(pool)
        .await?;

    // Create datasets table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_datasets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            datasource_id UUID NOT NULL REFERENCES analytics_datasources(id) ON DELETE CASCADE,
            sql_query TEXT NOT NULL,
            fields JSONB DEFAULT '[]',
            filters JSONB,
            config JSONB,
            status VARCHAR(16) NOT NULL DEFAULT 'draft',
            is_public BOOLEAN DEFAULT FALSE,
            published_at TIMESTAMP,
            last_refreshed_at TIMESTAMP,
            owner_id VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_datasets_owner ON analytics_datasets(owner_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_datasets_datasource ON analytics_datasets(datasource_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_datasets_status ON analytics_datasets(status)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_datasets_is_public ON analytics_datasets(is_public)",
    )
    .execute(pool)
    .await?;

    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[analytics] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}
