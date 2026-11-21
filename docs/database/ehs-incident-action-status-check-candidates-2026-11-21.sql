-- B50 · ehs.qa_ehs_incident_actions 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/incident_action_status.rs（IncidentActionStatus）
-- 流转：pending → in_progress → completed → verified；只允许停留或前进。
-- 本地 232 行全部 pending；列默认已是 'pending'。

ALTER TABLE ehs.qa_ehs_incident_actions
  ADD CONSTRAINT qa_ehs_incident_actions_status_check
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','verified']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_incident_actions VALIDATE CONSTRAINT qa_ehs_incident_actions_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_incident_actions DROP CONSTRAINT IF EXISTS qa_ehs_incident_actions_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   insert pending → in_progress → completed → verified 各 UPDATE 1；verified → 'done' → 23514。
