-- B181 生产记录状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE mes.production_records DROP CONSTRAINT IF EXISTS ck_mes_production_records_status_standard;
ALTER TABLE mes.production_records ADD CONSTRAINT ck_mes_production_records_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','cancelled'])) NOT VALID;

COMMIT;
