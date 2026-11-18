-- =============================================================================
-- 20261119000002 — public.core_file_permissions / public.monitor_thresholds 严格 RLS（草案 C）
-- =============================================================================
-- 背景：批 0 迁移 20261118150000 的前置断言要求这两张表「0 策略」，而线上已是
--       rls_tenant_isolation 严格策略，直接从零重放会在断言处中止。这里用幂等写法
--       单独兜住这两张表，契约与生产逐字一致（系统通道 GUC + 租户等值，fail-closed）。
-- 生产只读复核（2026-11-19）：两表均 0 行，rls=true、force=true，策略 1 条，
--   USING/WITH CHECK 均为：
--   ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
--    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
-- 幂等：DROP POLICY IF EXISTS + CREATE；ENABLE/FORCE 可重复执行。
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.core_file_permissions') IS NULL THEN
    RAISE EXCEPTION '前置断言失败：public.core_file_permissions 不存在';
  END IF;
  IF to_regclass('public.monitor_thresholds') IS NULL THEN
    RAISE EXCEPTION '前置断言失败：public.monitor_thresholds 不存在';
  END IF;
END $$;

ALTER TABLE public.core_file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_file_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_file_permissions;
CREATE POLICY rls_tenant_isolation ON public.core_file_permissions
  FOR ALL TO public
  USING (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  )
  WITH CHECK (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  );
CREATE INDEX IF NOT EXISTS idx_core_file_permissions_tenant_id
  ON public.core_file_permissions USING btree (tenant_id);

ALTER TABLE public.monitor_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_thresholds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON public.monitor_thresholds;
CREATE POLICY rls_tenant_isolation ON public.monitor_thresholds
  FOR ALL TO public
  USING (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  )
  WITH CHECK (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  );
CREATE INDEX IF NOT EXISTS idx_monitor_thresholds_tenant
  ON public.monitor_thresholds USING btree (tenant_id);
