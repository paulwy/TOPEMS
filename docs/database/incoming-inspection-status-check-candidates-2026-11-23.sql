-- B174 来料检验状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.incoming_inspections DROP CONSTRAINT IF EXISTS ck_scm_incoming_inspections_status_standard;
ALTER TABLE scm.incoming_inspections ADD CONSTRAINT ck_scm_incoming_inspections_status_standard
  CHECK (status = ANY (ARRAY['pending','passed','failed'])) NOT VALID;

COMMIT;
