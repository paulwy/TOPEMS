CREATE TABLE IF NOT EXISTS core_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_by UUID NOT NULL,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    published_at timestamptz
);

CREATE TABLE IF NOT EXISTS core_workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES core_workflows(id),
    title VARCHAR(256) NOT NULL,
    initiator_id UUID NOT NULL,
    current_node_id VARCHAR(64),
    status VARCHAR(32) DEFAULT 'pending',
    variables JSONB,
    tenant_id UUID NOT NULL,
    started_at timestamptz DEFAULT NOW(),
    completed_at timestamptz,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES core_workflow_instances(id),
    node_id VARCHAR(64) NOT NULL,
    assignee_id UUID NOT NULL,
    status VARCHAR(32) DEFAULT 'pending',
    comment TEXT,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_core_workflows_status ON core_workflows(status);
CREATE INDEX IF NOT EXISTS idx_core_workflows_tenant ON core_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_instances_workflow ON core_workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_core_instances_tenant ON core_workflow_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_tasks_instance ON core_workflow_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_core_tasks_tenant ON core_workflow_tasks(tenant_id);