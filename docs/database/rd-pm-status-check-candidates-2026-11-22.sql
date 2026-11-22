-- B148 · RD 项目/里程碑/阶段 + PM 项目状态约束候选 DDL
-- RD 本地：rs.projects 5 行全 draft；里程碑/阶段 0 行。
-- PM 本地：38 行（draft 24 / active 13 / in_progress 1）；生产快照 0 行。
-- 值集来源：rd::ProjectStatus/MilestoneStatus/PhaseStatus、pm::ProjectStatus。
-- PM 的 in_progress 为历史越界值，语义归一为 active；rejected 为审批驳回态，纳入规范集合。

-- 1) RD 项目：draft → pending_approval → active ↔ paused → completed；cancelled 终态
ALTER TABLE rs.projects
  DROP CONSTRAINT IF EXISTS ck_rs_projects_status_standard;
ALTER TABLE rs.projects ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE rs.projects
  ADD CONSTRAINT ck_rs_projects_status_standard
  CHECK (status = ANY (ARRAY['draft','pending_approval','active','paused','completed','cancelled']))
  NOT VALID;
COMMENT ON COLUMN rs.projects.status IS 'RD 项目状态：draft, pending_approval, active, paused, completed, cancelled';

-- 2) RD 里程碑：pending → achieved/delayed
ALTER TABLE rs.project_milestones
  DROP CONSTRAINT IF EXISTS ck_project_milestones_status_standard;
ALTER TABLE rs.project_milestones ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE rs.project_milestones
  ADD CONSTRAINT ck_project_milestones_status_standard
  CHECK (status = ANY (ARRAY['pending','achieved','delayed']))
  NOT VALID;
COMMENT ON COLUMN rs.project_milestones.status IS '里程碑状态：pending, achieved, delayed';

-- 3) RD 阶段：not_started → in_progress → completed/delayed
ALTER TABLE rs.project_phases
  DROP CONSTRAINT IF EXISTS ck_project_phases_status_standard;
ALTER TABLE rs.project_phases ALTER COLUMN status SET DEFAULT 'not_started';
ALTER TABLE rs.project_phases
  ADD CONSTRAINT ck_project_phases_status_standard
  CHECK (status = ANY (ARRAY['not_started','in_progress','completed','delayed']))
  NOT VALID;
COMMENT ON COLUMN rs.project_phases.status IS '阶段状态：not_started, in_progress, completed, delayed';

-- 4) PM 项目：draft → pending_approval → active ↔ paused → completed；cancelled/rejected 终态
ALTER TABLE pm.projects
  DROP CONSTRAINT IF EXISTS ck_projects_status_standard;
UPDATE pm.projects SET status = 'active' WHERE status = 'in_progress';
ALTER TABLE pm.projects ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE pm.projects
  ADD CONSTRAINT ck_projects_status_standard
  CHECK (status = ANY (ARRAY['draft','pending_approval','active','paused','completed','cancelled','rejected']))
  NOT VALID;
COMMENT ON COLUMN pm.projects.status IS '项目状态：draft, pending_approval, active, paused, completed, cancelled, rejected';

-- 窗口内 VALIDATE；PM 回滚需保留原 in_progress 行清单。
