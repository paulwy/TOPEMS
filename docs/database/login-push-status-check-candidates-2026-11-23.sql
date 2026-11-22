-- B164 登录日志与移动推送状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE public.core_login_logs DROP CONSTRAINT IF EXISTS ck_core_login_logs_status_standard;
ALTER TABLE public.core_login_logs ADD CONSTRAINT ck_core_login_logs_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['success','failed'])) NOT VALID;

ALTER TABLE mobile.push_notifications DROP CONSTRAINT IF EXISTS ck_push_notifications_status_standard;
ALTER TABLE mobile.push_notifications ADD CONSTRAINT ck_push_notifications_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['pending','sent','failed'])) NOT VALID;

ALTER TABLE mobile.mobile_push_notifications DROP CONSTRAINT IF EXISTS ck_mobile_push_notifications_status_standard;
ALTER TABLE mobile.mobile_push_notifications ADD CONSTRAINT ck_mobile_push_notifications_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['pending','sent','failed'])) NOT VALID;

COMMIT;
