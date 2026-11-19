-- 2026-11-19 RLS 归一 · 批 5：finance.finance_u8_import_records 同义策略去重
-- 背景：docs/database/rls-policy-name-drift-executable-list-2026-11-19.md §4.3 单列待办。
--   20261119190000 为对齐 dev 建表时，同时创建了两条 PERMISSIVE 策略：
--     rls_tenant_isolation                  （规范名，保留）
--     tenant_isolation_finance_u8_import_records（遗留名，删除）
--   实测（生产只读口径快照 database/rls_policy_expected.json）：两条 cmd=ALL、PERMISSIVE、
--   roles=PUBLIC，polqual 与 polwithcheck 逐字相同，均为「tenant 未设置 / 空串 / 全零 / tenant_id 为空 /
--   租户匹配」的宽松表达式；表 ENABLE + FORCE RLS。PERMISSIVE 策略之间是 OR 关系，删除重复项
--   不改变任何行的可见性，也不收紧/放宽写入。
-- 范围：只删多余那条；保留 `rls_tenant_isolation`；两条表达式均不改动。
-- 前置：表存在、恰好 2 条策略且名称/命令/角色/表达式/FORCE 全部匹配预期。
-- 后置：只剩 1 条 rls_tenant_isolation，表达式逐字未变，ENABLE/FORCE 未变。
-- 事务：文件内不含 BEGIN/COMMIT，由 apply-forward.sh 包裹。
-- 回滚：database/rollback/20261119230000_rls_dedupe_finance_u8_import_records_policy.rollback.sql

-- 须含 public：apply-forward.sh 在同一会话/事务内紧跟 INSERT INTO _sqlx_migrations（非 schema 限定）
SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';
SET statement_timeout = '300s';

DO $pre$
DECLARE
  v_n int;
  v_enabled boolean;
  v_forced boolean;
  v_bad int;
  v_expr constant text := $expr$((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))$expr$;
BEGIN
  IF to_regclass('finance.finance_u8_import_records') IS NULL THEN
    RAISE EXCEPTION 'batch5 precheck: finance.finance_u8_import_records 不存在';
  END IF;

  SELECT count(*), bool_and(c.relrowsecurity), bool_and(c.relforcerowsecurity)
    INTO v_n, v_enabled, v_forced
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
   WHERE p.polrelid = 'finance.finance_u8_import_records'::regclass;

  IF v_n <> 2 THEN
    RAISE EXCEPTION 'batch5 precheck: 期望恰好 2 条策略，实际 %', v_n;
  END IF;
  IF NOT v_enabled OR NOT v_forced THEN
    RAISE EXCEPTION 'batch5 precheck: ENABLE=% / FORCE=%（期望均为 true）', v_enabled, v_forced;
  END IF;

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
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'batch5 precheck: % 条策略的名称/命令/角色/表达式与预期不符，拒绝按同义处理', v_bad;
  END IF;

  RAISE NOTICE 'batch5 precheck: 两条策略逐字同义（ALL / PERMISSIVE / PUBLIC / 同表达式），可安全去重';
END $pre$;

DROP POLICY tenant_isolation_finance_u8_import_records
  ON finance.finance_u8_import_records;

DO $post$
DECLARE
  v_n int;
  v_name text;
  v_enabled boolean;
  v_forced boolean;
  v_q text;
  v_c text;
  v_expr constant text := $expr$((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))$expr$;
BEGIN
  SELECT count(*), max(p.polname), bool_and(c.relrowsecurity), bool_and(c.relforcerowsecurity),
         max(pg_get_expr(p.polqual, p.polrelid)), max(pg_get_expr(p.polwithcheck, p.polrelid))
    INTO v_n, v_name, v_enabled, v_forced, v_q, v_c
    FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
   WHERE p.polrelid = 'finance.finance_u8_import_records'::regclass;

  IF v_n <> 1 OR v_name <> 'rls_tenant_isolation' THEN
    RAISE EXCEPTION 'batch5 postcheck: 期望只剩 1 条 rls_tenant_isolation，实际 % 条 / %', v_n, v_name;
  END IF;
  IF v_q IS DISTINCT FROM v_expr OR v_c IS DISTINCT FROM v_expr THEN
    RAISE EXCEPTION 'batch5 postcheck: 保留策略表达式发生变化（using=%, check=%）', v_q, v_c;
  END IF;
  IF NOT v_enabled OR NOT v_forced THEN
    RAISE EXCEPTION 'batch5 postcheck: ENABLE=% / FORCE=%（期望均为 true）', v_enabled, v_forced;
  END IF;
  RAISE NOTICE 'batch5 postcheck: 去重完成，保留策略表达式未变';
END $post$;
