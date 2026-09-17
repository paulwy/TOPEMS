-- ============================================================================
-- RLS 缺口补齐（2026-09-17）
-- 扫描：有 tenant_id 列但未启用 RLS 的业务表（全库仅 6 张）：
--   crm.crm_master_data_refs / hrm.hrm_master_data_refs / scm.scm_master_data_refs
--   scm.sync_records / mes.work_reports / wms.labor_shifts
-- 策略模板与既有表一致：rls_tenant_isolation + tenant_isolation_<表>（USING/WITH CHECK 双策略，
-- 容忍 app.tenant_id 为空 / 系统租户 00000000-...-000000000000 / tenant_id 为空）。
-- 幂等：仅当表未启用 RLS 时执行，可安全重放。
-- ============================================================================

DO $$
DECLARE
  t RECORD;
  using_qual TEXT := '(current_setting(''app.tenant_id'', true) IS NULL) OR (current_setting(''app.tenant_id'', true) = '''') OR (current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000'') OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid)';
  using_qual2 TEXT := '((tenant_id)::text = NULLIF(current_setting(''app.tenant_id'', true), '''')) OR (tenant_id IS NULL) OR (COALESCE(current_setting(''app.tenant_id'', true), '''') = ''00000000-0000-0000-0000-000000000000'')';
BEGIN
  FOR t IN
    SELECT n.nspname AS sch, c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'tenant_id')
      AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'public', 'shared', 'rs')
    ORDER BY n.nspname, c.relname
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.sch, t.tbl);
    EXECUTE format(
      'CREATE POLICY rls_tenant_isolation ON %I.%I USING (%s) WITH CHECK (%s)',
      t.sch, t.tbl, using_qual, using_qual
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%s ON %I.%I USING (%s) WITH CHECK (%s)',
      t.tbl, t.sch, t.tbl, using_qual2, using_qual2
    );
    RAISE NOTICE 'RLS enabled: %.%', t.sch, t.tbl;
  END LOOP;
END $$;
