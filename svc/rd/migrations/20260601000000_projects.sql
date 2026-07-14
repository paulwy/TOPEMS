-- 项目表
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

CREATE INDEX IF NOT EXISTS idx_projects_code ON rs.projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects(status);
