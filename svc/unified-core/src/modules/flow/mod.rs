//! Flow module - Workflow Automation

pub mod approval;
pub mod history;
pub mod instance;
pub mod performance;
pub mod plugin;
pub mod record;
pub mod setting;
pub mod statistics;
pub mod template;
pub mod version;
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
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            published_at TIMESTAMP
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
        CREATE TABLE IF NOT EXISTS core_workflow_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instance_id UUID NOT NULL REFERENCES core_workflow_instances(id),
            node_id VARCHAR(64) NOT NULL,
            assignee_id UUID NOT NULL,
            status VARCHAR(32) DEFAULT 'pending',
            comment TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP
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

    Ok(())
}
