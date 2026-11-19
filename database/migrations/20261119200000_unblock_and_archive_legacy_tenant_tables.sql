-- 20261119200000_unblock_and_archive_legacy_tenant_tables
-- 批次：tenant-unblock-20261119，共 8 张表（3 张目标 + 5 张引用方），先解依赖后归档 DROP。
-- 依据：docs/database/legacy-tenant-tables-unblock-plan-2026-11-19.md（选项 A：收口 public.core_tenants）
-- 口径：
--   0) 状态断言：8 张表存在且 0 行；三目标入向外键精确为 1/1/4；public 权威表存在；
--      除 finance.bootstrap_defaults 外无函数/视图/触发器引用。
--   1) 改引用方：iam.core_tenant_plugins 外键 iam.core_tenants -> public.core_tenants（列与 ON DELETE 不变）。
--   2) 归档并 DROP 5 张引用方：iam.core_user_roles + flow._deprecated_core_tenant_{modules,settings,usage,users}。
--   3) 改写 finance.bootstrap_defaults：只读 public.core_tenants + finance.core_finance_accounts。
--   4) 归档并 DROP 3 张目标表：iam.core_tenants / iam.core_users / flow.core_tenants。
-- 安全闸门：必须显式设置 app.tenant_unblock_archive_gate=tenant-unblock-20261119，否则整条迁移中止。
-- 归档：archive.drop_20261119_ub__<schema>__<table>（结构 + 数据），保留 180 天；本批新增
--       archive._fk_out_snapshot 记录被删表自身的出向外键，供回滚重建。
-- 事务：由 scripts/migration/apply-forward.sh 以单事务执行，本文件不含 BEGIN/COMMIT。
-- 说明：全程显式 schema、不使用 CASCADE；三目标表归档时入向外键已为 0，故本批 _fk_snapshot 预期为空。
SET LOCAL search_path = public;
SET LOCAL statement_timeout = '300s';

CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive._drop_manifest (
  migration_version text NOT NULL,
  batch text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  archive_table text NOT NULL,
  row_count bigint NOT NULL,
  relrowsecurity boolean NOT NULL,
  relforcerowsecurity boolean NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL,
  PRIMARY KEY (migration_version, schema_name, table_name)
);

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

CREATE TABLE IF NOT EXISTS archive._fk_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  conname text NOT NULL,
  src_schema text NOT NULL,
  src_table text NOT NULL,
  tgt_schema text NOT NULL,
  tgt_table text NOT NULL,
  condef text NOT NULL,
  PRIMARY KEY (migration_version, conname, src_schema, src_table)
);

CREATE TABLE IF NOT EXISTS archive._fk_out_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  conname text NOT NULL,
  src_schema text NOT NULL,
  src_table text NOT NULL,
  tgt_schema text NOT NULL,
  tgt_table text NOT NULL,
  condef text NOT NULL,
  PRIMARY KEY (migration_version, conname, src_schema, src_table)
);

CREATE TABLE IF NOT EXISTS archive._view_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  view_schema text NOT NULL,
  view_name text NOT NULL,
  object_kind char NOT NULL,
  view_def text NOT NULL,
  PRIMARY KEY (migration_version, view_schema, view_name)
);

CREATE TABLE IF NOT EXISTS archive._column_defaults (
  migration_version text NOT NULL,
  batch text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  column_name text NOT NULL,
  default_expr text NOT NULL,
  PRIMARY KEY (migration_version, schema_name, table_name, column_name)
);

CREATE TABLE IF NOT EXISTS archive._sequence_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  seq_schema text NOT NULL,
  seq_name text NOT NULL,
  owned_schema text NOT NULL,
  owned_table text NOT NULL,
  owned_column text NOT NULL,
  data_type text NOT NULL,
  start_value bigint NOT NULL,
  increment_by bigint NOT NULL,
  min_value bigint NOT NULL,
  max_value bigint NOT NULL,
  cache_size bigint NOT NULL,
  is_cycle boolean NOT NULL,
  last_value bigint,
  PRIMARY KEY (migration_version, seq_schema, seq_name)
);

