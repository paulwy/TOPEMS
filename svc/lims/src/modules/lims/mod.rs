//! LIMS module - Laboratory Information Management System

pub mod sample;
pub mod inspection_task;
pub mod inspection_record;
pub mod instrument;
pub mod reagent;
pub mod statistics;
pub mod lims_plugin;
pub mod data_sync;
pub mod report;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
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

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_no VARCHAR(64) NOT NULL UNIQUE,
            sample_id UUID NOT NULL REFERENCES qa_lab_samples(id) ON DELETE CASCADE,
            sample_no VARCHAR(64) NOT NULL,
            test_items JSONB NOT NULL,
            status VARCHAR(32) DEFAULT 'pending',
            assigned_to VARCHAR(64),
            instrument_id UUID,
            planned_date TIMESTAMP,
            actual_start_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            result JSONB,
            conclusion VARCHAR(500),
            recorded_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            task_id UUID NOT NULL REFERENCES qa_lab_tasks(id) ON DELETE CASCADE,
            test_data JSONB NOT NULL,
            conclusion VARCHAR(256) NOT NULL,
            recorded_by VARCHAR(64) NOT NULL,
            recorded_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

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

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_processes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            process_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            steps JSONB,
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Sample Lifecycle table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_sample_lifecycle (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES qa_lab_samples(id) ON DELETE CASCADE,
            sample_no VARCHAR(64) NOT NULL,
            lifecycle_stage VARCHAR(32) NOT NULL,
            stage_description TEXT,
            operator VARCHAR(64),
            notes TEXT,
            location VARCHAR(128),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Calibration Records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_calibration_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instrument_id UUID NOT NULL REFERENCES qa_lab_instruments(id) ON DELETE CASCADE,
            instrument_no VARCHAR(64) NOT NULL,
            instrument_name VARCHAR(256) NOT NULL,
            calibrated_by VARCHAR(64) NOT NULL,
            calibration_date TIMESTAMP NOT NULL,
            next_calibration_date TIMESTAMP,
            calibration_result VARCHAR(32) NOT NULL,
            parameters JSONB,
            notes TEXT,
            certificate_no VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Reagent Alerts table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_reagent_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reagent_id UUID NOT NULL REFERENCES qa_lab_reagents(id) ON DELETE CASCADE,
            reagent_no VARCHAR(64) NOT NULL,
            reagent_name VARCHAR(256) NOT NULL,
            alert_type VARCHAR(32) NOT NULL,
            current_value DECIMAL(12,2),
            threshold_value DECIMAL(12,2),
            unit VARCHAR(32),
            message TEXT NOT NULL,
            is_resolved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Reagent History table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_reagent_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reagent_id UUID NOT NULL REFERENCES qa_lab_reagents(id) ON DELETE CASCADE,
            adjustment_type VARCHAR(16) NOT NULL,
            quantity DECIMAL(12,2) NOT NULL,
            reason TEXT,
            operator VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Inspection Reports table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_inspection_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_no VARCHAR(64) NOT NULL UNIQUE,
            sample_id UUID NOT NULL REFERENCES qa_lab_samples(id) ON DELETE CASCADE,
            sample_no VARCHAR(64) NOT NULL,
            sample_name VARCHAR(256) NOT NULL,
            inspection_date TIMESTAMP,
            inspector VARCHAR(64),
            inspection_items JSONB,
            conclusion VARCHAR(32),
            remark TEXT,
            status VARCHAR(32) DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_no ON qa_lab_samples(sample_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_status ON qa_lab_samples(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_no ON qa_lab_tasks(task_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_status ON qa_lab_tasks(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_sample ON qa_lab_tasks(sample_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_records_no ON qa_lab_records(record_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_records_task ON qa_lab_records(task_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_no ON qa_lab_instruments(instrument_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_status ON qa_lab_instruments(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_no ON qa_lab_reagents(reagent_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_status ON qa_lab_reagents(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_processes_no ON qa_lab_processes(process_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_sample_lifecycle_sample ON qa_lab_sample_lifecycle(sample_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_calibration_records_instrument ON qa_lab_calibration_records(instrument_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_alerts_reagent ON qa_lab_reagent_alerts(reagent_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_history_reagent ON qa_lab_reagent_history(reagent_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_inspection_reports_no ON qa_lab_inspection_reports(report_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_inspection_reports_sample ON qa_lab_inspection_reports(sample_id)")
        .execute(pool)
        .await?;

    // Create data sync records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_sync_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sync_no VARCHAR(64) NOT NULL UNIQUE,
            sync_type VARCHAR(32) NOT NULL,
            source_id UUID,
            target_service VARCHAR(32) NOT NULL,
            target_id UUID,
            status VARCHAR(32) DEFAULT 'pending',
            payload JSONB,
            response JSONB,
            error_msg TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_no ON qa_lims_sync_records(sync_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_type ON qa_lims_sync_records(sync_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_status ON qa_lims_sync_records(status)")
        .execute(pool)
        .await?;

    Ok(())
}