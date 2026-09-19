-- TOPEMS database migration 20260918000078
-- GET 全量冒烟（rd/project_report、experiment）暴露：
-- 1) rs.projects 缺 actual_cost（项目趋势/预算对比查询报 column does not exist）；
--    5433 无 rs.projects 表（历史迁移骨架缺失），一并幂等补建完整表
-- 2) rs.experiments 表缺失（business_base_tables 仅为占位骨架，未落完整列）
-- 幂等补建，双库安全。

CREATE TABLE IF NOT EXISTS rs.projects (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    project_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    leader VARCHAR(255) NOT NULL,
    team_members JSONB,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    budget DOUBLE PRECISION,
    progress INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    project_config JSONB,
    benefit_target JSONB,
    risk_level VARCHAR(32),
    parent_id UUID,
    workspace_id UUID,
    tags JSONB,
    priority INTEGER,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    deleted_at TIMESTAMPTZ,
    source_type VARCHAR(50),
    source_id UUID,
    actual_cost DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- 兼容 5433 已存在的骨架表（无 tenant_id/status/project_type/actual_cost 列）
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(100) NOT NULL DEFAULT 'other';
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS actual_cost DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON rs.projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON rs.projects (project_type);

CREATE TABLE IF NOT EXISTS rs.experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name TEXT NOT NULL,
    code TEXT,
    project_id UUID,
    formula_id UUID,
    experiment_type TEXT,
    phase TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    objective TEXT,
    method TEXT,
    results TEXT,
    conclusions TEXT,
    experimenter TEXT,
    batch_number TEXT,
    scale DOUBLE PRECISION NOT NULL DEFAULT 0,
    scale_unit TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 兼容 5433 已存在的占位骨架表（仅 id 列）
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS formula_id UUID;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS experiment_type TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS phase TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planning';
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS results TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS conclusions TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS experimenter TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS scale DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS scale_unit TEXT;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_experiments_tenant ON rs.experiments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_experiments_project ON rs.experiments (project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON rs.experiments (status);
