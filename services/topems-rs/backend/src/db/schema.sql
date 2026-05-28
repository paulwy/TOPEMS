-- TOPEMS-RS 数据库 Schema
-- 科研研发管理系统

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 项目管理表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    project_type VARCHAR(50) NOT NULL,  -- research, development, trial
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, active, paused, completed, archived
    leader VARCHAR(100) NOT NULL,
    team_members JSONB DEFAULT '[]',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    budget DOUBLE PRECISION,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_leader ON projects(leader);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- 2. 配方管理表
CREATE TABLE IF NOT EXISTS formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, pending_review, approved, rejected, archived
    ingredients JSONB NOT NULL DEFAULT '[]',
    process_params JSONB DEFAULT '{}',
    properties JSONB DEFAULT '{}',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_formulas_project_id ON formulas(project_id);
CREATE INDEX idx_formulas_status ON formulas(status);
CREATE INDEX idx_formulas_code ON formulas(code);

-- 3. 配方版本历史表
CREATE TABLE IF NOT EXISTS formula_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    ingredients JSONB NOT NULL,
    process_params JSONB,
    properties JSONB,
    change_reason TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(formula_id, version)
);

CREATE INDEX idx_formula_versions_formula_id ON formula_versions(formula_id);

-- 4. 试验管理表
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    formula_id UUID REFERENCES formulas(id) ON DELETE SET NULL,
    experiment_type VARCHAR(50) NOT NULL,  -- performance, stability, safety, quality
    phase VARCHAR(50) NOT NULL DEFAULT 'lab',  -- lab, pilot, scaleup, production
    status VARCHAR(50) NOT NULL DEFAULT 'planned',  -- planned, in_progress, completed, cancelled
    objective TEXT NOT NULL,
    method TEXT NOT NULL,
    results JSONB DEFAULT '{}',
    conclusions TEXT,
    experimenter VARCHAR(100) NOT NULL,
    batch_number VARCHAR(100),
    scale DOUBLE PRECISION,
    scale_unit VARCHAR(50),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiments_project_id ON experiments(project_id);
CREATE INDEX idx_experiments_formula_id ON experiments(formula_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_code ON experiments(code);

-- 5. 试验记录表
CREATE TABLE IF NOT EXISTS experiment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,  -- observation, measurement, note, attachment
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiment_records_experiment_id ON experiment_records(experiment_id);
CREATE INDEX idx_experiment_records_recorded_at ON experiment_records(recorded_at);

-- 6. 研发成果表
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,  -- patent, paper, award, product
    title VARCHAR(255) NOT NULL,
    description TEXT,
    application_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    filing_date DATE,
    grant_date DATE,
    attachments JSONB DEFAULT '[]',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_project_id ON achievements(project_id);
CREATE INDEX idx_achievements_type ON achievements(achievement_type);
CREATE INDEX idx_achievements_status ON achievements(status);

-- 7. 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formulas_updated_at BEFORE UPDATE ON formulas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
