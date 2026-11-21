-- B48 · ehs.qa_ehs_investigations 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/investigation_status.rs（InvestigationStatus）
-- 流转：in_progress → completed；completed 为终态，编辑不可回退，完成动作只允许 in_progress。
-- 本地 233 行全部 completed；列默认已是 'in_progress'。

ALTER TABLE ehs.qa_ehs_investigations
  ADD CONSTRAINT qa_ehs_investigations_status_check
  CHECK (status = ANY (ARRAY['in_progress','completed']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_investigations VALIDATE CONSTRAINT qa_ehs_investigations_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_investigations DROP CONSTRAINT IF EXISTS qa_ehs_investigations_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert in_progress → completed UPDATE 1；in_progress → 'closed' → 23514。
