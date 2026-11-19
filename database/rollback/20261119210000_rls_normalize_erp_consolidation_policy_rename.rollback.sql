-- 回滚：20261119210000_rls_normalize_erp_consolidation_policy_rename.sql
-- 动作：把 8 张 erp 合并报表表的 rls_tenant_isolation 改回各自遗留名。
--       表达式在正向迁移中未被修改，因此回滚只改名，不触碰 USING / WITH CHECK。
-- 前置：每表恰好 1 条 rls_tenant_isolation、表达式等于严格 B、已 FORCE。
-- 后置：每表恰好 1 条原遗留名策略、表达式仍等于严格 B、FORCE 未变。
-- 事务：文件内不含 BEGIN/COMMIT，由回滚执行器包裹。

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

DO $pre$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_n int;
  v_name text;
  v_q text;
  v_c text;
  v_forced boolean;
  v_strict constant text := '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
  v_targets text[] := ARRAY[
    'erp|company_relations',
    'erp|consolidation_report_lines',
    'erp|consolidation_reports',
    'erp|consolidation_scope_companies',
    'erp|consolidation_scopes',
    'erp|elimination_candidates',
    'erp|elimination_rules',
    'erp|internal_transactions'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      RAISE EXCEPTION 'batch4 rollback precheck: %.% 不存在', v_schema, v_table;
    END IF;

    SELECT count(*), max(p.polname), max(pg_get_expr(p.polqual, p.polrelid)),
           max(pg_get_expr(p.polwithcheck, p.polrelid)), bool_and(c.relforcerowsecurity)
      INTO v_n, v_name, v_q, v_c, v_forced
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table;

    IF v_n <> 1 OR v_name <> 'rls_tenant_isolation' THEN
      RAISE EXCEPTION 'batch4 rollback precheck: %.% 期望 1 条 rls_tenant_isolation，实际 % 条 / %',
        v_schema, v_table, v_n, v_name;
    END IF;
    IF v_q IS DISTINCT FROM v_strict OR v_c IS DISTINCT FROM v_strict THEN
      RAISE EXCEPTION 'batch4 rollback precheck: %.% 表达式不等于严格 B，拒绝回滚（using=%, check=%）',
        v_schema, v_table, v_q, v_c;
    END IF;
    IF NOT v_forced THEN
      RAISE EXCEPTION 'batch4 rollback precheck: %.% 未 FORCE RLS', v_schema, v_table;
    END IF;
  END LOOP;
END $pre$;

DO $body$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_targets text[] := ARRAY[
    'erp|company_relations|tenant_isolation_company_relations',
    'erp|consolidation_report_lines|tenant_isolation_consolidation_report_lines',
    'erp|consolidation_reports|tenant_isolation_consolidation_reports',
    'erp|consolidation_scope_companies|tenant_isolation_consolidation_scope_companies',
    'erp|consolidation_scopes|tenant_isolation_consolidation_scopes',
    'erp|elimination_candidates|tenant_isolation_elimination_candidates',
    'erp|elimination_rules|tenant_isolation_elimination_rules',
    'erp|internal_transactions|tenant_isolation_internal_transactions'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);

    EXECUTE format('ALTER POLICY rls_tenant_isolation ON %I.%I RENAME TO %I',
                   v_schema, v_table, v_legacy);
  END LOOP;
  RAISE NOTICE 'batch4 rollback: 已恢复 % 张表的遗留策略名', array_length(v_targets, 1);
END $body$;

DO $post$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_n int;
  v_name text;
  v_targets text[] := ARRAY[
    'erp|company_relations|tenant_isolation_company_relations',
    'erp|consolidation_report_lines|tenant_isolation_consolidation_report_lines',
    'erp|consolidation_reports|tenant_isolation_consolidation_reports',
    'erp|consolidation_scope_companies|tenant_isolation_consolidation_scope_companies',
    'erp|consolidation_scopes|tenant_isolation_consolidation_scopes',
    'erp|elimination_candidates|tenant_isolation_elimination_candidates',
    'erp|elimination_rules|tenant_isolation_elimination_rules',
    'erp|internal_transactions|tenant_isolation_internal_transactions'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);

    SELECT count(*), max(p.polname) INTO v_n, v_name
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table;

    IF v_n <> 1 OR v_name <> v_legacy THEN
      RAISE EXCEPTION 'batch4 rollback postcheck: %.% 期望 1 条 %，实际 % 条 / %',
        v_schema, v_table, v_legacy, v_n, v_name;
    END IF;
  END LOOP;
END $post$;
