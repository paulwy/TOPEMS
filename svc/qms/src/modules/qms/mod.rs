//! QMS module - Quality Management System

pub mod quality_inspection;
pub mod quality_issue;
pub mod quality_standard;
pub mod dashboard;
pub mod qms_plugin;
pub mod corrective_action;
pub mod audit;
pub mod data_sync;

use sqlx::PgPool;

/// Initialize QMS database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Create quality_inspections table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_quality_inspections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            inspection_no VARCHAR(64) NOT NULL UNIQUE,
            inspection_type VARCHAR(32) NOT NULL,
            product_id UUID,
            product_name VARCHAR(256),
            standard_id UUID,
            quantity DECIMAL(12,2) NOT NULL,
            qualified_quantity DECIMAL(12,2),
            unqualified_quantity DECIMAL(12,2),
            qualification_rate DECIMAL(5,2),
            status VARCHAR(32) DEFAULT 'pending',
            inspector VARCHAR(64),
            assignee VARCHAR(64),
            inspected_at TIMESTAMP,
            result VARCHAR(32),
            memo TEXT,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create quality_inspection_results table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_inspection_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            inspection_id UUID NOT NULL REFERENCES qa_quality_inspections(id) ON DELETE CASCADE,
            item_name VARCHAR(256) NOT NULL,
            standard_value VARCHAR(256),
            measured_value VARCHAR(256),
            is_qualified BOOLEAN NOT NULL,
            remark TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create quality_inspection_audits table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_inspection_audits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            inspection_id UUID NOT NULL REFERENCES qa_quality_inspections(id) ON DELETE CASCADE,
            status_from VARCHAR(32) NOT NULL,
            status_to VARCHAR(32) NOT NULL,
            action VARCHAR(64) NOT NULL,
            operator VARCHAR(64) NOT NULL,
            comment TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create quality_issues table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_quality_issues (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issue_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            severity VARCHAR(32),
            status VARCHAR(32) DEFAULT 'open',
            source VARCHAR(32),
            related_inspection_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create quality_standards table (shared across QMS/LIMS/EHS)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_standards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            category VARCHAR(64) NOT NULL,
            level VARCHAR(32),
            specification TEXT,
            description TEXT,
            version VARCHAR(16) DEFAULT '1.0',
            status VARCHAR(32) DEFAULT 'active',
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create quality_standard_revisions table for version management
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_standard_revisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            standard_id UUID NOT NULL REFERENCES qa_standards(id) ON DELETE CASCADE,
            version VARCHAR(16) NOT NULL,
            name VARCHAR(256) NOT NULL,
            category VARCHAR(64) NOT NULL,
            level VARCHAR(32),
            specification TEXT,
            description TEXT,
            status VARCHAR(32),
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_inspections_no ON qa_quality_inspections(inspection_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_inspections_status ON qa_quality_inspections(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_inspections_inspector ON qa_quality_inspections(inspector)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_inspection_results_inspection ON qa_inspection_results(inspection_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_inspection_audits_inspection ON qa_inspection_audits(inspection_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_issues_no ON qa_quality_issues(issue_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_standards_code ON qa_standards(code)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_standard_revisions_standard ON qa_standard_revisions(standard_id)")
        .execute(pool)
        .await?;

    // Create data sync records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_qms_sync_records (
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_qms_sync_no ON qa_qms_sync_records(sync_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_qms_sync_type ON qa_qms_sync_records(sync_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_qms_sync_status ON qa_qms_sync_records(status)")
        .execute(pool)
        .await?;

    Ok(())
}
