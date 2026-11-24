-- 2026-11-24：finance.finance_u8_import_records 租户策略 fail-closed 加固
-- 背景：20261119190000 建表时策略含“tenant_id 未设置/空串即放行”的 fail-open 分支，
--       20261119230000 去重后保留的 rls_tenant_isolation 仍沿用该表达式。
-- 动作：将保留策略的 USING / WITH CHECK 统一收紧为 tenant_id = NULLIF(current_setting(...), '')::uuid；
--       未设置或空串时比较结果为 NULL，策略不放行任何行。
-- 幂等：策略已存在则 ALTER；不存在则 CREATE；表不存在则跳过。
-- 事务：文件内不含 BEGIN/COMMIT，由迁移执行器包裹。

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $mig$
DECLARE
  v_expr constant text := $expr$(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)$expr$;
BEGIN
  IF to_regclass('finance.finance_u8_import_records') IS NULL THEN
    RAISE NOTICE 'skip: finance.finance_u8_import_records 不存在';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
     WHERE p.polrelid = 'finance.finance_u8_import_records'::regclass
       AND p.polname = 'rls_tenant_isolation'
  ) THEN
    EXECUTE format(
      'ALTER POLICY rls_tenant_isolation ON finance.finance_u8_import_records USING (%s) WITH CHECK (%s)',
      v_expr, v_expr
    );
  ELSE
    EXECUTE format(
      'CREATE POLICY rls_tenant_isolation ON finance.finance_u8_import_records USING (%s) WITH CHECK (%s)',
      v_expr, v_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
     WHERE c.oid = 'finance.finance_u8_import_records'::regclass
       AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'fail-closed: finance.finance_u8_import_records 未同时 ENABLE + FORCE RLS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policy p
     WHERE p.polrelid = 'finance.finance_u8_import_records'::regclass
       AND (pg_get_expr(p.polqual, p.polrelid) LIKE '%current_setting%=''''%'
            OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%current_setting%=''''%')
  ) THEN
    RAISE EXCEPTION 'fail-closed 断言失败：仍存在空租户豁免分支';
  END IF;
END
$mig$;