-- 0) 状态断言：任何一条不符即整笔回滚
DO $precheck$
DECLARE
  r record;
  n_rows bigint;
  n_in bigint;
  n_bad bigint;
BEGIN
  IF coalesce(current_setting('app.tenant_unblock_archive_gate', true), '') <> 'tenant-unblock-20261119' THEN
    RAISE EXCEPTION 'gate closed: set app.tenant_unblock_archive_gate=tenant-unblock-20261119';
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('iam', 'core_tenants'),
    ('iam', 'core_users'),
    ('iam', 'core_user_roles'),
    ('flow', 'core_tenants'),
    ('flow', '_deprecated_core_tenant_modules'),
    ('flow', '_deprecated_core_tenant_settings'),
    ('flow', '_deprecated_core_tenant_usage'),
    ('flow', '_deprecated_core_tenant_users')
  ) AS x(sch, tbl)
  LOOP
    IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
      RAISE EXCEPTION 'pre-check failed: %.% missing', r.sch, r.tbl;
    END IF;
    EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO n_rows;
    IF n_rows <> 0 THEN
      RAISE EXCEPTION 'pre-check failed: %.% has % rows (expected 0)', r.sch, r.tbl, n_rows;
    END IF;
  END LOOP;

  IF to_regclass('public.core_tenants') IS NULL
     OR to_regclass('public.core_users') IS NULL
     OR to_regclass('public.core_user_roles') IS NULL
     OR to_regclass('public.core_tenant_plugins') IS NULL THEN
    RAISE EXCEPTION 'pre-check failed: public authority tables missing';
  END IF;

  -- iam.core_tenants：入向外键恰好 1 条，来源 iam.core_tenant_plugins
  SELECT count(*) INTO n_in FROM pg_constraint
   WHERE contype = 'f' AND confrelid = to_regclass('iam.core_tenants');
  IF n_in <> 1 OR NOT EXISTS (
      SELECT 1 FROM pg_constraint k
      WHERE k.contype = 'f'
        AND k.conname = 'core_tenant_plugins_tenant_id_fkey'
        AND k.conrelid = to_regclass('iam.core_tenant_plugins')
        AND k.confrelid = to_regclass('iam.core_tenants')) THEN
    RAISE EXCEPTION 'pre-check failed: iam.core_tenants inbound FK set changed (found %)', n_in;
  END IF;

  -- iam.core_users：入向外键恰好 1 条，来源 iam.core_user_roles
  SELECT count(*) INTO n_in FROM pg_constraint
   WHERE contype = 'f' AND confrelid = to_regclass('iam.core_users');
  IF n_in <> 1 OR NOT EXISTS (
      SELECT 1 FROM pg_constraint k
      WHERE k.contype = 'f'
        AND k.conrelid = to_regclass('iam.core_user_roles')
        AND k.confrelid = to_regclass('iam.core_users')) THEN
    RAISE EXCEPTION 'pre-check failed: iam.core_users inbound FK set changed (found %)', n_in;
  END IF;

  -- flow.core_tenants：入向外键恰好 4 条，且全部来自 4 张 _deprecated 副本
  SELECT count(*) INTO n_in FROM pg_constraint
   WHERE contype = 'f' AND confrelid = to_regclass('flow.core_tenants');
  IF n_in <> 4 OR EXISTS (
      SELECT 1
      FROM pg_constraint k
      JOIN pg_class c ON c.oid = k.conrelid
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE k.contype = 'f'
        AND k.confrelid = to_regclass('flow.core_tenants')
        AND NOT (ns.nspname = 'flow' AND c.relname IN (
          '_deprecated_core_tenant_modules', '_deprecated_core_tenant_settings',
          '_deprecated_core_tenant_usage', '_deprecated_core_tenant_users'))) THEN
    RAISE EXCEPTION 'pre-check failed: flow.core_tenants inbound FK set changed (found %)', n_in;
  END IF;

  -- 5 张引用方自身不得有入向外键
  SELECT count(*) INTO n_bad
  FROM pg_constraint k
  JOIN pg_class c ON c.oid = k.confrelid
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE k.contype = 'f'
    AND (ns.nspname, c.relname) IN (
      ('iam', 'core_user_roles'),
      ('flow', '_deprecated_core_tenant_modules'), ('flow', '_deprecated_core_tenant_settings'),
      ('flow', '_deprecated_core_tenant_usage'), ('flow', '_deprecated_core_tenant_users'));
  IF n_bad <> 0 THEN
    RAISE EXCEPTION 'pre-check failed: % inbound foreign key(s) on tables-to-archive', n_bad;
  END IF;

  -- 依赖视图
  IF EXISTS (
    SELECT 1
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class v ON v.oid = rw.ev_class
    JOIN pg_class t ON t.oid = d.refobjid
    JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE v.relkind IN ('v','m') AND v.oid <> t.oid
      AND (tn.nspname, t.relname) IN (
        ('iam', 'core_tenants'), ('iam', 'core_users'), ('iam', 'core_user_roles'),
        ('flow', 'core_tenants'),
        ('flow', '_deprecated_core_tenant_modules'), ('flow', '_deprecated_core_tenant_settings'),
        ('flow', '_deprecated_core_tenant_usage'), ('flow', '_deprecated_core_tenant_users'))) THEN
    RAISE EXCEPTION 'pre-check failed: dependent view found';
  END IF;

  -- 触发器
  IF EXISTS (
    SELECT 1
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT tg.tgisinternal
      AND (n.nspname, c.relname) IN (
        ('iam', 'core_tenants'), ('iam', 'core_users'), ('iam', 'core_user_roles'),
        ('flow', 'core_tenants'),
        ('flow', '_deprecated_core_tenant_modules'), ('flow', '_deprecated_core_tenant_settings'),
        ('flow', '_deprecated_core_tenant_usage'), ('flow', '_deprecated_core_tenant_users'))) THEN
    RAISE EXCEPTION 'pre-check failed: trigger found on legacy tenant table';
  END IF;

  -- 唯一允许的运行期函数依赖：finance.bootstrap_defaults
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults') THEN
    RAISE EXCEPTION 'pre-check failed: finance.bootstrap_defaults missing';
  END IF;
  SELECT count(*) INTO n_bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND (p.prosrc LIKE '%iam.core_tenants%'
      OR p.prosrc LIKE '%flow.core_tenants%'
      OR p.prosrc LIKE '%iam.core_users%')
    AND NOT (n.nspname = 'finance' AND p.proname = 'bootstrap_defaults');
  IF n_bad <> 0 THEN
    RAISE EXCEPTION 'pre-check failed: % other function(s) reference legacy tenant tables', n_bad;
  END IF;

  RAISE NOTICE 'tenant-unblock pre-check passed: 8 tables present and empty';
