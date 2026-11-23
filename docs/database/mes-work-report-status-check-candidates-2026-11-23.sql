-- B182 生产报工状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE mes.work_reports DROP CONSTRAINT IF EXISTS ck_mes_work_reports_status_standard;
ALTER TABLE mes.work_reports ADD CONSTRAINT ck_mes_work_reports_status_standard
  CHECK (status = ANY (ARRAY['draft','submitted','approved','rejected','reworking','archived','cancelled'])) NOT VALID;

COMMIT;
