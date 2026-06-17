//! QMS module - Quality Management System

pub mod quality_inspection;
pub mod quality_issue;
pub mod quality_standard;
pub mod dashboard;

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
            quantity DECIMAL(12,2) NOT NULL,
            qualified_quantity DECIMAL(12,2),
            status VARCHAR(32) DEFAULT 'pending',
            inspector VARCHAR(64),
            inspected_at TIMESTAMP,
            result VARCHAR(32),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
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
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_inspections_no ON qa_quality_inspections(inspection_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_issues_no ON qa_quality_issues(issue_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_standards_code ON qa_standards(code)")
        .execute(pool)
        .await?;

    Ok(())
}
