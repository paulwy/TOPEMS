use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            version VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_materials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            material_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            spec VARCHAR(256),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_products_product_no ON pdm_products(product_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_materials_material_no ON pdm_materials(material_no)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_change_notices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ecn_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            change_type VARCHAR(32) NOT NULL,
            affected_items JSONB,
            reason TEXT,
            priority VARCHAR(32) DEFAULT 'normal',
            status VARCHAR(32) DEFAULT 'draft',
            initiator VARCHAR(128) NOT NULL,
            approver VARCHAR(128),
            approved_at TIMESTAMP,
            effective_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_ecn_no ON pdm_change_notices(ecn_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_status ON pdm_change_notices(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_priority ON pdm_change_notices(priority)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_workflows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(256) NOT NULL,
            description TEXT,
            workflow_type VARCHAR(64) NOT NULL,
            steps JSONB NOT NULL,
            conditions JSONB DEFAULT '{}',
            status VARCHAR(32) DEFAULT 'active',
            created_by VARCHAR(128) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_workflow_instances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workflow_id UUID NOT NULL REFERENCES pdm_workflows(id),
            workflow_name VARCHAR(256) NOT NULL,
            target_type VARCHAR(64) NOT NULL,
            target_id UUID NOT NULL,
            current_step VARCHAR(64) NOT NULL,
            status VARCHAR(32) DEFAULT 'running',
            assignees JSONB DEFAULT '[]',
            history JSONB DEFAULT '[]',
            created_by VARCHAR(128) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_workflows_type ON pdm_workflows(workflow_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_target ON pdm_workflow_instances(target_type, target_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_status ON pdm_workflow_instances(status)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            document_type VARCHAR(64),
            file_path VARCHAR(500),
            file_size BIGINT,
            version VARCHAR(32) DEFAULT '1.0',
            status VARCHAR(32) DEFAULT 'active',
            created_by VARCHAR(128),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_documents_document_no ON pdm_documents(document_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_documents_status ON pdm_documents(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_documents_name ON pdm_documents(name)")
        .execute(pool)
        .await?;

    Ok(())
}
