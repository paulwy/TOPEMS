-- B49 · ehs.qa_ehs_treatments / ehs.qa_ehs_treatment_actions 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/treatment_status.rs
--   TreatmentStatus：in_progress → completed
--   TreatmentActionStatus：pending → completed
-- 本地两表均 0 行；列默认分别为 'in_progress' / 'pending'。

ALTER TABLE ehs.qa_ehs_treatments
  ADD CONSTRAINT qa_ehs_treatments_status_check
  CHECK (status = ANY (ARRAY['in_progress','completed']))
  NOT VALID;

ALTER TABLE ehs.qa_ehs_treatment_actions
  ADD CONSTRAINT qa_ehs_treatment_actions_status_check
  CHECK (status = ANY (ARRAY['pending','completed']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_treatments VALIDATE CONSTRAINT qa_ehs_treatments_status_check;
-- ALTER TABLE ehs.qa_ehs_treatment_actions VALIDATE CONSTRAINT qa_ehs_treatment_actions_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_treatments DROP CONSTRAINT IF EXISTS qa_ehs_treatments_status_check;
-- ALTER TABLE ehs.qa_ehs_treatment_actions DROP CONSTRAINT IF EXISTS qa_ehs_treatment_actions_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   treatment in_progress → completed UPDATE 1；action pending → completed UPDATE 1；
--   action completed → 'done' → 23514。
