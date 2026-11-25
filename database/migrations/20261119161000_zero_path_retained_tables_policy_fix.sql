-- 20261119161000_zero_path_retained_tables_policy_fix
-- 范围：27 张零运行期路径表中确认保留的 3 张，消除「保留 + 全放行 + 不解释」。
--   1) core.core_tenant_plugins   遗留壳（权威表 iam.core_tenant_plugins），无 tenant_id、无运行期路径 → 仅系统通道
--   2) portal.user_preferences    portal 预留表（设置实际走 IAM → core.user_preferences），无 tenant_id、无 SQL 路径 → 仅系统通道
--   3) iam.roles                  全局角色字典（iam.users / iam.position_roles 外键 + seeds/default_roles.sql），无租户维度
--                                → 全局只读 + 写仅系统通道
-- 依据：docs/database/zero-path-tables-disposition-2026-11-19.md
-- 回滚：database/rollback/20261119161000_zero_path_retained_tables_policy_fix.rollback.sql
-- 事务：由 scripts/migration/apply-forward.sh 以单事务执行，本文件不含 BEGIN/COMMIT。
SET LOCAL search_path = public;
SET LOCAL statement_timeout = '300s';

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS archive._rls_policy_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  polname text NOT NULL,
  permissive text NOT NULL,
  cmd text NOT NULL,
  roles text[] NOT NULL,
  qual text,
  with_check text,
  PRIMARY KEY (migration_version, schema_name, table_name, polname)
);

-- 1) 前置：快照原策略 + 清空 + ENABLE/FORCE
DO $fix$
DECLARE
  r record; pol record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core', 'core_tenant_plugins'),
    ('portal', 'user_preferences'),
    ('iam', 'roles')
  ) AS x(sch, tbl)
  LOOP
    IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing %.%', r.sch, r.tbl;
      CONTINUE;
    END IF;

    INSERT INTO archive._rls_policy_snapshot
      (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
    SELECT '20261119161000', 'zero-path-retained', r.sch, r.tbl, p.polname,
           CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
           CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
                         WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
           CASE WHEN 0 = ANY(p.polroles) THEN ARRAY['PUBLIC']
                ELSE ARRAY(SELECT pg_get_userbyid(x) FROM unnest(p.polroles) x) END,
           pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = r.sch AND tablename = r.tbl
    LOOP
      EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, r.sch, r.tbl);
    END LOOP;

    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);
  END LOOP;
END
$fix$;

-- 2) 策略：仅系统通道 / 全局只读 + 系统写
DO $policies$
BEGIN
  IF to_regclass('core.core_tenant_plugins') IS NOT NULL THEN
    CREATE POLICY rls_system_only ON core.core_tenant_plugins
      FOR ALL
      USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
      WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
  END IF;

  IF to_regclass('portal.user_preferences') IS NOT NULL THEN
    CREATE POLICY rls_system_only ON portal.user_preferences
      FOR ALL
      USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
      WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
  END IF;

  IF to_regclass('iam.roles') IS NOT NULL THEN
    -- 全局角色字典：租户隔离不适用；读全开，写只走系统通道（种子/后台）
    CREATE POLICY rls_global_read ON iam.roles
      FOR SELECT
      USING (true);
    CREATE POLICY rls_system_write ON iam.roles
      FOR ALL
      USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
      WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
  END IF;
END
$policies$;

-- 3) 后置断言：策略集合精确匹配，RLS/FORCE 开启
DO $post$
DECLARE
  n_pol int;
  v_qual text;
BEGIN
  IF to_regclass('core.core_tenant_plugins') IS NOT NULL THEN
    SELECT count(*) INTO n_pol FROM pg_policies
    WHERE schemaname = 'core' AND tablename = 'core_tenant_plugins';
    IF n_pol <> 1 THEN
      RAISE EXCEPTION 'post-check failed: core.core_tenant_plugins policy count = % (expect 1)', n_pol;
    END IF;
    SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname = 'core' AND tablename = 'core_tenant_plugins' AND policyname = 'rls_system_only';
    IF v_qual IS NULL OR v_qual NOT LIKE '%rls_system%' THEN
      RAISE EXCEPTION 'post-check failed: core.core_tenant_plugins rls_system_only definition mismatch';
    END IF;
    IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'core.core_tenant_plugins'::regclass) THEN
      RAISE EXCEPTION 'post-check failed: core.core_tenant_plugins RLS/FORCE off';
    END IF;
  END IF;

  IF to_regclass('portal.user_preferences') IS NOT NULL THEN
    SELECT count(*) INTO n_pol FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'user_preferences';
    IF n_pol <> 1 THEN
      RAISE EXCEPTION 'post-check failed: portal.user_preferences policy count = % (expect 1)', n_pol;
    END IF;
    SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'user_preferences' AND policyname = 'rls_system_only';
    IF v_qual IS NULL OR v_qual NOT LIKE '%rls_system%' THEN
      RAISE EXCEPTION 'post-check failed: portal.user_preferences rls_system_only definition mismatch';
    END IF;
    IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'portal.user_preferences'::regclass) THEN
      RAISE EXCEPTION 'post-check failed: portal.user_preferences RLS/FORCE off';
    END IF;
  END IF;

  IF to_regclass('iam.roles') IS NOT NULL THEN
    SELECT count(*) INTO n_pol FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'roles';
    IF n_pol <> 2 THEN
      RAISE EXCEPTION 'post-check failed: iam.roles policy count = % (expect 2)', n_pol;
    END IF;
    SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'roles' AND policyname = 'rls_global_read';
    IF v_qual IS NULL OR v_qual NOT LIKE '%true%' THEN
      RAISE EXCEPTION 'post-check failed: iam.roles rls_global_read definition mismatch';
    END IF;
    SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'roles' AND policyname = 'rls_system_write';
    IF v_qual IS NULL OR v_qual NOT LIKE '%rls_system%' THEN
      RAISE EXCEPTION 'post-check failed: iam.roles rls_system_write definition mismatch';
    END IF;
    IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'iam.roles'::regclass) THEN
      RAISE EXCEPTION 'post-check failed: iam.roles RLS/FORCE off';
    END IF;
  END IF;

  RAISE NOTICE 'retained zero-path tables policy fix complete';
END
$post$;
