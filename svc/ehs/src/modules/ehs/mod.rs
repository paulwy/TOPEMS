//! EHS module - Environment Health Safety

pub mod risk;
pub mod safety;
pub mod accident;
pub mod environment;
pub mod training;
pub mod health;
pub mod ehs_plugin;
pub mod hazard;
pub mod data_sync;

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

    // Create ehs_inspection_plans table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            inspection_type VARCHAR(64),
            frequency VARCHAR(32),
            start_date DATE,
            end_date DATE,
            inspector VARCHAR(64),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_inspection_items table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID REFERENCES qa_ehs_inspection_plans(id),
            item_no VARCHAR(64) NOT NULL,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            category VARCHAR(64),
            standard TEXT,
            order_num INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_inspection_records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            plan_id UUID REFERENCES qa_ehs_inspection_plans(id),
            title VARCHAR(256) NOT NULL,
            inspection_type VARCHAR(64),
            location VARCHAR(128),
            inspector VARCHAR(64),
            inspected_at TIMESTAMP,
            result VARCHAR(32),
            issues JSONB,
            attachments JSONB,
            status VARCHAR(32) DEFAULT 'in_progress',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_inspection_record_items table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_record_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_id UUID REFERENCES qa_ehs_inspection_records(id),
            item_id UUID REFERENCES qa_ehs_inspection_items(id),
            item_title VARCHAR(256) NOT NULL,
            item_category VARCHAR(64),
            result VARCHAR(32),
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_hazards table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            hazard_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            category VARCHAR(64),
            level VARCHAR(32),
            source VARCHAR(64),
            location VARCHAR(128),
            reported_by VARCHAR(64),
            reported_at TIMESTAMP,
            status VARCHAR(32) DEFAULT 'reported',
            inspection_id UUID REFERENCES qa_ehs_inspection_records(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_hazard_rectifications table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazard_rectifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            hazard_id UUID REFERENCES qa_ehs_hazards(id),
            description TEXT,
            responsible VARCHAR(64),
            deadline DATE,
            status VARCHAR(32) DEFAULT 'in_progress',
            progress INTEGER DEFAULT 0,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_hazard_verifications table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazard_verifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            hazard_id UUID REFERENCES qa_ehs_hazards(id),
            verifier VARCHAR(64),
            result VARCHAR(32),
            remarks TEXT,
            verified_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
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

    // Create ehs_accident_investigations table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accident_investigations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_id UUID REFERENCES qa_ehs_accidents(id),
            team JSONB,
            findings TEXT,
            root_cause TEXT,
            timeline JSONB,
            status VARCHAR(32) DEFAULT 'in_progress',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_accident_treatments table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accident_treatments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_id UUID REFERENCES qa_ehs_accidents(id),
            actions JSONB,
            responsible VARCHAR(64),
            status VARCHAR(32) DEFAULT 'in_progress',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create ehs_accident_reviews table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accident_reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_id UUID REFERENCES qa_ehs_accidents(id),
            summary TEXT,
            lessons_learned JSONB,
            recommendations JSONB,
            reviewer VARCHAR(64),
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
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
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_plans_no ON qa_ehs_inspection_plans(plan_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_records_no ON qa_ehs_inspection_records(record_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_no ON qa_ehs_hazards(hazard_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_status ON qa_ehs_hazards(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_status ON qa_ehs_accidents(status)")
        .execute(pool)
        .await?;

    // Create data sync records table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_sync_records (
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_no ON qa_ehs_sync_records(sync_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_type ON qa_ehs_sync_records(sync_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_status ON qa_ehs_sync_records(status)")
        .execute(pool)
        .await?;

    Ok(())
}