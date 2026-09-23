-- 2026-09-23 flow 其余表租户加固（第二批复盘）：versions/workflows/approvals/approval_records
-- 背景：instances/tasks 上一轮已 FORCE RLS；本批复盘发现：
--   - core_workflow_versions 无 tenant_id 列、无 RLS，版本 INSERT 未绑定租户 → 版本历史跨租户可见
--   - core_workflows 有 tenant_id 列（创建已绑定）但 RLS 未启用
--   - approvals / approval_records 有 tenant_id 列但 RLS 未启用（只读表，防御性加固）
-- 对齐 pm/instances 标准：补列 + 写绑定（代码侧 create_workflow_version）+ 统一策略 + ENABLE/FORCE RLS。
-- 幂等：可重复执行。

-- 1) versions 补 tenant_id 列
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 2) 统一标准策略（nil/空/零值放行 + 租户匹配 + 存量 NULL 行放行）
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_workflows;
DROP POLICY IF EXISTS core_workflows_tenant_policy ON public.core_workflows;
CREATE POLICY rls_tenant_isolation ON public.core_workflows FOR ALL USING (
  (current_setting('app.tenant_id', true) IS NULL) OR (current_setting('app.tenant_id', true) = '') OR
  (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
  (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_workflow_versions;
DROP POLICY IF EXISTS core_workflow_versions_tenant_policy ON public.core_workflow_versions;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_versions FOR ALL USING (
  (current_setting('app.tenant_id', true) IS NULL) OR (current_setting('app.tenant_id', true) = '') OR
  (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
  (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

DROP POLICY IF EXISTS rls_tenant_isolation ON public.approvals;
DROP POLICY IF EXISTS approvals_tenant_policy ON public.approvals;
CREATE POLICY rls_tenant_isolation ON public.approvals FOR ALL USING (
  (current_setting('app.tenant_id', true) IS NULL) OR (current_setting('app.tenant_id', true) = '') OR
  (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
  (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

DROP POLICY IF EXISTS rls_tenant_isolation ON public.approval_records;
DROP POLICY IF EXISTS approval_records_tenant_policy ON public.approval_records;
CREATE POLICY rls_tenant_isolation ON public.approval_records FOR ALL USING (
  (current_setting('app.tenant_id', true) IS NULL) OR (current_setting('app.tenant_id', true) = '') OR
  (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
  (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
);

-- 3) ENABLE + FORCE（owner 也受约束）
ALTER TABLE public.core_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_workflow_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records FORCE ROW LEVEL SECURITY;
