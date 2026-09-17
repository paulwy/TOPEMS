-- ============================================================================
-- flow 权威补全：core_workflows + core_workflow_tasks（2026-09-17）
-- 背景：embedded 固化 flow, public 后，flow.core_workflows 按旧 DDL 误建（11 列缺
--       tenant_id/code），而 public.core_workflows（13 列）持有 18 行真实数据；
--       代码查询引用 tenant_id/code 与 priority/due_time/claimed_at（flow 缺列）→ 500。
-- 处理（幂等）：
--   1) flow.core_workflows 补列并迁移 public 数据 → flow 权威（与 flow 组一致）
--   2) DROP public.core_workflows（影子，仅 unified-core 引用）
--   3) flow.core_workflow_tasks 补 priority/due_time/claimed_at（代码引用）
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='flow' AND table_name='core_workflows' AND column_name='tenant_id') THEN
    ALTER TABLE flow.core_workflows ADD COLUMN tenant_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='flow' AND table_name='core_workflows' AND column_name='code') THEN
    ALTER TABLE flow.core_workflows ADD COLUMN code varchar(64);
  END IF;
END $$;

INSERT INTO flow.core_workflows (id, name, description, definition, status, version, created_by, created_at, updated_at, published_at, deleted_at, tenant_id, code)
SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at, deleted_at, tenant_id, code
FROM public.core_workflows
ON CONFLICT (id) DO NOTHING;

-- 注：public.core_workflows 因 FK 依赖（flow.core_workflow_versions、public._archive_core_workflow_instances）
-- 暂保留为冻结影子（数据已迁移 flow 18 行）；后续需先 DROP 相关 FK 再清理。
-- DROP TABLE IF EXISTS public.core_workflows;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='flow' AND table_name='core_workflow_tasks' AND column_name='priority') THEN
    ALTER TABLE flow.core_workflow_tasks ADD COLUMN priority integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='flow' AND table_name='core_workflow_tasks' AND column_name='due_time') THEN
    ALTER TABLE flow.core_workflow_tasks ADD COLUMN due_time timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='flow' AND table_name='core_workflow_tasks' AND column_name='claimed_at') THEN
    ALTER TABLE flow.core_workflow_tasks ADD COLUMN claimed_at timestamptz;
  END IF;
END $$;
