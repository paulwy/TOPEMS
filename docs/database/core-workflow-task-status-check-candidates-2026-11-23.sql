-- B170 工作流任务状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE public.core_workflow_tasks DROP CONSTRAINT IF EXISTS ck_core_workflow_tasks_status_standard;
ALTER TABLE public.core_workflow_tasks ADD CONSTRAINT ck_core_workflow_tasks_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['pending','claimed','approved','rejected','completed','delegated','error'])) NOT VALID;

COMMIT;
