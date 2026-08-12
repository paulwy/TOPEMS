pub mod audit_log;
pub mod schema_defense;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            product_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            version VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_materials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            material_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            spec VARCHAR(256),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_products_product_no ON pdm_products(product_no)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_products_tenant_id ON pdm_products(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_materials_material_no ON pdm_materials(material_no)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_materials_tenant_id ON pdm_materials(tenant_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_change_notices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_ecn_no ON pdm_change_notices(ecn_no)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_status ON pdm_change_notices(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_priority ON pdm_change_notices(priority)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_tenant_id ON pdm_change_notices(tenant_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_workflows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            workflow_type VARCHAR(64) NOT NULL,
            steps JSONB NOT NULL,
            conditions JSONB DEFAULT '{}',
            status VARCHAR(32) DEFAULT 'active',
            created_by VARCHAR(128) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_workflow_instances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
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

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_workflows_type ON pdm_workflows(workflow_type)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_workflows_tenant_id ON pdm_workflows(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_target ON pdm_workflow_instances(target_type, target_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_status ON pdm_workflow_instances(status)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_tenant_id ON pdm_workflow_instances(tenant_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
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
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_documents_document_no ON pdm_documents(document_no)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_documents_status ON pdm_documents(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_documents_name ON pdm_documents(name)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_documents_tenant_id ON pdm_documents(tenant_id)",
    )
    .execute(pool)
    .await?;

    // ==================== PDM Projects ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            project_no VARCHAR(64) NOT NULL,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            status VARCHAR(32) DEFAULT 'planning',
            phase VARCHAR(32) DEFAULT 'initiation',
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            manager_id VARCHAR(128),
            manager_name VARCHAR(128),
            budget DOUBLE PRECISION,
            progress INT DEFAULT 0,
            created_by VARCHAR(128),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP,
            CONSTRAINT uq_pdm_projects_tenant_no UNIQUE (tenant_id, project_no)
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_project_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            project_id UUID NOT NULL REFERENCES pdm_projects(id) ON DELETE CASCADE,
            user_id VARCHAR(128) NOT NULL,
            user_name VARCHAR(128),
            user_email VARCHAR(256),
            role VARCHAR(32) NOT NULL,
            joined_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_pdm_project_members_user UNIQUE (tenant_id, project_id, user_id)
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_project_phases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            project_id UUID NOT NULL REFERENCES pdm_projects(id) ON DELETE CASCADE,
            phase VARCHAR(64) NOT NULL,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            status VARCHAR(32) DEFAULT 'pending',
            deliverables TEXT[] DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_projects_tenant_id ON pdm_projects(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_projects_status ON pdm_projects(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_projects_phase ON pdm_projects(phase)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_project_members_project ON pdm_project_members(project_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_project_phases_project ON pdm_project_phases(project_id)",
    )
    .execute(pool)
    .await?;

    // ==================== Versions ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            version_no VARCHAR(64) NOT NULL,
            target_type VARCHAR(64) NOT NULL,
            target_id UUID NOT NULL,
            target_name VARCHAR(256),
            version_label VARCHAR(32) NOT NULL,
            description TEXT,
            status VARCHAR(32) DEFAULT 'draft',
            created_by VARCHAR(128),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_versions_target ON pdm_versions(target_type, target_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_versions_tenant_id ON pdm_versions(tenant_id)")
        .execute(pool)
        .await?;

    // ==================== Document Versions ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_document_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            document_id UUID NOT NULL REFERENCES pdm_documents(id) ON DELETE CASCADE,
            document_type VARCHAR(64),
            version_number VARCHAR(64) NOT NULL,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            status VARCHAR(32) DEFAULT 'draft',
            file_url VARCHAR(1000),
            filesize BIGINT,
            file_type VARCHAR(128),
            changes TEXT[] NOT NULL DEFAULT '{}',
            created_by VARCHAR(128) NOT NULL DEFAULT 'system',
            created_by_name VARCHAR(128),
            reviewed_by VARCHAR(128),
            approved_by VARCHAR(128),
            published_at TIMESTAMP,
            file_content BYTEA,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP,
            CONSTRAINT uq_pdm_document_versions_number UNIQUE (tenant_id, document_id, version_number)
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_document_versions_document ON pdm_document_versions(document_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_document_versions_tenant_id ON pdm_document_versions(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_document_versions_status ON pdm_document_versions(status)",
    )
    .execute(pool)
    .await?;

    // ==================== Configurations ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_configurations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            config_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            product_id UUID,
            config_items JSONB DEFAULT '[]',
            status VARCHAR(32) DEFAULT 'active',
            created_by VARCHAR(128),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_configurations_product ON pdm_configurations(product_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_configurations_tenant_id ON pdm_configurations(tenant_id)",
    )
    .execute(pool)
    .await?;

    // ==================== BOM ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_boms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            bom_no VARCHAR(64) NOT NULL UNIQUE,
            product_id UUID,
            product_name VARCHAR(256) NOT NULL,
            product_code VARCHAR(64),
            version VARCHAR(32) DEFAULT '1.0',
            status VARCHAR(32) DEFAULT 'draft',
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_bom_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            bom_id UUID NOT NULL REFERENCES pdm_boms(id) ON DELETE CASCADE,
            material_id UUID,
            material_code VARCHAR(64) NOT NULL,
            material_name VARCHAR(256) NOT NULL,
            specification VARCHAR(256),
            unit VARCHAR(32),
            quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
            loss_rate DECIMAL(8,4) DEFAULT 0,
            sequence INT DEFAULT 0,
            notes TEXT
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_boms_product ON pdm_boms(product_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_boms_tenant_id ON pdm_boms(tenant_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_pdm_bom_items_bom ON pdm_bom_items(bom_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_bom_items_tenant_id ON pdm_bom_items(tenant_id)",
    )
    .execute(pool)
    .await?;

    // ==================== Production Processes ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_production_processes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            process_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            process_type VARCHAR(64),
            standard_time DECIMAL(10,2),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_production_processes_tenant_id ON pdm_production_processes(tenant_id)",
    )
    .execute(pool)
    .await?;

    // ==================== Production Steps ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_production_steps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            process_id UUID NOT NULL REFERENCES pdm_production_processes(id) ON DELETE CASCADE,
            step_no INT NOT NULL,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            standard_time DECIMAL(10,2),
            equipment_requirement VARCHAR(256),
            quality_check VARCHAR(256),
            status VARCHAR(32) DEFAULT 'active',
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_production_steps_tenant_id ON pdm_production_steps(tenant_id)",
    )
    .execute(pool)
    .await?;

    // ==================== Production Formulas ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_production_formulas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            formula_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            product_id UUID,
            description TEXT,
            formula_items JSONB DEFAULT '[]',
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_production_formulas_tenant_id ON pdm_production_formulas(tenant_id)",
    )
    .execute(pool)
    .await?;

    // ==================== Production Batches ====================
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_production_batches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            batch_no VARCHAR(64) NOT NULL UNIQUE,
            product_id UUID,
            product_name VARCHAR(256),
            quantity DECIMAL(18,4),
            unit VARCHAR(32),
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            status VARCHAR(32) DEFAULT 'pending',
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_pdm_production_batches_tenant_id ON pdm_production_batches(tenant_id)",
    )
    .execute(pool)
    .await?;

    // Schema 防御：增量迁移 + 一致性自检
    if let Err(e) = topems_shared_db::schema::run_schema_defense(
        pool,
        self::schema_defense::SERVICE_SCHEMA,
        self::schema_defense::TABLE_DEFS,
        "pdm",
    )
    .await
    {
        tracing::warn!("[pdm schema 防御] 非阻塞警告: {}", e);
    }

    Ok(())
}
