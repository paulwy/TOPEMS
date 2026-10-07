-- U3b 闭环：lims.qa_lab_samples/tasks 骨架表依赖链清理
-- 背景：U3b（20261003000002）DROP lims.qa_lab_samples/tasks 被 lims 业务表 FK 依赖阻止
--   （lims.qa_lab_records→tasks、sample_lifecycle/inspection_reports/tasks→samples，
--   业务表本为迁移链早期建的 lims 指向；lims 代码已全部显式 public.qa_lab_* 读写）。
-- 本迁移：先把相关 FK 改指 public 事实标准表（与代码显式 public 引用一致），再 DROP 骨架表。
-- 幂等：DO 块内按表存在性守卫；骨架表已删时直接跳过。
DO $$
BEGIN
  -- lims.qa_lab_tasks.sample_id → public.qa_lab_samples
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_tasks' AND c.relkind='r') THEN
    ALTER TABLE lims.qa_lab_tasks DROP CONSTRAINT IF EXISTS qa_lab_tasks_sample_id_fkey;
    ALTER TABLE lims.qa_lab_tasks ADD CONSTRAINT qa_lab_tasks_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
  -- lims.qa_lab_sample_lifecycle.sample_id → public.qa_lab_samples
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_sample_lifecycle' AND c.relkind='r') THEN
    ALTER TABLE lims.qa_lab_sample_lifecycle DROP CONSTRAINT IF EXISTS qa_lab_sample_lifecycle_sample_id_fkey;
    ALTER TABLE lims.qa_lab_sample_lifecycle ADD CONSTRAINT qa_lab_sample_lifecycle_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
  -- lims.qa_lab_inspection_reports.sample_id → public.qa_lab_samples
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_inspection_reports' AND c.relkind='r') THEN
    ALTER TABLE lims.qa_lab_inspection_reports DROP CONSTRAINT IF EXISTS qa_lab_inspection_reports_sample_id_fkey;
    ALTER TABLE lims.qa_lab_inspection_reports ADD CONSTRAINT qa_lab_inspection_reports_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
  -- lims.qa_lab_records.task_id → public.qa_lab_tasks
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lab_records' AND c.relkind='r') THEN
    ALTER TABLE lims.qa_lab_records DROP CONSTRAINT IF EXISTS qa_lab_records_task_id_fkey;
    ALTER TABLE lims.qa_lab_records ADD CONSTRAINT qa_lab_records_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES public.qa_lab_tasks(id);
  END IF;
  -- lims.qa_lims_rfid_tags.sample_id → public.qa_lab_samples
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_rfid_tags' AND c.relkind='r') THEN
    ALTER TABLE lims.qa_lims_rfid_tags DROP CONSTRAINT IF EXISTS qa_lims_rfid_tags_sample_id_fkey;
    ALTER TABLE lims.qa_lims_rfid_tags ADD CONSTRAINT qa_lims_rfid_tags_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
  -- lims.qa_lims_sample_barcodes.sample_id → public.qa_lab_samples
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='lims' AND c.relname='qa_lims_sample_barcodes' AND c.relkind='r') THEN
    ALTER TABLE lims.qa_lims_sample_barcodes DROP CONSTRAINT IF EXISTS qa_lims_sample_barcodes_sample_id_fkey;
    ALTER TABLE lims.qa_lims_sample_barcodes ADD CONSTRAINT qa_lims_sample_barcodes_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
END $$;

-- 骨架表 DROP（幂等）
DROP TABLE IF EXISTS qms.qa_lab_samples;
DROP TABLE IF EXISTS qms.qa_lab_tasks;
DROP TABLE IF EXISTS lims.qa_lab_samples;
DROP TABLE IF EXISTS lims.qa_lab_tasks;
