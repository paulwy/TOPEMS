-- 2026-09-23 flow（工作流）模块租户绑定与 RLS 加固（public schema 实际表）
-- 背景：flow 服务（unified-core 内嵌）SQL 无 schema 前缀，实际落 public 表；
--   public.core_workflow_instances/tasks 原本无 tenant_id/deleted_at 列、RLS 未 FORCE，
--   写操作（create_instance / create_approval）未绑定租户，普通租户数据无法隔离。
-- 对齐 pm 同型治理：补列 + 写绑定（代码侧） + 时间列 timestamptz + FORCE RLS + 标准策略。
-- 幂等：可重复执行。

-- 1) 补列：tenant_id（租户绑定）+ deleted_at（软删，列表查询引用）
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2) 时间列 TIMESTAMP -> TIMESTAMPTZ（Rust DateTime<Utc> 解码兼容；存量按 UTC 解释）
ALTER TABLE public.core_workflow_instances
  ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE public.core_workflow_tasks
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';
ALTER TABLE public.core_workflow_versions
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';
ALTER TABLE IF EXISTS public.core_workflows
  ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

-- 3) 统一 RLS 策略（pm 同款：nil/空/零值放行，普通租户仅见本租户 + 存量 NULL 行）
DROP POLICY IF EXISTS core_workflow_instances_tenant_policy ON public.core_workflow_instances;
DROP POLICY IF EXISTS tenant_isolation_core_workflow_instances ON public.core_workflow_instances;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_workflow_instances;
DROP POLICY IF EXISTS core_workflow_tasks_tenant_policy ON public.core_workflow_tasks;
DROP POLICY IF EXISTS tenant_isolation_core_workflow_tasks ON public.core_workflow_tasks;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_workflow_tasks;

CREATE POLICY rls_tenant_isolation ON public.core_workflow_instances FOR ALL USING (
  (current_setting('app.tenant_id', true) IS NULL) OR
  (current_setting('app.tenant_id', true) = '') OR
  (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
  (tenant_id IS NULL) OR
  (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);
CREATE POLICY rls_tenant_isolation ON public.core_workflow_tasks FOR ALL USING (
  (current_setting('app.tenant_id', true) IS NULL) OR
  (current_setting('app.tenant_id', true) = '') OR
  (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
  (tenant_id IS NULL) OR
  (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

-- 4) 启用 + FORCE RLS（owner 也受约束，对齐 pm）
ALTER TABLE public.core_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_tasks FORCE ROW LEVEL SECURITY;
