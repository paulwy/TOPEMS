//! Report module

pub mod report;
pub mod report_plugin;
pub mod schedule;
pub mod template;

use sqlx::PgPool;

/// Initialize Report database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create reports table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(256) NOT NULL,
            description TEXT,
            report_type VARCHAR(64) NOT NULL,
            config JSONB,
            datasource_id UUID,
            template_id UUID,
            created_by VARCHAR(64) NOT NULL,
            status VARCHAR(32) DEFAULT 'draft',
            last_run_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create report_templates table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_report_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            template_type VARCHAR(64) NOT NULL,
            template_content TEXT,
            config JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create report_schedules table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_report_schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID NOT NULL,
            cron_expression VARCHAR(64) NOT NULL,
            recipients TEXT[],
            enabled BOOLEAN DEFAULT TRUE,
            last_run_at TIMESTAMP,
            next_run_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_reports_status ON analytics_reports(status)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_schedules_report ON analytics_report_schedules(report_id)",
    )
    .execute(pool)
    .await?;

    Ok(())
}
