-- ============================================================================
-- public.core_workflows 冻结影子收尾（2026-09-18）
-- 背景：flow.core_workflows 权威化（000008）后，public 影子因 3 个历史 FK 指向它而冻结；
--       这些 FK 是历史建表（search_path=public）产物，已失真（flow 内数据应引用 flow 权威）。
-- 处理（幂等）：
--   1) flow.core_workflow_instances / core_workflow_versions 的 FK 重建指向 flow.core_workflows
--   2) public._archive_core_workflow_instances（归档只读）解除 FK
--   3) DROP public.core_workflows（数据已迁移 flow 18 行）
-- ============================================================================

-- 1) flow 内 FK 重建（指向 flow 权威）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE con.conname='core_workflow_instances_workflow_id_fkey' AND c.relname='core_workflow_instances' AND n.nspname='flow'
               AND con.confrelid IN (SELECT c2.oid FROM pg_class c2 JOIN pg_namespace n2 ON n2.oid=c2.relnamespace WHERE c2.relname='core_workflows' AND n2.nspname='public')) THEN
    ALTER TABLE flow.core_workflow_instances DROP CONSTRAINT core_workflow_instances_workflow_id_fkey;
    ALTER TABLE flow.core_workflow_instances ADD CONSTRAINT core_workflow_instances_workflow_id_fkey
      FOREIGN KEY (workflow_id) REFERENCES flow.core_workflows(id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE con.conname='core_workflow_versions_workflow_id_fkey' AND c.relname='core_workflow_versions' AND n.nspname='flow'
               AND con.confrelid IN (SELECT c2.oid FROM pg_class c2 JOIN pg_namespace n2 ON n2.oid=c2.relnamespace WHERE c2.relname='core_workflows' AND n2.nspname='public')) THEN
    ALTER TABLE flow.core_workflow_versions DROP CONSTRAINT core_workflow_versions_workflow_id_fkey;
    ALTER TABLE flow.core_workflow_versions ADD CONSTRAINT core_workflow_versions_workflow_id_fkey
      FOREIGN KEY (workflow_id) REFERENCES flow.core_workflows(id);
  END IF;
END $$;

-- 2) archive 解除 FK（归档只读，无业务校验需求）
ALTER TABLE public._archive_core_workflow_instances DROP CONSTRAINT IF EXISTS core_workflow_instances_workflow_id_fkey;

-- 3) DROP 冻结影子
DROP TABLE IF EXISTS public.core_workflows;
