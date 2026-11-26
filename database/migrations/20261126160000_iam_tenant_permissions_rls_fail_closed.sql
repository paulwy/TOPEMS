-- 2026-11-26：iam.tenant_permissions 租户策略 fail-closed 加固
-- 背景：20261125160000 建表时策略含“tenant_id 未设置/空串/零租户即放行”的 fail-open 分支，
--       且只 ENABLE RLS 没有 FORCE，表 owner 可全量绕过。
-- 动作：策略统一收紧为显式系统通道（app.rls_system='on'）或 tenant_id 精确匹配；
--       未设置/空串时比较结果为 NULL，不放行任何行；同时补 FORCE ROW LEVEL SECURITY。
-- 幂等：表不存在则跳过；策略已存在则 ALTER，不存在则 CREATE。
-- 事务：文件内不含 BEGIN/COMMIT，由迁移执行器包裹。

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $mig$
DECLARE
  v_expr constant text := $expr$(
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)
  )$expr$;
BEGIN
  IF to_regclass('iam.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'skip: iam.tenant_permissions 不存在';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE iam.tenant_permissions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE iam.tenant_permissions FORCE ROW LEVEL SECURITY';

  IF EXISTS (
    SELECT 1 FROM pg_policy p
     WHERE p.polrelid = 'iam.tenant_permissions'::regclass
       AND p.polname = 'tenant_isolation_tenant_permissions'
  ) THEN
    EXECUTE format(
      'ALTER POLICY tenant_isolation_tenant_permissions ON iam.tenant_permissions USING (%s) WITH CHECK (%s)',
      v_expr, v_expr
    );
  ELSE
    EXECUTE format(
      'CREATE POLICY tenant_isolation_tenant_permissions ON iam.tenant_permissions USING (%s) WITH CHECK (%s)',
      v_expr, v_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
     WHERE c.oid = 'iam.tenant_permissions'::regclass
       AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'fail-closed: iam.tenant_permissions 未同时 ENABLE + FORCE RLS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policy p
     WHERE p.polrelid = 'iam.tenant_permissions'::regclass
       AND p.polname = 'tenant_isolation_tenant_permissions'
       AND (pg_get_expr(p.polqual, p.polrelid) LIKE '%tenant_id IS NULL%'
            OR pg_get_expr(p.polqual, p.polrelid) LIKE '%current_setting%IS NULL%'
            OR pg_get_expr(p.polqual, p.polrelid) LIKE '%00000000-0000-0000-0000-000000000000%')
  ) THEN
    RAISE EXCEPTION 'fail-closed 断言失败：策略仍含空租户/未设置豁免分支';
  END IF;
END
$mig$;
