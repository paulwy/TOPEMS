use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    init_qms_database(pool).await?;
    init_lims_database(pool).await?;
    init_ehs_database(pool).await?;
    Ok(())
}

pub async fn init_qms_database(pool: &PgPool) -> Result<(), sqlx::Error> {
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

pub async fn init_lims_database(pool: &PgPool) -> Result<(), sqlx::Error> {
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_no ON qa_lab_samples(sample_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_no ON qa_lab_tasks(task_no)")
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn init_ehs_database(pool: &PgPool) -> Result<(), sqlx::Error> {
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_risks_no ON qa_ehs_risks(risk_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_no ON qa_ehs_accidents(accident_no)")
        .execute(pool)
        .await?;

    Ok(())
}
