-- B238 · `qms.qa_audit_findings.status` 状态约束候选 DDL
-- 值集唯一来源：`svc/qms/src/modules/audit_finding_status.rs::QmsAuditFindingStatus`
--   open / in_progress / verified / closed；默认 open
-- 生命周期与前端 StatusBadge 的 audit_finding FSM 一致。
-- 本地 `topems` 已以 NOT VALID 真实应用，重建库待回迁。

ALTER TABLE qms.qa_audit_findings
  ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE qms.qa_audit_findings
  DROP CONSTRAINT IF EXISTS ck_qa_audit_findings_status_standard;
ALTER TABLE qms.qa_audit_findings
  ADD CONSTRAINT ck_qa_audit_findings_status_standard
  CHECK (
    status IS NULL
    OR status = ANY (ARRAY['open','in_progress','verified','closed'])
  ) NOT VALID;

COMMENT ON COLUMN qms.qa_audit_findings.status IS
  '审核发现状态：open, in_progress, verified, closed';

-- 窗口内逐条 VALIDATE；本地 qms.qa_audit_findings 当前 0 行。
