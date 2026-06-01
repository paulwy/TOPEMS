-- 临时设置 rs schema 的 SQL 脚本
-- 创建 rs schema (如果不存在)
CREATE SCHEMA IF NOT EXISTS rs;

-- 授予权限
GRANT ALL ON SCHEMA rs TO topems;

-- 设置搜索路径
SET search_path TO rs, public;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 项目表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    project_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    leader VARCHAR(255) NOT NULL,
    team_members JSONB,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    budget NUMERIC(15, 2),
    progress INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 项目阶段表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.project_phases (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    planned_duration_days INTEGER,
    actual_duration_days INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    progress INTEGER NOT NULL DEFAULT 0,
    weight INTEGER NOT NULL DEFAULT 0,
    predecessor_id UUID REFERENCES rs.project_phases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 项目里程碑表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.project_milestones (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES rs.project_phases(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date TIMESTAMPTZ,
    actual_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 项目成员表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.project_members (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    responsibility TEXT,
    allocation NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    join_date TIMESTAMPTZ,
    leave_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    hourly_rate NUMERIC(10, 2),
    cost_rate NUMERIC(10, 2),
    budgeted_hours NUMERIC(10, 2),
    actual_hours NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 项目预算表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.project_budgets (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    budget_type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    planned_amount NUMERIC(15, 2) NOT NULL,
    actual_amount NUMERIC(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'CNY',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 项目合同表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.project_contracts (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) NOT NULL,
    contract_type VARCHAR(50) NOT NULL,
    party_a VARCHAR(255) NOT NULL,
    party_b VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    description TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 付款计划表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.payment_schedules (
    id UUID PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES rs.project_contracts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    actual_date TIMESTAMPTZ,
    actual_amount NUMERIC(15, 2),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 审计日志表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.audit_logs (
    id UUID PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_ids JSONB,
    user_id VARCHAR(100),
    user_name VARCHAR(100),
    request_details JSONB,
    response_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 配方表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.formulas (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    ingredients JSONB NOT NULL,
    instructions TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 实验表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.experiments (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    formula_id UUID REFERENCES rs.formulas(id) ON DELETE SET NULL,
    title VARCHAR(255),
    description TEXT,
    experiment_type VARCHAR(100) NOT NULL,
    objective TEXT,
    method TEXT,
    result TEXT NOT NULL,
    conclusions TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'planning',
    experimenter VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    experiment_date TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 材料表
-- =============================================================
CREATE TABLE IF NOT EXISTS rs.materials (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    material_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    purity VARCHAR(100),
    supplier VARCHAR(255),
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 0,
    min_quantity NUMERIC(15, 4),
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 创建索引
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_projects_code ON rs.projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_leader ON rs.projects(leader);
CREATE INDEX IF NOT EXISTS idx_formulas_code ON rs.formulas(code);
CREATE INDEX IF NOT EXISTS idx_formulas_project_id ON rs.formulas(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_code ON rs.experiments(code);
CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON rs.experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON rs.experiments(status);
CREATE INDEX IF NOT EXISTS idx_materials_code ON rs.materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_type ON rs.materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_status ON rs.materials(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON rs.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON rs.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON rs.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON rs.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON rs.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON rs.project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON rs.project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_project_id ON rs.project_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_project_id ON rs.payment_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON rs.payment_schedules(contract_id);

-- =============================================================
-- 授予权限
-- =============================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA rs TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA rs TO topems;
ALTER DEFAULT PRIVILEGES IN SCHEMA rs GRANT ALL PRIVILEGES ON TABLES TO topems;
ALTER DEFAULT PRIVILEGES IN SCHEMA rs GRANT ALL PRIVILEGES ON SEQUENCES TO topems;

-- =============================================================
-- 完成
-- =============================================================
SELECT 'RS schema setup complete!' AS status;
