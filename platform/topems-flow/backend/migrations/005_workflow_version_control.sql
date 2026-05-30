-- Workflow Version Control Tables
-- 用于管理工作流版本的变更历史

-- 工作流版本历史表
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    definition JSONB NOT NULL,
    change_description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(workflow_id, version)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_version ON workflow_versions(workflow_id, version);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_created_at ON workflow_versions(created_at DESC);

-- 回滚记录表
CREATE TABLE IF NOT EXISTS workflow_rollbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    from_version VARCHAR(50) NOT NULL,
    to_version VARCHAR(50) NOT NULL,
    reason TEXT,
    rolled_back_by VARCHAR(255),
    rolled_back_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_workflow_rollbacks_workflow_id ON workflow_rollbacks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rollbacks_at ON workflow_rollbacks(rolled_back_at DESC);

-- 实例快照表（用于回滚）
CREATE TABLE IF NOT EXISTS workflow_instance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    node_state JSONB,
    approval_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_instance_snapshots_instance_id ON workflow_instance_snapshots(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_snapshots_created_at ON workflow_instance_snapshots(created_at DESC);

-- 审批撤回记录表（用于撤销）
CREATE TABLE IF NOT EXISTS approval_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reason TEXT,
    withdrawn_by VARCHAR(255),
    withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_approval_withdrawals_approval_id ON approval_withdrawals(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_withdrawals_at ON approval_withdrawals(withdrawn_at DESC);
