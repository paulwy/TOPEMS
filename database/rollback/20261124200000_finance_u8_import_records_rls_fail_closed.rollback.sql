-- 回滚：20261124200000_finance_u8_import_records_rls_fail_closed.sql
-- 动作：恢复 rls_tenant_isolation 的原表达式（与 20261119190000 / 20261119230000 一致）。
-- 注意：该原表达式为 fail-open 形态，仅用于精确回退，不得作为新环境默认。

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $rb$
DECLARE
  v_expr constant text := $expr$((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))$expr$;
BEGIN
  IF to_regclass('finance.finance_u8_import_records') IS NULL THEN
    RAISE NOTICE 'skip: finance.finance_u8_import_records 不存在';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
     WHERE p.polrelid = 'finance.finance_u8_import_records'::regclass
       AND p.polname = 'rls_tenant_isolation'
  ) THEN
    RAISE NOTICE 'skip: rls_tenant_isolation 不存在';
    RETURN;
  END IF;
  EXECUTE format(
    'ALTER POLICY rls_tenant_isolation ON finance.finance_u8_import_records USING (%s) WITH CHECK (%s)',
    v_expr, v_expr
  );
END
$rb$;
