-- 2026-11-19 RLS 归一 · 批 4：8 张 erp 合并报表表策略改名（不等价集合中唯一的等价子集）
-- 背景：docs/database/rls-policy-name-drift-executable-list-2026-11-19.md §4 把这 8 张表列为
--   「语义不同（erp.group_tenant_of）」并排除在批 2 之外。实测核对（生产 2026-11-18 只读口径
--   快照 database/rls_policy_expected.json）：这 8 张表各只有 1 条策略，名称 tenant_isolation_<table>，
--   cmd=ALL / PERMISSIVE / roles=PUBLIC，polqual 与 polwithcheck 逐字等于严格 B；
--   erp.group_tenant_of 只出现在业务 INSERT 的列值里，全库策略表达式中命中 0 次。
--   因此这 8 张是纯策略名漂移，可机械归一；文档 §4 对其「语义不同」的判断据此更正。
-- 范围：erp.company_relations、erp.consolidation_report_lines、erp.consolidation_reports、
--   erp.consolidation_scope_companies、erp.consolidation_scopes、erp.elimination_candidates、
--   erp.elimination_rules、erp.internal_transactions。
-- 非范围（只出方案，不进本迁移）：erp.event_idempotency（无系统通道，现存更严）、
--   public.core_login_logs / core_refresh_tokens / core_sessions（系统/会话通道）、
--   iam.roles（global_read + system_write）、3 张 allow_all（bi.audit_logs / erp.core_erp_materials /
--   gis.track_positions）、9 张 rls_platform_read / rls_global_read 双策略表。
-- 动作：ALTER POLICY <legacy> ON ... RENAME TO rls_tenant_isolation。表达式不改（前置断言已证明逐字相等）。
-- 前置：表存在、恰好 1 条策略、名称匹配、cmd=ALL、PERMISSIVE、roles=PUBLIC、qual/check 等于严格 B、已 FORCE。
-- 后置：8 张表各恰好 1 条 rls_tenant_isolation，qual/check 仍等于严格 B，FORCE 未变。
-- 事务：文件内不含 BEGIN/COMMIT，由 apply-forward.sh 包裹。
-- 回滚：database/rollback/20261119210000_rls_normalize_erp_consolidation_policy_rename.rollback.sql

-- 须含 public：apply-forward.sh 在同一会话/事务内紧跟 INSERT INTO _sqlx_migrations（非 schema 限定）
SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';
SET statement_timeout = '300s';

DO $pre$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_n int;
  v_name text;
  v_cmd "char";
  v_perm boolean;
  v_roles_ok boolean;
  v_q text;
  v_c text;
  v_forced boolean;
  v_strict constant text := '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
  v_total int := 8;
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

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      RAISE EXCEPTION 'batch4 precheck: %.% 不存在；拒绝静默跳过', v_schema, v_table;
    END IF;

    SELECT count(*), max(p.polname), max(p.polcmd), bool_and(p.polpermissive),
           bool_and(p.polroles = ARRAY[0]::oid[]), max(pg_get_expr(p.polqual, p.polrelid)),
           max(pg_get_expr(p.polwithcheck, p.polrelid)), bool_and(c.relforcerowsecurity)
      INTO v_n, v_name, v_cmd, v_perm, v_roles_ok, v_q, v_c, v_forced
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table;

    IF v_n <> 1 THEN
      RAISE EXCEPTION 'batch4 precheck: %.% 期望 1 条策略，实际 %', v_schema, v_table, v_n;
    END IF;
    IF v_name <> v_legacy THEN
      RAISE EXCEPTION 'batch4 precheck: %.% 策略名期望 %，实际 %', v_schema, v_table, v_legacy, v_name;
    END IF;
    IF v_cmd <> '*' OR NOT v_perm OR NOT v_roles_ok THEN
      RAISE EXCEPTION 'batch4 precheck: %.% 策略不是 ALL/PERMISSIVE/PUBLIC（cmd=%, perm=%, roles_ok=%）',
        v_schema, v_table, v_cmd, v_perm, v_roles_ok;
    END IF;
    IF v_q IS DISTINCT FROM v_strict OR v_c IS DISTINCT FROM v_strict THEN
      RAISE EXCEPTION 'batch4 precheck: %.% 表达式不等于严格 B（using=%, check=%）', v_schema, v_table, v_q, v_c;
    END IF;
    IF NOT v_forced THEN
      RAISE EXCEPTION 'batch4 precheck: %.% 未 FORCE RLS', v_schema, v_table;
    END IF;
  END LOOP;
  RAISE NOTICE 'batch4 precheck: % 张表均为「单条 tenant_isolation_* + 严格 B」，可机械改名', v_total;
END $pre$;

DO $body$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_done int := 0;
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

    EXECUTE format('ALTER POLICY %I ON %I.%I RENAME TO rls_tenant_isolation',
                   v_legacy, v_schema, v_table);
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'batch4: 已改名 % 张表', v_done;
END $body$;

DO $post$
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
  v_total int := 8;
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

    SELECT count(*), max(p.polname), max(pg_get_expr(p.polqual, p.polrelid)),
           max(pg_get_expr(p.polwithcheck, p.polrelid)), bool_and(c.relforcerowsecurity)
      INTO v_n, v_name, v_q, v_c, v_forced
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table;

    IF v_n <> 1 OR v_name <> 'rls_tenant_isolation' THEN
      RAISE EXCEPTION 'batch4 postcheck: %.% 期望只剩 1 条 rls_tenant_isolation，实际 % 条 / %',
        v_schema, v_table, v_n, v_name;
    END IF;
    IF v_q IS DISTINCT FROM v_strict OR v_c IS DISTINCT FROM v_strict THEN
      RAISE EXCEPTION 'batch4 postcheck: %.% 表达式发生变化（using=%, check=%）', v_schema, v_table, v_q, v_c;
    END IF;
    IF NOT v_forced THEN
      RAISE EXCEPTION 'batch4 postcheck: %.% 未 FORCE RLS', v_schema, v_table;
    END IF;
  END LOOP;
  RAISE NOTICE 'batch4 postcheck: 已校验 % 张表归一结果', v_total;
END $post$;
