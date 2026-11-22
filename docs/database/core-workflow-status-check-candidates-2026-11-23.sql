-- B168 工作流定义状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE public.core_workflows DROP CONSTRAINT IF EXISTS ck_core_workflows_status_standard;
ALTER TABLE public.core_workflows ADD CONSTRAINT ck_core_workflows_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['draft','published','active','inactive','deployed'])) NOT VALID;

COMMIT;
