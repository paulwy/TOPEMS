-- B52 · ehs.qa_ehs_hazard_rectifications 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/rectification_status.rs（RectificationStatus）
-- 流转：pending → in_progress → submitted；submitted 为终态，不可回退。
-- 本地 78 行全部 in_progress；列默认已是 'in_progress'。

ALTER TABLE ehs.qa_ehs_hazard_rectifications
  ADD CONSTRAINT qa_ehs_hazard_rectifications_status_check
  CHECK (status = ANY (ARRAY['pending','in_progress','submitted']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_hazard_rectifications
--   VALIDATE CONSTRAINT qa_ehs_hazard_rectifications_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_hazard_rectifications
--   DROP CONSTRAINT IF EXISTS qa_ehs_hazard_rectifications_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   pending → in_progress → submitted 各 UPDATE 1；'completed' → 23514。
