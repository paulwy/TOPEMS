-- B145 · finance.finance_audit_findings_v52.status / finance.finance_v60_alerts.status
-- 两表本地均为 0 行；但已存在 VALID 且值集错误的同名 CHECK，会拦截规范状态，必须先 DROP 再重建。
-- 值集来源：audit_v52::FindingStatus（open/resolved/ignored）
--           forecasting::AlertStatus（active/acknowledged/resolved/suppressed）
-- 生产快照中两表不存在，本候选未应用生产。

-- 1) 审计发现：回填 NULL 为 open，默认 open，NOT NULL，三值 NOT VALID
ALTER TABLE finance.finance_audit_findings_v52
  DROP CONSTRAINT IF EXISTS ck_finance_audit_findings_v52_status_standard;
UPDATE finance.finance_audit_findings_v52 SET status = 'open' WHERE status IS NULL;
ALTER TABLE finance.finance_audit_findings_v52 ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE finance.finance_audit_findings_v52 ALTER COLUMN status SET NOT NULL;
ALTER TABLE finance.finance_audit_findings_v52
  ADD CONSTRAINT ck_finance_audit_findings_v52_status_standard
  CHECK (status = ANY (ARRAY['open','resolved','ignored']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_audit_findings_v52.status IS '审计发现状态：open, resolved, ignored';

-- 2) 智能告警：默认 active，四值 NOT VALID
ALTER TABLE finance.finance_v60_alerts
  DROP CONSTRAINT IF EXISTS ck_finance_v60_alerts_status_standard;
ALTER TABLE finance.finance_v60_alerts ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE finance.finance_v60_alerts
  ADD CONSTRAINT ck_finance_v60_alerts_status_standard
  CHECK (status = ANY (ARRAY['active','acknowledged','resolved','suppressed']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v60_alerts.status IS '告警状态：active, acknowledged, resolved, suppressed';

-- 窗口内验证：
-- ALTER TABLE finance.finance_audit_findings_v52 VALIDATE CONSTRAINT ck_finance_audit_findings_v52_status_standard;
-- ALTER TABLE finance.finance_v60_alerts VALIDATE CONSTRAINT ck_finance_v60_alerts_status_standard;
