-- B51 · ehs.qa_ehs_drill_plans / ehs.qa_ehs_drill_records 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/drill_status.rs
--   DrillPlanStatus：planned / completed / cancelled
--   DrillRecordStatus：in_progress / completed / cancelled
-- 本地 plan 3 行均 planned；record 1 行 in_progress。

ALTER TABLE ehs.qa_ehs_drill_plans
  ADD CONSTRAINT qa_ehs_drill_plans_status_check
  CHECK (status = ANY (ARRAY['planned','completed','cancelled']))
  NOT VALID;

ALTER TABLE ehs.qa_ehs_drill_records
  ADD CONSTRAINT qa_ehs_drill_records_status_check
  CHECK (status = ANY (ARRAY['in_progress','completed','cancelled']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_drill_plans VALIDATE CONSTRAINT qa_ehs_drill_plans_status_check;
-- ALTER TABLE ehs.qa_ehs_drill_records VALIDATE CONSTRAINT qa_ehs_drill_records_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_drill_plans DROP CONSTRAINT IF EXISTS qa_ehs_drill_plans_status_check;
-- ALTER TABLE ehs.qa_ehs_drill_records DROP CONSTRAINT IF EXISTS qa_ehs_drill_records_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   plan planned → completed → cancelled 各 UPDATE 1；'scheduled' → 23514。
--   record in_progress → completed UPDATE 1；'planned' → 23514。
