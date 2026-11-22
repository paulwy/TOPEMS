-- B167 应急预案状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE ehs.qa_ehs_emergency_plans DROP CONSTRAINT IF EXISTS ck_qa_ehs_emergency_plans_status_standard;
ALTER TABLE ehs.qa_ehs_emergency_plans ADD CONSTRAINT ck_qa_ehs_emergency_plans_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['draft','planned','ongoing','completed','cancelled'])) NOT VALID;

COMMIT;
