-- B162 外部 ERP 连接与同步日志状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE integration.erp_connections DROP CONSTRAINT IF EXISTS ck_erp_connections_status_standard;
ALTER TABLE integration.erp_connections ADD CONSTRAINT ck_erp_connections_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive'])) NOT VALID;

ALTER TABLE integration.erp_connections DROP CONSTRAINT IF EXISTS ck_erp_connections_last_sync_status_standard;
ALTER TABLE integration.erp_connections ADD CONSTRAINT ck_erp_connections_last_sync_status_standard
  CHECK (last_sync_status IS NULL OR last_sync_status = ANY (ARRAY['running','success','failed'])) NOT VALID;

ALTER TABLE integration.external_erp_sync_logs DROP CONSTRAINT IF EXISTS ck_external_erp_sync_logs_status_standard;
ALTER TABLE integration.external_erp_sync_logs ADD CONSTRAINT ck_external_erp_sync_logs_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['running','success','failed'])) NOT VALID;

ALTER TABLE public.erp_connections DROP CONSTRAINT IF EXISTS ck_erp_connections_status_standard;
ALTER TABLE public.erp_connections ADD CONSTRAINT ck_erp_connections_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive'])) NOT VALID;

ALTER TABLE public.external_erp_sync_logs DROP CONSTRAINT IF EXISTS ck_external_erp_sync_logs_status_standard;
ALTER TABLE public.external_erp_sync_logs ADD CONSTRAINT ck_external_erp_sync_logs_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['running','success','failed'])) NOT VALID;

COMMIT;
