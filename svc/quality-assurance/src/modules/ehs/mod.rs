//! EHS module - Environment Health Safety

pub mod risk;
pub mod safety;
pub mod accident;
pub mod environment;
pub mod training;
pub mod health;

use sqlx::PgPool;

/// Initialize EHS database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create ehs_risks table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_risks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            risk_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            risk_type VARCHAR(64),
            hazard_factor VARCHAR(128),
            likelihood INTEGER,
            severity INTEGER,
            risk_level VARCHAR(32),
            control_measures TEXT,
            status VARCHAR(32) DEFAULT 'identified',
            assessed_by VARCHAR(64),
            assessed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_accidents table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accidents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            accident_type VARCHAR(64),
            severity VARCHAR(32),
            location VARCHAR(128),
            occurred_at TIMESTAMP,
            casualties INTEGER,
            economic_loss DECIMAL(12,2),
            status VARCHAR(32) DEFAULT 'reported',
            reported_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_environment_records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_environment (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            monitor_type VARCHAR(64),
            monitor_point VARCHAR(128),
            data JSONB,
            status VARCHAR(32) DEFAULT 'normal',
            monitored_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_trainings table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_trainings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            training_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            content TEXT,
            trainer VARCHAR(64),
            training_type VARCHAR(64),
            duration_hours INTEGER,
            scheduled_at TIMESTAMP,
            status VARCHAR(32) DEFAULT 'scheduled',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_risks_no ON qa_ehs_risks(risk_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_no ON qa_ehs_accidents(accident_no)")
        .execute(pool)
        .await?;

    Ok(())
}
