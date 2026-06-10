-- 项目里程碑表
CREATE TABLE IF NOT EXISTS rs.project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES rs.project_phases(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_date TIMESTAMPTZ NOT NULL,
    actual_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON rs.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_phase_id ON rs.project_milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON rs.project_milestones(status);
