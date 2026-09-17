-- ============================================================================
-- public 影子表补列（2026-09-17）
-- 背景：flow 业务表（approvals/approval_records/core_workflow_tasks）权威在 flow schema，
--       public 存在历史影子表且缺列；无前缀查询按 search_path 解析，命中 public 影子表时
--       因缺列报 "column a.assignee_id does not exist"（core/flow/instances 500 根因）。
-- 处理：按 information_schema 判缺才 ADD，补齐与 flow 权威结构对齐的列（幂等可重放）。
--       后续建议收敛同名多 schema 表（DROP public 影子表）时需先保证 search_path 含 flow。
-- ============================================================================

DO $$
DECLARE
  col RECORD;
BEGIN
  -- public.approvals 补列
  FOR col IN SELECT unnest(ARRAY['node_id','task_name','assignee_id','approved_by','approval_type','comment','approved_at','timeout_at','tenant_id']) AS cname,
                    unnest(ARRAY['uuid','text','uuid','uuid','text','text','timestamptz','timestamptz','uuid']) AS ctype
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='approvals' AND column_name=col.cname
    ) THEN
      EXECUTE format('ALTER TABLE public.approvals ADD COLUMN %I %s', col.cname, col.ctype);
    END IF;
  END LOOP;

  -- public.approval_records 补列
  FOR col IN SELECT unnest(ARRAY['actor_id','tenant_id']) AS cname,
                    unnest(ARRAY['uuid','uuid']) AS ctype
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='approval_records' AND column_name=col.cname
    ) THEN
      EXECUTE format('ALTER TABLE public.approval_records ADD COLUMN %I %s', col.cname, col.ctype);
    END IF;
  END LOOP;

  -- public.core_workflow_tasks 补列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='core_workflow_tasks' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE public.core_workflow_tasks ADD COLUMN tenant_id uuid;
  END IF;
END $$;
