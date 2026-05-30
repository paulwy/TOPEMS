-- Migrate flow tables for topems-flow backend
-- Run this against your existing topems database

-- 0. Create flow schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS flow;

-- 1. Create workflows table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS flow.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create workflow_instances table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS flow.workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES flow.workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_node VARCHAR(255),
    initiator_id UUID,
    data JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create approvals table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS flow.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
    node_id VARCHAR(255),
    task_name VARCHAR(255) NOT NULL,
    assignee_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approval_type VARCHAR(50),
    comment TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create approval_records table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS flow.approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID REFERENCES flow.approvals(id) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255),
    comment TEXT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create notifications table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS flow.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    workflow_instance_id UUID REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES flow.approvals(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON flow.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON flow.workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON flow.workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_initiator_id ON flow.workflow_instances(initiator_id);
CREATE INDEX IF NOT EXISTS idx_approvals_instance_id ON flow.approvals(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_approvals_assignee_id ON flow.approvals(assignee_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON flow.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approval_records_approval_id ON flow.approval_records(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_actor_id ON flow.approval_records(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON flow.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON flow.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON flow.notifications(created_at);