END
$precheck$;

-- 1) 改引用方：iam.core_tenant_plugins 外键改指 public.core_tenants（列与 ON DELETE 不变）
DO $repoint_fk$
DECLARE
  n_orphan bigint;
  con_def text;
BEGIN
  IF to_regclass('iam.core_tenant_plugins') IS NULL THEN
    RAISE EXCEPTION 'pre-check failed: iam.core_tenant_plugins missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'core_tenant_plugins_tenant_id_fkey'
      AND conrelid = to_regclass('iam.core_tenant_plugins')) THEN
    RAISE EXCEPTION 'pre-check failed: core_tenant_plugins_tenant_id_fkey not found';
  END IF;

  SELECT count(*) INTO n_orphan
  FROM iam.core_tenant_plugins p
  WHERE p.tenant_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.core_tenants t WHERE t.id = p.tenant_id);
  IF n_orphan <> 0 THEN
    RAISE EXCEPTION 'pre-check failed: % plugin row(s) with tenant_id absent from public.core_tenants', n_orphan;
  END IF;

  ALTER TABLE iam.core_tenant_plugins
    DROP CONSTRAINT IF EXISTS core_tenant_plugins_tenant_id_fkey;
  ALTER TABLE iam.core_tenant_plugins
    ADD CONSTRAINT core_tenant_plugins_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id) ON DELETE CASCADE;

  SELECT pg_get_constraintdef(oid) INTO con_def FROM pg_constraint
   WHERE conname = 'core_tenant_plugins_tenant_id_fkey'
     AND conrelid = to_regclass('iam.core_tenant_plugins');
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'core_tenant_plugins_tenant_id_fkey'
        AND conrelid = to_regclass('iam.core_tenant_plugins')
        AND confrelid = to_regclass('public.core_tenants')) THEN
    RAISE EXCEPTION 'post-check failed: plugin FK not repointed (%)', con_def;
  END IF;

  RAISE NOTICE 'repoint ok: iam.core_tenant_plugins -> public.core_tenants';
