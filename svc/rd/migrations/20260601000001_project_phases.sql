-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 项目阶段表
CREATE TABLE IF NOT EXISTS rs.project_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    phase_number INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    planned_duration_days INT,
    actual_duration_days INT,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    progress INT DEFAULT 0,
    predecessor_id UUID REFERENCES rs.project_phases(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON rs.project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_status ON rs.project_phases(status);
