-- 回滚：20261119230000_rls_dedupe_finance_u8_import_records_policy.sql
-- 动作：只重建被删的 tenant_isolation_finance_u8_import_records（与保留策略同义），
--       不动 rls_tenant_isolation 及其表达式。
-- 前置：恰好 1 条 rls_tenant_isolation、表达式逐字等于预期、ENABLE + FORCE。
-- 后置：恰好 2 条策略，名称与表达式均与删除前一致。
-- 事务：文件内不含 BEGIN/COMMIT，由回滚执行器包裹。

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $pre$
DECLARE
  v_n int;
  v_name text;
  v_enabled boolean;
  v_forced boolean;
  v_q text;
  v_c text;
  v_expr constant text := $expr$((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))$expr$;
BEGIN
  IF to_regclass('finance.finance_u8_import_records') IS NULL THEN
    RAISE EXCEPTION 'batch5 rollback precheck: 表不存在';
  END IF;

  SELECT count(*), max(p.polname), bool_and(c.relrowsecurity), bool_and(c.relforcerowsecurity),
         max(pg_get_expr(p.polqual, p.polrelid)), max(pg_get_expr(p.polwithcheck, p.polrelid))
    INTO v_n, v_name, v_enabled, v_forced, v_q, v_c
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
   WHERE p.polrelid = 'finance.finance_u8_import_records'::regclass;

  IF v_n <> 1 OR v_name <> 'rls_tenant_isolation' THEN
    RAISE EXCEPTION 'batch5 rollback precheck: 期望 1 条 rls_tenant_isolation，实际 % 条 / %', v_n, v_name;
  END IF;
  IF v_q IS DISTINCT FROM v_expr OR v_c IS DISTINCT FROM v_expr THEN
    RAISE EXCEPTION 'batch5 rollback precheck: 保留策略表达式与预期不符，拒绝回滚（using=%, check=%）', v_q, v_c;
  END IF;
  IF NOT v_enabled OR NOT v_forced THEN
    RAISE EXCEPTION 'batch5 rollback precheck: ENABLE=% / FORCE=%（期望均为 true）', v_enabled, v_forced;
  END IF;
END $pre$;

CREATE POLICY tenant_isolation_finance_u8_import_records
  ON finance.finance_u8_import_records
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
  WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DO $post$
DECLARE
  v_n int;
  v_bad int;
  v_expr constant text := $expr$((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))$expr$;
BEGIN
  SELECT count(*) INTO v_n
    FROM pg_policy WHERE polrelid = 'finance.finance_u8_import_records'::regclass;

  SELECT count(*) INTO v_bad
    FROM pg_policy p
   WHERE p.polrelid = 'finance.finance_u8_import_records'::regclass
     AND NOT (
          p.polname IN ('rls_tenant_isolation', 'tenant_isolation_finance_u8_import_records')
      AND p.polcmd = '*'
      AND p.polpermissive
      AND p.polroles = ARRAY[0]::oid[]
      AND pg_get_expr(p.polqual, p.polrelid) = v_expr
      AND pg_get_expr(p.polwithcheck, p.polrelid) = v_expr);

  IF v_n <> 2 OR v_bad <> 0 THEN
    RAISE EXCEPTION 'batch5 rollback postcheck: 期望 2 条同义策略，实际 % 条（异常 % 条）', v_n, v_bad;
  END IF;
END $post$;
