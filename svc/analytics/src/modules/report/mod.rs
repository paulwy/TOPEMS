//! Report module

pub mod report;
pub mod report_plugin;
pub mod schedule;
pub mod scheduler;
pub mod subscription;
pub mod template;

pub use scheduler::ReportScheduler;

use axum::Router;
use sqlx::PgPool;

/// Create report API routes
pub fn create_routes() -> Router<crate::shared::AppState> {
    Router::new()
        .merge(report::create_routes())
        .merge(template::create_routes())
        .merge(schedule::create_routes())
        .merge(subscription::create_routes())
}

/// Initialize Report database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS report_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(256) NOT NULL,
            code VARCHAR(128) UNIQUE NOT NULL,
            description TEXT,
            category VARCHAR(64),
            report_type VARCHAR(128) NOT NULL,
            data_source JSONB,
            layout_config JSONB,
            filter_config JSONB,
            style_config JSONB,
            columns JSONB,
            output_format VARCHAR(32) DEFAULT 'pdf',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 兼容旧表：确保 code 列存在
    sqlx::query("ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS code VARCHAR(128) UNIQUE")
        .execute(pool)
        .await?;

    // bi 基线表是精简 stub，代码引用的业务列需幂等补齐（非破坏性）
    sqlx::query("ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS category VARCHAR(64)")
        .execute(pool)
        .await?;
    sqlx::query(
        "ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS report_type VARCHAR(128) NOT NULL DEFAULT 'general'",
    )
    .execute(pool)
    .await?;
    sqlx::query("ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS data_source JSONB")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS layout_config JSONB")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS filter_config JSONB")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS style_config JSONB")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS columns JSONB")
        .execute(pool)
        .await?;
    sqlx::query(
        "ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS output_format VARCHAR(32) DEFAULT 'pdf'",
    )
    .execute(pool)
    .await?;
    // bi 基线表 template_type/template_content 为 NOT NULL 无默认，业务 INSERT 不提供，补默认值避免约束冲突
    sqlx::query("ALTER TABLE report_templates ALTER COLUMN template_type SET DEFAULT 'custom'")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_templates ALTER COLUMN template_content SET DEFAULT '{}'::jsonb")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS report_schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(256) NOT NULL,
            template_id UUID NOT NULL REFERENCES report_templates(id),
            schedule_type VARCHAR(32) NOT NULL,
            schedule_expression VARCHAR(128) NOT NULL,
            parameters JSONB,
            recipients JSONB,
            status VARCHAR(32) DEFAULT 'active',
            last_run_at TIMESTAMP,
            next_run_at TIMESTAMP,
            run_count INTEGER DEFAULT 0,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 兼容旧表：确保缺失列存在
    sqlx::query("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS name VARCHAR(256) NOT NULL DEFAULT ''")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(32) NOT NULL DEFAULT 'cron'")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS schedule_expression VARCHAR(128) NOT NULL DEFAULT ''")
        .execute(pool)
        .await?;
    sqlx::query(
        "ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active'",
    )
    .execute(pool)
    .await?;
    // bi 基线表缺代码引用的列，幂等补齐
    sqlx::query("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS template_id UUID")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS parameters JSONB")
        .execute(pool)
        .await?;
    sqlx::query("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS recipients JSONB")
        .execute(pool)
        .await?;
    sqlx::query(
        "ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0",
    )
    .execute(pool)
    .await?;
    sqlx::query("ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS error_message TEXT")
        .execute(pool)
        .await?;
    // bi 基线表 report_id 为 NOT NULL 无默认，业务 INSERT 不提供该列，放开为可空（表当前无数据，安全）
    sqlx::query("ALTER TABLE report_schedules ALTER COLUMN report_id DROP NOT NULL")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS report_execution_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            schedule_id UUID NOT NULL REFERENCES report_schedules(id),
            schedule_name VARCHAR(256) NOT NULL,
            status VARCHAR(32) NOT NULL,
            output_path TEXT,
            error_message TEXT,
            started_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS report_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            template_id UUID NOT NULL REFERENCES report_templates(id),
            user_id VARCHAR(64) NOT NULL,
            email TEXT,
            frequency VARCHAR(32) NOT NULL,
            enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(256) NOT NULL,
            description TEXT,
            report_type VARCHAR(64) NOT NULL,
            config JSONB,
            output_format VARCHAR(32) DEFAULT 'pdf',
            template_id UUID REFERENCES report_templates(id),
            created_by VARCHAR(64) NOT NULL,
            status VARCHAR(32) DEFAULT 'draft',
            last_run_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // bi 基线 reports 表缺 output_format / last_run_at，幂等补齐
    sqlx::query(
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS output_format VARCHAR(32) DEFAULT 'pdf'",
    )
    .execute(pool)
    .await?;
    sqlx::query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_report_templates_code ON report_templates(code)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_report_schedules_template ON report_schedules(template_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_report_subscriptions_user ON report_subscriptions(user_id)",
    )
    .execute(pool)
    .await?;

    if let Err(e) = crate::models::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[analytics] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}
