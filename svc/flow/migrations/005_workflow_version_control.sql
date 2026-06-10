-- Workflow Version Control Tables
-- 用于管理工作流版本的变更历史

-- 工作流版本历史表
CREATE TABLE IF NOT EXISTS flow.workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES flow.workflows(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    definition JSONB NOT NULL,
    change_description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(workflow_id, version)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON flow.workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_version ON flow.workflow_versions(workflow_id, version);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_created_at ON flow.workflow_versions(created_at DESC);

-- 回滚记录表
CREATE TABLE IF NOT EXISTS flow.workflow_rollbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES flow.workflows(id) ON DELETE CASCADE,
    from_version VARCHAR(50) NOT NULL,
    to_version VARCHAR(50) NOT NULL,
    reason TEXT,
    rolled_back_by VARCHAR(255),
    rolled_back_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_workflow_rollbacks_workflow_id ON flow.workflow_rollbacks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rollbacks_at ON flow.workflow_rollbacks(rolled_back_at DESC);

-- 实例快照表（用于回滚）
CREATE TABLE IF NOT EXISTS flow.workflow_instance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    node_state JSONB,
    approval_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_instance_snapshots_instance_id ON flow.workflow_instance_snapshots(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_snapshots_created_at ON flow.workflow_instance_snapshots(created_at DESC);

-- 审批撤回记录表（用于撤销）
CREATE TABLE IF NOT EXISTS flow.approval_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES flow.approvals(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reason TEXT,
    withdrawn_by VARCHAR(255),
    withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_approval_withdrawals_approval_id ON flow.approval_withdrawals(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_withdrawals_at ON flow.approval_withdrawals(withdrawn_at DESC);

-- 审计日志表
CREATE TABLE IF NOT EXISTS flow.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    actor_id UUID,
    actor_name VARCHAR(255),
    previous_state JSONB,
    new_state JSONB,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON flow.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON flow.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON flow.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON flow.audit_logs(created_at DESC);
