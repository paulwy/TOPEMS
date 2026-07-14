-- 项目成员表
CREATE TABLE IF NOT EXISTS rs.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    responsibility TEXT,
    allocation NUMERIC(5,2) DEFAULT 1.0,
    join_date TIMESTAMPTZ NOT NULL,
    leave_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    hourly_rate NUMERIC(10,2),
    cost_rate NUMERIC(10,2),
    budgeted_hours NUMERIC(10,2),
    actual_hours NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON rs.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee_id ON rs.project_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON rs.project_members(status);
