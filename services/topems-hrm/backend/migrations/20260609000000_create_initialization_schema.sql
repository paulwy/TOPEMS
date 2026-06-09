-- TOPEMS HRM 初始化向导迁移脚本
-- 添加初始化状态表，用于管理系统初始化流程

-- ============================================
-- 14. 初始化状态表 (initialization_status)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.initialization_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, step_name)
);

CREATE INDEX IF NOT EXISTS idx_init_status_org ON hrm.initialization_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_init_status_order ON hrm.initialization_status(step_order);

COMMENT ON TABLE hrm.initialization_status IS '系统初始化状态表';
COMMENT ON COLUMN hrm.initialization_status.step_name IS '步骤名称：company_info, departments, positions, admin_user, completion';
COMMENT ON COLUMN hrm.initialization_status.status IS '状态：pending, in_progress, completed, failed';

-- ============================================
-- 15. 初始化向导日志表 (initialization_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.initialization_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_init_logs_org ON hrm.initialization_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_init_logs_step ON hrm.initialization_logs(step_name);
CREATE INDEX IF NOT EXISTS idx_init_logs_created ON hrm.initialization_logs(created_at DESC);

COMMENT ON TABLE hrm.initialization_logs IS '初始化向导操作日志表';

-- ============================================
-- 定义初始化步骤
-- ============================================
DO $$
DECLARE
    v_org_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 插入初始化步骤定义
    INSERT INTO hrm.initialization_status (id, organization_id, step_name, step_order, status)
    VALUES
        (uuid_generate_v4(), v_org_id, 'company_info', 1, 'pending'),
        (uuid_generate_v4(), v_org_id, 'departments', 2, 'pending'),
        (uuid_generate_v4(), v_org_id, 'positions', 3, 'pending'),
        (uuid_generate_v4(), v_org_id, 'admin_user', 4, 'pending'),
        (uuid_generate_v4(), v_org_id, 'completion', 5, 'pending')
    ON CONFLICT (organization_id, step_name) DO NOTHING;
END $$;
