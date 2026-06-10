-- PM Schema Migration
-- 项目管理系统

-- Create schema
CREATE SCHEMA IF NOT EXISTS pm;

-- Set search path
SET search_path TO pm;

-- ==================== 项目管理表 ====================

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    project_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    leader VARCHAR(100),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    budget NUMERIC(15,2),
    progress INTEGER NOT NULL DEFAULT 0,
    project_config JSONB,
    benefit_target JSONB,
    risk_level VARCHAR(20),
    priority INTEGER,
    tags JSONB,
    parent_id UUID REFERENCES pm.projects(id),
    workspace_id UUID,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 项目阶段表
CREATE TABLE IF NOT EXISTS project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    progress INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 项目里程碑表
CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    phase_id UUID REFERENCES pm.project_phases(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    leave_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 项目资源表
CREATE TABLE IF NOT EXISTS project_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    resource_type VARCHAR(50) NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    quantity NUMERIC(10,2),
    unit VARCHAR(20),
    cost NUMERIC(15,2),
    status VARCHAR(20) NOT NULL DEFAULT 'allocated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 财务管理表 ====================

-- 项目费用表
CREATE TABLE IF NOT EXISTS project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    expense_type VARCHAR(50) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    expense_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approver VARCHAR(100),
    approved_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 项目收益表
CREATE TABLE IF NOT EXISTS project_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    benefit_type VARCHAR(50) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    benefit_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 预算表
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    budget_type VARCHAR(50) NOT NULL,
    planned_amount NUMERIC(15,2) NOT NULL,
    actual_amount NUMERIC(15,2) DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    period VARCHAR(20),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 风险管理表 ====================

-- 项目风险表
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    risk_type VARCHAR(50) NOT NULL,
    risk_name VARCHAR(200) NOT NULL,
    description TEXT,
    probability VARCHAR(20) NOT NULL,
    impact VARCHAR(20) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    mitigation_plan TEXT,
    contingency_plan TEXT,
    owner VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'identified',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 审批管理表 ====================

-- 项目审批表
CREATE TABLE IF NOT EXISTS project_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    approval_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    applicant VARCHAR(100) NOT NULL,
    approver VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 合同管理表 ====================

-- 项目合同表
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    contract_no VARCHAR(50) NOT NULL UNIQUE,
    contract_name VARCHAR(200) NOT NULL,
    contract_type VARCHAR(50) NOT NULL,
    party_a VARCHAR(200) NOT NULL,
    party_b VARCHAR(200) NOT NULL,
    amount NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    sign_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 质量管理表 ====================

-- 项目质量检查表
CREATE TABLE IF NOT EXISTS quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    check_type VARCHAR(50) NOT NULL,
    check_name VARCHAR(200) NOT NULL,
    check_date TIMESTAMPTZ NOT NULL,
    checker VARCHAR(100) NOT NULL,
    result VARCHAR(20) NOT NULL,
    issues TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 验收管理表 ====================

-- 项目验收表
CREATE TABLE IF NOT EXISTS acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    acceptance_no VARCHAR(50) NOT NULL UNIQUE,
    acceptance_type VARCHAR(50) NOT NULL,
    acceptance_date TIMESTAMPTZ NOT NULL,
    acceptor VARCHAR(100) NOT NULL,
    result VARCHAR(20) NOT NULL,
    comments TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 结算管理表 ====================

-- 项目结算表
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    settlement_no VARCHAR(50) NOT NULL UNIQUE,
    settlement_type VARCHAR(50) NOT NULL,
    settlement_date TIMESTAMPTZ NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    remarks TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 文档管理表 ====================

-- 项目文档表
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm.projects(id),
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    version VARCHAR(20),
    author VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 配置表 ====================

-- 项目类型配置表
CREATE TABLE IF NOT EXISTS project_type_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(50) NOT NULL UNIQUE,
    type_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    default_phases JSONB,
    default_milestones JSONB,
    default_workflow UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 通知表 ====================

-- 项目通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pm.projects(id),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    recipient VARCHAR(100) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_projects_code ON pm.projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON pm.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_leader ON pm.projects(leader);
CREATE INDEX IF NOT EXISTS idx_projects_parent ON pm.projects(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project ON pm.project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON pm.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON pm.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON pm.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_resources_project ON pm.project_resources(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON pm.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_benefits_project ON pm.project_benefits(project_id);
CREATE INDEX IF NOT EXISTS idx_budgets_project ON pm.budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_project ON pm.risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_approvals_project ON pm.project_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON pm.contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_no ON pm.contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_quality_checks_project ON pm.quality_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_acceptances_project ON pm.acceptances(project_id);
CREATE INDEX IF NOT EXISTS idx_settlements_project ON pm.settlements(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON pm.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project ON pm.notifications(project_id);

-- Reset search path
RESET search_path;