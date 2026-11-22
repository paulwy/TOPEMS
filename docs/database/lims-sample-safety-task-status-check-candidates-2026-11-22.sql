-- B156 · LIMS 样品 / 安全检测任务状态唯一集合候选 CHECK（NOT VALID）
-- 值集来源：
--   svc/lims/src/modules/sample_status.rs（LabSampleStatus）
--   svc/lims/src/modules/safety_task_status.rs（SafetyTaskStatus）
-- 本地存量：public.qa_lab_samples 4 行 received（lims.samples 备份表 28 行）；lims.lims_safety_tasks 14 行 pending。

ALTER TABLE public.qa_lab_samples
  ADD CONSTRAINT ck_qa_lab_samples_status_standard
  CHECK (status = ANY (ARRAY['received','registered','testing','completed','stored','retrieved','disposed','destroyed']))
  NOT VALID;

ALTER TABLE lims.lims_safety_tasks
  ADD CONSTRAINT ck_lims_safety_tasks_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','cancelled']))
  NOT VALID;

-- 回滚：
-- ALTER TABLE public.qa_lab_samples DROP CONSTRAINT IF EXISTS ck_qa_lab_samples_status_standard;
-- ALTER TABLE lims.lims_safety_tasks DROP CONSTRAINT IF EXISTS ck_lims_safety_tasks_status_standard;