END
$repoint_fk$;

-- 2) 归档 5 张引用方（先归档后 DROP；出向外键写入 archive._fk_out_snapshot）
DO $archive_refs$
DECLARE
  r record; viewrec record;
  n_src bigint; n_arc bigint; n_ins bigint;
  v_rls boolean; v_force boolean;
  n_in bigint;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('iam', 'core_user_roles', 'drop_20261119_ub__iam__core_user_roles'),
    ('flow', '_deprecated_core_tenant_modules', 'drop_20261119_ub__flow___deprecated_core_tenant_modules'),
    ('flow', '_deprecated_core_tenant_settings', 'drop_20261119_ub__flow___deprecated_core_tenant_settings'),
    ('flow', '_deprecated_core_tenant_usage', 'drop_20261119_ub__flow___deprecated_core_tenant_usage'),
    ('flow', '_deprecated_core_tenant_users', 'drop_20261119_ub__flow___deprecated_core_tenant_users')
  ) AS x(sch, tbl, arc)
  LOOP
    SELECT count(*) INTO n_in FROM pg_constraint k
     WHERE k.contype = 'f' AND k.confrelid = to_regclass(format('%I.%I', r.sch, r.tbl));
    IF n_in <> 0 THEN
      RAISE EXCEPTION 'archive pre-check failed: %.% still has % inbound FK(s)', r.sch, r.tbl, n_in;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO v_rls, v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl;

    INSERT INTO archive._rls_policy_snapshot
      (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
    SELECT '20261119200000', 'tenant-unblock-20261119', r.sch, r.tbl, p.polname,
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

    INSERT INTO archive._fk_snapshot
      (migration_version, batch, conname, src_schema, src_table, tgt_schema, tgt_table, condef)
    SELECT '20261119200000', 'tenant-unblock-20261119', k.conname, sn.nspname, sc.relname,
           tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND tn.nspname = r.sch AND tc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._fk_out_snapshot
      (migration_version, batch, conname, src_schema, src_table, tgt_schema, tgt_table, condef)
    SELECT '20261119200000', 'tenant-unblock-20261119', k.conname, sn.nspname, sc.relname,
           tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND sn.nspname = r.sch AND sc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._view_snapshot
      (migration_version, batch, view_schema, view_name, object_kind, view_def)
    SELECT DISTINCT '20261119200000', 'tenant-unblock-20261119', vn.nspname, v.relname, v.relkind::text,
           pg_get_viewdef(v.oid, true)
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class v ON v.oid = rw.ev_class JOIN pg_namespace vn ON vn.oid = v.relnamespace
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE v.relkind IN ('v','m') AND v.oid <> t.oid AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._column_defaults
      (migration_version, batch, schema_name, table_name, column_name, default_expr)
    SELECT '20261119200000', 'tenant-unblock-20261119', r.sch, r.tbl, a.attname,
           pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._sequence_snapshot
      (migration_version, batch, seq_schema, seq_name, owned_schema, owned_table, owned_column,
       data_type, start_value, increment_by, min_value, max_value, cache_size, is_cycle, last_value)
    SELECT '20261119200000', 'tenant-unblock-20261119', sn.nspname, s.relname, tn.nspname, t.relname, a.attname,
           format_type(q.seqtypid, NULL), q.seqstart, q.seqincrement, q.seqmin, q.seqmax, q.seqcache, q.seqcycle,
           (SELECT ps.last_value FROM pg_sequences ps WHERE ps.schemaname = sn.nspname AND ps.sequencename = s.relname)
    FROM pg_class s
    JOIN pg_namespace sn ON sn.oid = s.relnamespace
    JOIN pg_sequence q ON q.seqrelid = s.oid
    JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'a'
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S' AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    IF to_regclass(format('archive.%I', r.arc)) IS NOT NULL THEN
      RAISE EXCEPTION 'archive table archive.% already exists: refusing to re-run', r.arc;
    END IF;
    EXECUTE format('CREATE TABLE archive.%I (LIKE %I.%I INCLUDING ALL EXCLUDING DEFAULTS)', r.arc, r.sch, r.tbl);
    EXECUTE format('INSERT INTO archive.%I SELECT * FROM %I.%I', r.arc, r.sch, r.tbl);
    GET DIAGNOSTICS n_ins = ROW_COUNT;
    EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO n_src;
    EXECUTE format('SELECT count(*) FROM archive.%I', r.arc) INTO n_arc;
    IF n_src <> n_arc OR n_ins <> n_src THEN
      RAISE EXCEPTION 'archive verification failed for %.%: src=%, arc=%, inserted=%', r.sch, r.tbl, n_src, n_arc, n_ins;
    END IF;

    INSERT INTO archive._drop_manifest
      (migration_version, batch, schema_name, table_name, archive_table, row_count,
       relrowsecurity, relforcerowsecurity, retention_until)
    VALUES ('20261119200000', 'tenant-unblock-20261119', r.sch, r.tbl, r.arc, n_src, v_rls, v_force,
            now() + interval '180 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'archive complete: 5 referencing tables, all 0 rows';
END
$archive_refs$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 遗留租户表解依赖后归档清理：iam.core_user_roles 0 行、无入向引用，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: TENANT-UNBLOCK-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_ub__iam__*（迁移内先归档，保留 180 天）
DO $drop_iam_refs$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core_user_roles')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'iam', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing iam.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS iam.%I', r.tbl);
  END LOOP;
END
$drop_iam_refs$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 遗留租户表解依赖后归档清理：4 张 flow._deprecated_core_tenant_* 0 行、无入向引用，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: TENANT-UNBLOCK-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_ub__flow__*（迁移内先归档，保留 180 天）
DO $drop_flow_refs$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('_deprecated_core_tenant_modules'),
    ('_deprecated_core_tenant_settings'),
    ('_deprecated_core_tenant_usage'),
    ('_deprecated_core_tenant_users')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'flow', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing flow.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS flow.%I', r.tbl);
  END LOOP;
END
$drop_flow_refs$;

-- 3) 改写 finance.bootstrap_defaults：只读 public.core_tenants + finance.core_finance_accounts
CREATE OR REPLACE FUNCTION finance.bootstrap_defaults(p_tenant_id uuid DEFAULT NULL)
RETURNS int AS $$
DECLARE
    t uuid;
    cnt int := 0;
    v_year int := EXTRACT(YEAR FROM NOW())::int;
    v_month int := EXTRACT(MONTH FROM NOW())::int;
    v_period text := TO_CHAR(NOW(), 'YYYYMM');
    v_start timestamptz := date_trunc('month', NOW());
    v_end timestamptz := (date_trunc('month', NOW()) + interval '1 month') - interval '1 second';
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS bootstrap_seed_tenants (tenant_id uuid) ON COMMIT DROP;
    TRUNCATE bootstrap_seed_tenants;

    IF p_tenant_id IS NOT NULL THEN
        INSERT INTO bootstrap_seed_tenants VALUES (p_tenant_id);
    ELSE
        -- 租户权威唯一来源：public.core_tenants（legacy iam/flow 副本已于 20261119200000 归档）
        IF to_regclass('public.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM public.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('finance.core_finance_accounts') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT DISTINCT tenant_id FROM finance.core_finance_accounts WHERE tenant_id IS NOT NULL';
        END IF;
    END IF;

    -- 仅保留 FK 目标 public.core_tenants 中存在的租户
    IF to_regclass('public.core_tenants') IS NOT NULL THEN
        DELETE FROM bootstrap_seed_tenants s
        WHERE NOT EXISTS (
            SELECT 1 FROM public.core_tenants t WHERE t.id = s.tenant_id
        );
    END IF;

    FOR t IN SELECT DISTINCT tenant_id FROM bootstrap_seed_tenants LOOP
        -- 企业会计准则常用科目（成组补齐；缺失才插，不覆盖既有名称/自定义科目）
        INSERT INTO finance.core_finance_accounts
            (tenant_id, code, name, account_type, level, currency, is_enabled, status)
        SELECT t, a.code, a.name, a.account_type::account_type, 1, 'CNY', TRUE, 'active'
        FROM (VALUES
            -- 资产
            ('1001', '库存现金',     'asset'),
            ('1002', '银行存款',     'asset'),
            ('1122', '应收账款',     'asset'),
            ('1123', '预付账款',     'asset'),
            ('1403', '原材料',       'asset'),
            ('1405', '库存商品',     'asset'),
            ('1601', '固定资产',     'asset'),
            -- 负债
            ('2202', '应付账款',     'liability'),
            ('2203', '预收账款',     'liability'),
            ('2211', '应付职工薪酬', 'liability'),
            ('2221', '应交税费',     'liability'),
            ('2241', '其他应付款',   'liability'),
            -- 权益
            ('4001', '实收资本',     'equity'),
            ('4103', '本年利润',     'equity'),
            ('4104', '利润分配',     'equity'),
            -- 成本
            ('5001', '生产成本',     'cost'),
            ('5101', '制造费用',     'cost'),
            -- 损益
            ('6001', '主营业务收入', 'income'),
            ('6051', '其他业务收入', 'income'),
            ('6401', '主营业务成本', 'expense'),
            ('6402', '其他业务成本', 'expense'),
            ('6601', '销售费用',     'expense'),
            ('6602', '管理费用',     'expense'),
            ('6603', '财务费用',     'expense')
        ) AS a(code, name, account_type)
        ON CONFLICT (tenant_id, code) DO NOTHING;

        -- 工资凭证事件（HrmPayrollPosted）按明细科目 code 落账，补齐其引用的明细科目；
        -- 父科目在上一步已确保存在，parent_id 按 code 解析。
        INSERT INTO finance.core_finance_accounts
            (tenant_id, code, name, account_type, level, parent_id, parent_code,
             currency, is_enabled, status)
        SELECT t, a.code, a.name, a.account_type::account_type, 2,
               (SELECT fa.id FROM finance.core_finance_accounts fa
                WHERE fa.tenant_id = t AND fa.code = a.parent_code),
               a.parent_code, 'CNY', TRUE, 'active'
        FROM (VALUES
            ('100201', '银行存款-基本户',      'asset',     '1002'),
            ('222101', '应交税费-个人所得税',  'liability', '2221'),
            ('224101', '其他应付款-社保',      'liability', '2241'),
            ('660101', '管理费用-工资',        'expense',   '6602')
        ) AS a(code, name, account_type, parent_code)
        ON CONFLICT (tenant_id, code) DO NOTHING;

        -- 当前月开放会计期间（缺失才插，已存在/已关闭期间不改动）
        INSERT INTO finance.core_finance_periods
            (tenant_id, year, month, period_name, status, start_date, end_date)
        SELECT t, v_year, v_month, v_period, 'open'::period_status, v_start, v_end
        WHERE NOT EXISTS (
            SELECT 1 FROM finance.core_finance_periods p
            WHERE p.tenant_id = t AND p.period_name = v_period
        );

        cnt := cnt + 1;
    END LOOP;

    -- bootstrap_seed_tenants 为 ON COMMIT DROP 临时表，事务结束自动清理
    RETURN cnt;
END $$ LANGUAGE plpgsql;

-- 4) 归档 3 张目标表（入向外键已在步骤 1/2 解除）
DO $archive_targets$
DECLARE
  r record; viewrec record;
  n_src bigint; n_arc bigint; n_ins bigint;
  v_rls boolean; v_force boolean;
  n_in bigint;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('iam', 'core_tenants', 'drop_20261119_ub__iam__core_tenants'),
    ('iam', 'core_users', 'drop_20261119_ub__iam__core_users'),
    ('flow', 'core_tenants', 'drop_20261119_ub__flow__core_tenants')
  ) AS x(sch, tbl, arc)
  LOOP
    SELECT count(*) INTO n_in FROM pg_constraint k
     WHERE k.contype = 'f' AND k.confrelid = to_regclass(format('%I.%I', r.sch, r.tbl));
    IF n_in <> 0 THEN
      RAISE EXCEPTION 'archive pre-check failed: %.% still has % inbound FK(s)', r.sch, r.tbl, n_in;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO v_rls, v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl;

    INSERT INTO archive._rls_policy_snapshot
      (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
    SELECT '20261119200000', 'tenant-unblock-20261119', r.sch, r.tbl, p.polname,
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

    INSERT INTO archive._fk_snapshot
      (migration_version, batch, conname, src_schema, src_table, tgt_schema, tgt_table, condef)
    SELECT '20261119200000', 'tenant-unblock-20261119', k.conname, sn.nspname, sc.relname,
           tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND tn.nspname = r.sch AND tc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._fk_out_snapshot
      (migration_version, batch, conname, src_schema, src_table, tgt_schema, tgt_table, condef)
    SELECT '20261119200000', 'tenant-unblock-20261119', k.conname, sn.nspname, sc.relname,
           tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND sn.nspname = r.sch AND sc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._view_snapshot
      (migration_version, batch, view_schema, view_name, object_kind, view_def)
    SELECT DISTINCT '20261119200000', 'tenant-unblock-20261119', vn.nspname, v.relname, v.relkind::text,
           pg_get_viewdef(v.oid, true)
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class v ON v.oid = rw.ev_class JOIN pg_namespace vn ON vn.oid = v.relnamespace
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE v.relkind IN ('v','m') AND v.oid <> t.oid AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._column_defaults
      (migration_version, batch, schema_name, table_name, column_name, default_expr)
    SELECT '20261119200000', 'tenant-unblock-20261119', r.sch, r.tbl, a.attname,
           pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._sequence_snapshot
      (migration_version, batch, seq_schema, seq_name, owned_schema, owned_table, owned_column,
       data_type, start_value, increment_by, min_value, max_value, cache_size, is_cycle, last_value)
    SELECT '20261119200000', 'tenant-unblock-20261119', sn.nspname, s.relname, tn.nspname, t.relname, a.attname,
           format_type(q.seqtypid, NULL), q.seqstart, q.seqincrement, q.seqmin, q.seqmax, q.seqcache, q.seqcycle,
           (SELECT ps.last_value FROM pg_sequences ps WHERE ps.schemaname = sn.nspname AND ps.sequencename = s.relname)
    FROM pg_class s
    JOIN pg_namespace sn ON sn.oid = s.relnamespace
    JOIN pg_sequence q ON q.seqrelid = s.oid
    JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'a'
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S' AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    IF to_regclass(format('archive.%I', r.arc)) IS NOT NULL THEN
      RAISE EXCEPTION 'archive table archive.% already exists: refusing to re-run', r.arc;
    END IF;
    EXECUTE format('CREATE TABLE archive.%I (LIKE %I.%I INCLUDING ALL EXCLUDING DEFAULTS)', r.arc, r.sch, r.tbl);
    EXECUTE format('INSERT INTO archive.%I SELECT * FROM %I.%I', r.arc, r.sch, r.tbl);
    GET DIAGNOSTICS n_ins = ROW_COUNT;
    EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO n_src;
    EXECUTE format('SELECT count(*) FROM archive.%I', r.arc) INTO n_arc;
    IF n_src <> n_arc OR n_ins <> n_src THEN
      RAISE EXCEPTION 'archive verification failed for %.%: src=%, arc=%, inserted=%', r.sch, r.tbl, n_src, n_arc, n_ins;
    END IF;

    INSERT INTO archive._drop_manifest
      (migration_version, batch, schema_name, table_name, archive_table, row_count,
       relrowsecurity, relforcerowsecurity, retention_until)
    VALUES ('20261119200000', 'tenant-unblock-20261119', r.sch, r.tbl, r.arc, n_src, v_rls, v_force,
            now() + interval '180 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'archive complete: 3 target tables, all 0 rows';
END
$archive_targets$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 遗留租户表解依赖后归档清理：iam.core_tenants / iam.core_users 0 行、入向外键已解除，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: TENANT-UNBLOCK-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_ub__iam__*（迁移内先归档，保留 180 天）
DO $drop_iam_targets$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core_tenants'),
    ('core_users')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'iam', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing iam.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS iam.%I', r.tbl);
  END LOOP;
END
$drop_iam_targets$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 遗留租户表解依赖后归档清理：flow.core_tenants 0 行、入向外键已解除，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: TENANT-UNBLOCK-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_ub__flow__core_tenants（迁移内先归档，保留 180 天）
DO $drop_flow_target$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core_tenants')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'flow', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing flow.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS flow.%I', r.tbl);
  END LOOP;
END
$drop_flow_target$;

-- 5) 后置断言：8 张全部消失、归档与 manifest 齐全、插件外键指向 public、函数已收口
DO $post$
DECLARE
  n_left int;
  n_arc int;
  n_manifest int;
  con_def text;
  src text;
