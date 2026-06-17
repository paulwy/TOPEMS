//! LIMS module - Laboratory Information Management System

pub mod sample;
pub mod inspection_task;
pub mod inspection_record;
pub mod instrument;
pub mod reagent;
pub mod statistics;

use sqlx::PgPool;

/// Initialize LIMS database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create lab_samples table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_samples (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_no VARCHAR(64) NOT NULL UNIQUE,
            sample_name VARCHAR(256) NOT NULL,
            sample_type VARCHAR(64),
            source VARCHAR(64),
            quantity DECIMAL(12,2),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'received',
            received_at TIMESTAMP DEFAULT NOW(),
            expired_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create lab_inspection_tasks table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_no VARCHAR(64) NOT NULL UNIQUE,
            sample_id UUID NOT NULL,
            test_item VARCHAR(128) NOT NULL,
            method VARCHAR(64),
            status VARCHAR(32) DEFAULT 'pending',
            assigned_to VARCHAR(64),
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            result JSONB,
            conclusion VARCHAR(32),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create lab_instruments table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_instruments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instrument_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            model VARCHAR(128),
            manufacturer VARCHAR(128),
            status VARCHAR(32) DEFAULT 'normal',
            location VARCHAR(128),
            last_calibration_at TIMESTAMP,
            next_calibration_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create lab_reagents table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_reagents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reagent_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            specification VARCHAR(128),
            manufacturer VARCHAR(128),
            batch_no VARCHAR(64),
            quantity DECIMAL(12,2),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'normal',
            expired_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_no ON qa_lab_samples(sample_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_no ON qa_lab_tasks(task_no)")
        .execute(pool)
        .await?;

    Ok(())
}
