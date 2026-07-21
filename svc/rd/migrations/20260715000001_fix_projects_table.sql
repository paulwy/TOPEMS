-- 修复 rs.projects 表结构
-- 代码期望的字段：id, name, code, description, project_type, status, leader, team_members, start_date, end_date, budget, progress, created_by, created_at, updated_at
-- 当前实际字段：id, name, description, status, owner_id, start_date, end_date, budget, created_at, updated_at

BEGIN;

-- 添加缺失的字段
ALTER TABLE rs.projects
    ADD COLUMN IF NOT EXISTS code VARCHAR(100) DEFAULT '',
    ADD COLUMN IF NOT EXISTS project_type VARCHAR(100) DEFAULT 'R&D',
    ADD COLUMN IF NOT EXISTS leader VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT '';

-- 删除多余的字段（如果存在）
ALTER TABLE rs.projects
    DROP COLUMN IF EXISTS owner_id;

-- 为新增字段设置合理的默认值（基于现有数据）
UPDATE rs.projects
SET 
    code = COALESCE(code, ''),
    project_type = COALESCE(project_type, 'R&D'),
    leader = COALESCE(leader, ''),
    team_members = COALESCE(team_members, '[]'),
    progress = COALESCE(progress, 0),
    created_by = COALESCE(created_by, 'system');

-- 添加必要的索引
CREATE INDEX IF NOT EXISTS idx_projects_code ON rs.projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_leader ON rs.projects(leader);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON rs.projects(project_type);

COMMIT;

-- 验证修复结果
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'rs' AND table_name = 'projects' 
ORDER BY ordinal_position;
