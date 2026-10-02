//! Flow module - Workflow Automation

pub mod approval;
pub mod category;
pub mod history;
pub mod instance;
pub mod models;
pub mod monitor;
pub mod openapi;
pub mod record;
pub mod setting;
pub mod statistics;
pub mod task;
pub mod template;
pub mod variable;
pub mod workflow;

use sqlx::PgPool;

/// Initialize Flow database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_workflows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
            definition JSONB NOT NULL,
            status VARCHAR(32) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            published_at TIMESTAMPTZ,
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_workflow_instances (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workflow_id UUID NOT NULL REFERENCES core_workflows(id),
            title VARCHAR(256) NOT NULL,
            initiator_id UUID NOT NULL,
            current_node_id VARCHAR(64),
            status VARCHAR(32) DEFAULT 'pending',
            variables JSONB,
            started_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_workflow_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workflow_id UUID NOT NULL REFERENCES core_workflows(id),
            version VARCHAR(64) NOT NULL,
            definition JSONB NOT NULL,
            change_description TEXT,
            created_by VARCHAR(128) DEFAULT 'system',
            isactive BOOLEAN DEFAULT TRUE,
            deleted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_workflow_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instance_id UUID NOT NULL REFERENCES core_workflow_instances(id),
            node_id VARCHAR(64) NOT NULL,
            assignee_id UUID NOT NULL,
            status VARCHAR(32) DEFAULT 'pending',
            comment TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            completed_at TIMESTAMPTZ,
            priority INTEGER DEFAULT 0,
            due_time TIMESTAMPTZ,
            claimed_at TIMESTAMPTZ,
            tenant_id UUID,
            deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_flow_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            code VARCHAR(64),
            parent_id UUID,
            sort_order INTEGER DEFAULT 0,
            status VARCHAR(32) DEFAULT 'active',
            description TEXT,
            tenant_id UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_flow_variables (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            scope VARCHAR(16) NOT NULL,
            instance_id UUID,
            task_id UUID,
            workflow_id UUID,
            var_key VARCHAR(128) NOT NULL,
            var_value JSONB NOT NULL DEFAULT 'null'::jsonb,
            value_type VARCHAR(32) DEFAULT 'string',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_flow_variable_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            variable_id UUID REFERENCES core_flow_variables(id),
            var_key VARCHAR(128) NOT NULL,
            var_value JSONB NOT NULL,
            value_type VARCHAR(32),
            changed_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_workflows_status ON core_workflows(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_instances_workflow ON core_workflow_instances(workflow_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_tasks_instance ON core_workflow_tasks(instance_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_core_flow_variables_scope_key
         ON core_flow_variables(scope, instance_id, task_id, workflow_id, var_key)
         WHERE deleted_at IS NULL",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_flow_variables_instance ON core_flow_variables(instance_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_flow_categories_parent ON core_flow_categories(parent_id)",
    )
    .execute(pool)
    .await?;

    Ok(())
}
