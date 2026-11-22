-- B157 · QMS 质检单 / 质量问题状态唯一集合候选 CHECK（NOT VALID）
-- 值集来源：svc/qms/src/modules/qms_status.rs
-- 本地存量：qms.qa_quality_inspections pending 1 / pending_audit 1；
--          qms.quality_inspections pending 43；qms.qa_quality_issues open 15。

ALTER TABLE qms.qa_quality_inspections
  ADD CONSTRAINT ck_qa_quality_inspections_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','pending_audit','completed','rejected','cancelled']))
  NOT VALID;

ALTER TABLE qms.quality_inspections
  ADD CONSTRAINT ck_quality_inspections_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','pending_audit','completed','rejected','cancelled']))
  NOT VALID;

ALTER TABLE qms.qa_quality_issues
  ADD CONSTRAINT ck_qa_quality_issues_status_standard
  CHECK (status = ANY (ARRAY['open','in_progress','resolved','closed','approved','rejected','cancelled']))
  NOT VALID;

-- 回滚：
-- ALTER TABLE qms.qa_quality_inspections DROP CONSTRAINT IF EXISTS ck_qa_quality_inspections_status_standard;
-- ALTER TABLE qms.quality_inspections DROP CONSTRAINT IF EXISTS ck_quality_inspections_status_standard;
-- ALTER TABLE qms.qa_quality_issues DROP CONSTRAINT IF EXISTS ck_qa_quality_issues_status_standard;
