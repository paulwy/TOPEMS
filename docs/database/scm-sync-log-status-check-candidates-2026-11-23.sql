-- B166 SCM 同步日志状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.sync_logs DROP CONSTRAINT IF EXISTS ck_scm_sync_logs_status_standard;
ALTER TABLE scm.sync_logs ADD CONSTRAINT ck_scm_sync_logs_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['pending','in_progress','success','failed'])) NOT VALID;

COMMIT;
