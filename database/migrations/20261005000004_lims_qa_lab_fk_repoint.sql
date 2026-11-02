-- ============================================================
-- 方向③ U3b 闭环：lims.qa_lab_samples/tasks 骨架 DROP 前置 FK repoint（补录）
-- ============================================================
-- 背景（TODO.md L973 方向③收尾）：
--   * U3b（20261003000002）DROP lims.qa_lab_samples / lims.qa_lab_tasks
--     被 5 个业务 FK 依赖阻止（声称"重放通过"实为未删净）：
--       - lims.qa_lab_records.task_id        → qa_lab_tasks(id)
--       - lims.qa_lab_sample_lifecycle.sample_id  → qa_lab_samples(id)
--       - lims.qa_lab_inspection_reports.sample_id → qa_lab_samples(id)
--       - lims.qa_lims_rfid_tags.sample_id   → qa_lab_samples(id)
--       - lims.qa_lims_sample_barcodes.sample_id → qa_lab_samples(id)
--   * 唯一事实标准表为 public.qa_lab_samples / public.qa_lab_tasks（id=uuid，
--     代码 55 处显式 public 引用；20260921000100 补建 14 列标准结构）。
--   * 本迁移：① 5 FK 改指 public 事实标准表；② DROP lims/qms 骨架表。
--     幂等：FK 仅当仍指向 lims 骨架时替换、ADD 仅当约束不存在时执行、
--     DROP 全部 IF EXISTS——可安全重放多次。
-- 约束：不修改任何已应用迁移文件（防 sqlx checksum 破坏）。
-- ============================================================

-- ① 删除仍指向 lims 骨架表的旧 FK（幂等：仅存在时删）
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE connamespace = 'lims'::regnamespace
      AND contype = 'f'
      AND confrelid::regclass::text IN ('lims.qa_lab_samples', 'lims.qa_lab_tasks')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', rec.tbl, rec.conname);
  END LOOP;
END $$;

-- ② 业务表 FK 指向 public 事实标准表（幂等：约束不存在才 ADD）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_sample_lifecycle_sample_id_fkey') THEN
    ALTER TABLE lims.qa_lab_sample_lifecycle
      ADD CONSTRAINT qa_lab_sample_lifecycle_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_inspection_reports_sample_id_fkey') THEN
    ALTER TABLE lims.qa_lab_inspection_reports
      ADD CONSTRAINT qa_lab_inspection_reports_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_records_task_id_fkey') THEN
    ALTER TABLE lims.qa_lab_records
      ADD CONSTRAINT qa_lab_records_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES public.qa_lab_tasks(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_rfid_tags_sample_id_fkey') THEN
    ALTER TABLE lims.qa_lims_rfid_tags
      ADD CONSTRAINT qa_lims_rfid_tags_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_sample_barcodes_sample_id_fkey') THEN
    ALTER TABLE lims.qa_lims_sample_barcodes
      ADD CONSTRAINT qa_lims_sample_barcodes_sample_id_fkey
      FOREIGN KEY (sample_id) REFERENCES public.qa_lab_samples(id);
  END IF;
END $$;

-- ③ DROP 骨架表（幂等；qms 两表若已被 U3b 删除则无操作）
DROP TABLE IF EXISTS lims.qa_lab_tasks;
DROP TABLE IF EXISTS lims.qa_lab_samples;
DROP TABLE IF EXISTS qms.qa_lab_tasks;
DROP TABLE IF EXISTS qms.qa_lab_samples;
