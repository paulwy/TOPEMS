-- 删除之前的审批配置表
DROP TABLE IF EXISTS core_finance_payment_approval_config;
DROP TABLE IF EXISTS core_finance_payment_workflow;

-- 付款审批配置表（简化为金额阈值到工作流的映射）
CREATE TABLE IF NOT EXISTS core_finance_payment_approval_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount_threshold NUMERIC(18,4) NOT NULL DEFAULT 0,
    workflow_id UUID REFERENCES core_workflows(id),
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_approval_config_tenant ON core_finance_payment_approval_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_config_active ON core_finance_payment_approval_config(tenant_id, is_active);

-- 付款单工作流关联表（桥接付款单与工作流实例）
CREATE TABLE IF NOT EXISTS core_finance_payment_workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    payment_id UUID NOT NULL REFERENCES core_finance_payments(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES core_workflows(id),
    workflow_instance_id UUID REFERENCES core_workflow_instances(id),
    current_approver VARCHAR(100),
    current_level INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending',
    approval_history JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_workflow_payment_id ON core_finance_payment_workflow(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_workflow_instance_id ON core_finance_payment_workflow(workflow_instance_id);
