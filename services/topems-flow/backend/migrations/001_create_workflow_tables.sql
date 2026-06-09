-- Create the flow schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS flow;

-- Workflows table
CREATE TABLE IF NOT EXISTS flow.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow instances table
CREATE TABLE IF NOT EXISTS flow.workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES flow.workflows(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_node VARCHAR(255),
    initiator_id UUID,
    data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approvals table
CREATE TABLE IF NOT EXISTS flow.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES flow.workflow_instances(id),
    node_id VARCHAR(255),
    task_name VARCHAR(255) NOT NULL,
    assignee_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approval_type VARCHAR(50),
    comment TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    timeout_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval records table
CREATE TABLE IF NOT EXISTS flow.approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID REFERENCES flow.approvals(id) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255),
    comment TEXT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON flow.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON flow.workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON flow.workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_initiator_id ON flow.workflow_instances(initiator_id);
CREATE INDEX IF NOT EXISTS idx_approvals_instance_id ON flow.approvals(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_approvals_assignee_id ON flow.approvals(assignee_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON flow.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approval_records_approval_id ON flow.approval_records(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_actor_id ON flow.approval_records(actor_id);
