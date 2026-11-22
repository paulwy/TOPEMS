-- B143 · 财务 v60/v56/v57 五列状态约束候选 DDL
-- 本地/生产快照五表均 0 行；五列均 NOT NULL 且无状态 CHECK。
-- 值集来源：decision_v60::{DecisionStatus,ScheduleTaskStatus}、tax_v56::{TaxFormStatus,TaxPlanStatus}、reports_v57::ReportStatus。

-- 1) 决策场景：draft → active → evaluated / archived
ALTER TABLE finance.finance_v60_decision_scenarios
  DROP CONSTRAINT IF EXISTS ck_finance_v60_decision_scenarios_status_standard;
ALTER TABLE finance.finance_v60_decision_scenarios ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE finance.finance_v60_decision_scenarios
  ADD CONSTRAINT ck_finance_v60_decision_scenarios_status_standard
  CHECK (status = ANY (ARRAY['draft','active','evaluated','archived']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v60_decision_scenarios.status IS '决策场景状态：draft, active, evaluated, archived';

-- 2) 排程任务：pending → running/paused → completed/failed
ALTER TABLE finance.finance_v60_schedule_tasks
  DROP CONSTRAINT IF EXISTS ck_finance_v60_schedule_tasks_status_standard;
ALTER TABLE finance.finance_v60_schedule_tasks ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE finance.finance_v60_schedule_tasks
  ADD CONSTRAINT ck_finance_v60_schedule_tasks_status_standard
  CHECK (status = ANY (ARRAY['pending','running','paused','completed','failed']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v60_schedule_tasks.status IS '排程任务状态：pending, running, paused, completed, failed';

-- 3) 税务表单：draft → calculated → submitted → accepted/rejected
ALTER TABLE finance.finance_v56_tax_forms
  DROP CONSTRAINT IF EXISTS ck_finance_v56_tax_forms_status_standard;
ALTER TABLE finance.finance_v56_tax_forms ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE finance.finance_v56_tax_forms
  ADD CONSTRAINT ck_finance_v56_tax_forms_status_standard
  CHECK (status = ANY (ARRAY['draft','calculated','submitted','accepted','rejected']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v56_tax_forms.status IS '税务表单状态：draft, calculated, submitted, accepted, rejected';

-- 4) 税务方案：draft → proposed → under_review → approved/rejected → executed
ALTER TABLE finance.finance_v56_tax_plans
  DROP CONSTRAINT IF EXISTS ck_finance_v56_tax_plans_status_standard;
ALTER TABLE finance.finance_v56_tax_plans ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE finance.finance_v56_tax_plans
  ADD CONSTRAINT ck_finance_v56_tax_plans_status_standard
  CHECK (status = ANY (ARRAY['draft','proposed','under_review','approved','rejected','executed']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v56_tax_plans.status IS '税务方案状态：draft, proposed, under_review, approved, rejected, executed';

-- 5) v57 报表生成任务：pending → generating → completed/failed
ALTER TABLE finance.finance_v57_generated_reports
  DROP CONSTRAINT IF EXISTS ck_finance_v57_generated_reports_status_standard;
ALTER TABLE finance.finance_v57_generated_reports ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE finance.finance_v57_generated_reports
  ADD CONSTRAINT ck_finance_v57_generated_reports_status_standard
  CHECK (status = ANY (ARRAY['pending','generating','completed','failed']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v57_generated_reports.status IS '报表生成状态：pending, generating, completed, failed';

-- 窗口内逐条 VALIDATE；回滚仅 DROP 对应 ck_* 约束。
