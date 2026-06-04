-- 里程碑表增强 - 添加验收相关字段
ALTER TABLE IF EXISTS rs.project_milestones
    ADD COLUMN IF NOT EXISTS deliverable_type VARCHAR(100);

ALTER TABLE IF EXISTS rs.project_milestones
    ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;

ALTER TABLE IF EXISTS rs.project_milestones
    ADD COLUMN IF NOT EXISTS acceptance_status VARCHAR(50);

ALTER TABLE IF EXISTS rs.project_milestones
    ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(255);

ALTER TABLE IF EXISTS rs.project_milestones
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_milestones_acceptance_status ON rs.project_milestones(acceptance_status);
