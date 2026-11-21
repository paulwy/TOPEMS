-- B53 · ehs.qa_ehs_risk_controls 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/ehs/src/modules/risk_control_status.rs（RiskControlStatus）
-- 流转：active → completed；completed 为终态，不可回退。
-- 本地 2 行：active 1 / completed 1；列可空，DB 默认 'active'。

ALTER TABLE ehs.qa_ehs_risk_controls
  ADD CONSTRAINT qa_ehs_risk_controls_status_check
  CHECK (status IS NULL OR status = ANY (ARRAY['active','completed']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE ehs.qa_ehs_risk_controls
--   VALIDATE CONSTRAINT qa_ehs_risk_controls_status_check;
-- 回滚：
-- ALTER TABLE ehs.qa_ehs_risk_controls
--   DROP CONSTRAINT IF EXISTS qa_ehs_risk_controls_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   active → completed UPDATE 1；completed 自身 UPDATE 1；
--   'closed' → 23514；completed → active 带起始态谓词 UPDATE 0。
