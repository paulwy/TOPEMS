-- B169 工作流实例状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE public.core_workflow_instances DROP CONSTRAINT IF EXISTS ck_core_workflow_instances_status_standard;
ALTER TABLE public.core_workflow_instances ADD CONSTRAINT ck_core_workflow_instances_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['pending','running','approved','rejected','cancelled','suspended','completed','error'])) NOT VALID;

COMMIT;
