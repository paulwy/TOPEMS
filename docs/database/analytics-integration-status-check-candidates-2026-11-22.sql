-- B147 · analytics 报表排程 / integration 异步任务状态约束候选 DDL
-- 两表本地均 0 行，生产快照均 0 行。
-- bi.report_schedules 已有 VALID 错误 CHECK：active/inactive/archived，会拦截 paused/completed/failed，必须先 DROP。
-- integration.async_tasks 无状态 CHECK，列 NOT NULL 默认 pending。

-- 1) 报表排程：active ↔ paused → completed/failed
ALTER TABLE bi.report_schedules
  DROP CONSTRAINT IF EXISTS ck_report_schedules_status_standard;
ALTER TABLE bi.report_schedules ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE bi.report_schedules ALTER COLUMN status SET NOT NULL;
ALTER TABLE bi.report_schedules
  ADD CONSTRAINT ck_report_schedules_status_standard
  CHECK (status = ANY (ARRAY['active','paused','completed','failed']))
  NOT VALID;
COMMENT ON COLUMN bi.report_schedules.status IS '排程状态：active, paused, completed, failed';

-- 1b) analytics 历史副本 analytics.report_schedules：无代码引用、0 行，同值集一并替换错误约束
ALTER TABLE analytics.report_schedules
  DROP CONSTRAINT IF EXISTS ck_report_schedules_status_standard;
ALTER TABLE analytics.report_schedules ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE analytics.report_schedules ALTER COLUMN status SET NOT NULL;
ALTER TABLE analytics.report_schedules
  ADD CONSTRAINT ck_report_schedules_status_standard
  CHECK (status = ANY (ARRAY['active','paused','completed','failed']))
  NOT VALID;

-- 2) 异步任务：pending → in_progress → completed/failed/max_retries_exceeded/cancelled
ALTER TABLE integration.async_tasks
  DROP CONSTRAINT IF EXISTS ck_async_tasks_status_standard;
ALTER TABLE integration.async_tasks ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE integration.async_tasks
  ADD CONSTRAINT ck_async_tasks_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','failed','max_retries_exceeded','cancelled']))
  NOT VALID;
COMMENT ON COLUMN integration.async_tasks.status IS '异步任务状态：pending, in_progress, completed, failed, max_retries_exceeded, cancelled';

-- 窗口内 VALIDATE。
