-- 扩展付款审批配置表，支持多级审批和金额阈值配置
ALTER TABLE core_finance_payment_approval_config
ADD COLUMN approval_levels INT DEFAULT 1;

ALTER TABLE core_finance_payment_approval_config
ADD COLUMN node_config JSONB;

ALTER TABLE core_finance_payment_approval_config
ADD COLUMN max_amount NUMERIC(18,4);

ALTER TABLE core_finance_payment_approval_config
ADD COLUMN priority INT DEFAULT 0;

-- 创建多级审批节点配置表
CREATE TABLE IF NOT EXISTS core_finance_approval_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    config_id UUID NOT NULL REFERENCES core_finance_payment_approval_config(id) ON DELETE CASCADE,
    node_level INT NOT NULL,
    node_name VARCHAR(100) NOT NULL,
    approver_type VARCHAR(20) NOT NULL DEFAULT 'role',
    approver_role VARCHAR(100),
    approver_users TEXT[],
    approval_type VARCHAR(20) DEFAULT 'single',
    timeout_hours INT DEFAULT 48,
    notify_users TEXT[],
    conditions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_nodes_config_id ON core_finance_approval_nodes(config_id);
CREATE INDEX IF NOT EXISTS idx_approval_nodes_tenant ON core_finance_approval_nodes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_nodes_level ON core_finance_approval_nodes(config_id, node_level);

-- 更新索引以支持金额范围查询
DROP INDEX IF EXISTS idx_payment_approval_config_active;
CREATE INDEX IF NOT EXISTS idx_payment_approval_config_range ON core_finance_payment_approval_config(tenant_id, is_active, amount_threshold);

-- 插入示例审批配置数据
INSERT INTO core_finance_payment_approval_config (id, tenant_id, name, description, amount_threshold, max_amount, approval_levels, priority, is_active, created_by)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '小额付款审批流程', '10000元以下付款，只需部门经理审批', 0, 10000, 1, 1, true, 'system'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '中额付款审批流程', '10000-50000元付款，需要部门经理+财务主管审批', 10000, 50000, 2, 2, true, 'system'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '大额付款审批流程', '50000-100000元付款，需要部门经理+财务主管+财务总监审批', 50000, 100000, 3, 3, true, 'system'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '特大额付款审批流程', '100000元以上付款，需要部门经理+财务主管+财务总监+总经理审批', 100000, NULL, 4, 4, true, 'system')
ON CONFLICT (id) DO NOTHING;

-- 插入示例审批节点数据
INSERT INTO core_finance_approval_nodes (id, tenant_id, config_id, node_level, node_name, approver_type, approver_role, approval_type, timeout_hours)
VALUES 
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, '部门经理审批', 'role', 'department_manager', 'single', 24),
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 1, '部门经理审批', 'role', 'department_manager', 'single', 24),
    ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 2, '财务主管审批', 'role', 'finance_manager', 'single', 48),
    ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 1, '部门经理审批', 'role', 'department_manager', 'single', 24),
    ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 2, '财务主管审批', 'role', 'finance_manager', 'single', 48),
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 3, '财务总监审批', 'role', 'finance_director', 'single', 72),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 1, '部门经理审批', 'role', 'department_manager', 'single', 24),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 2, '财务主管审批', 'role', 'finance_manager', 'single', 48),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 3, '财务总监审批', 'role', 'finance_director', 'single', 72),
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 4, '总经理审批', 'role', 'general_manager', 'single', 96)
ON CONFLICT (id) DO NOTHING;
