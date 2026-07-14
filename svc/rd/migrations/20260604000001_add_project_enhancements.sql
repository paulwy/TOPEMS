-- 项目表增强 - 添加项目配置、效益目标、风险等级等字段
ALTER TABLE IF EXISTS rs.projects
    ADD COLUMN IF NOT EXISTS project_config JSONB;

ALTER TABLE IF EXISTS rs.projects
    ADD COLUMN IF NOT EXISTS benefit_target JSONB;

ALTER TABLE IF EXISTS rs.projects
    ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50);

ALTER TABLE IF EXISTS rs.projects
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3;

ALTER TABLE IF EXISTS rs.projects
    ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE IF EXISTS rs.projects
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES rs.projects(id);

ALTER TABLE IF EXISTS rs.projects
    ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON rs.projects(parent_id);
CREATE INDEX IF NOT EXISTS idx_projects_risk_level ON rs.projects(risk_level);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON rs.projects(priority);