BEGIN
  SELECT count(*) INTO n_left
  FROM (VALUES
    ('iam', 'core_tenants'), ('iam', 'core_users'), ('iam', 'core_user_roles'),
    ('flow', 'core_tenants'),
    ('flow', '_deprecated_core_tenant_modules'), ('flow', '_deprecated_core_tenant_settings'),
    ('flow', '_deprecated_core_tenant_usage'), ('flow', '_deprecated_core_tenant_users')
  ) AS x(sch, tbl)
  WHERE to_regclass(format('%I.%I', x.sch, x.tbl)) IS NOT NULL;
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'post-check failed: % legacy tenant tables still exist', n_left;
  END IF;

  SELECT count(*) INTO n_arc
  FROM (VALUES
    ('drop_20261119_ub__iam__core_tenants'), ('drop_20261119_ub__iam__core_users'),
    ('drop_20261119_ub__iam__core_user_roles'), ('drop_20261119_ub__flow__core_tenants'),
    ('drop_20261119_ub__flow___deprecated_core_tenant_modules'),
    ('drop_20261119_ub__flow___deprecated_core_tenant_settings'),
    ('drop_20261119_ub__flow___deprecated_core_tenant_usage'),
    ('drop_20261119_ub__flow___deprecated_core_tenant_users')
  ) AS x(tbl)
  WHERE to_regclass(format('archive.%I', x.tbl)) IS NOT NULL;
  IF n_arc <> 8 THEN
    RAISE EXCEPTION 'post-check failed: expected 8 archive tables, found %', n_arc;
  END IF;

  SELECT count(*) INTO n_manifest FROM archive._drop_manifest
  WHERE migration_version = '20261119200000' AND batch = 'tenant-unblock-20261119';
  IF n_manifest <> 8 THEN
    RAISE EXCEPTION 'post-check failed: expected 8 manifest rows, found %', n_manifest;
  END IF;

  IF EXISTS (SELECT 1 FROM archive._fk_snapshot WHERE migration_version = '20261119200000') THEN
    RAISE EXCEPTION 'post-check failed: unexpected inbound FK snapshot rows for this batch';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO con_def FROM pg_constraint
   WHERE conname = 'core_tenant_plugins_tenant_id_fkey'
     AND conrelid = to_regclass('iam.core_tenant_plugins');
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'core_tenant_plugins_tenant_id_fkey'
        AND conrelid = to_regclass('iam.core_tenant_plugins')
        AND confrelid = to_regclass('public.core_tenants')) THEN
    RAISE EXCEPTION 'post-check failed: plugin FK not on public.core_tenants (%)', con_def;
  END IF;

  SELECT p.prosrc INTO src
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults';
  IF src IS NULL THEN
    RAISE EXCEPTION 'post-check failed: finance.bootstrap_defaults missing';
  END IF;
  IF src LIKE '%iam.core_tenants%' OR src LIKE '%flow.core_tenants%' OR src LIKE '%iam.core_tenant_users%' THEN
    RAISE EXCEPTION 'post-check failed: bootstrap_defaults still references legacy tenant tables';
  END IF;
  IF src NOT LIKE '%public.core_tenants%' OR src NOT LIKE '%finance.core_finance_accounts%' THEN
    RAISE EXCEPTION 'post-check failed: bootstrap_defaults lost public/finance sources';
  END IF;

  RAISE NOTICE 'tenant-unblock complete: 8 tables archived and dropped, bootstrap_defaults collapsed to public';
END
$post$;
