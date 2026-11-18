-- 20261119100000_drop_dead_tables_batch1
-- 批次：batch-1，共 19 张表
-- 依据：docs/quality/table-disposition-2026-11-19.md 与 docs/quality/dead-table-disposal-plan-2026-11-19.md
-- 安全闸门：必须显式设置 app.drop_dead_tables_gate=batch-1，否则整条迁移中止（外审清单未签不执行）。
-- 归档：archive.<archive_table>（结构 + 数据），元数据在 archive._drop_manifest / _rls_policy_snapshot / _fk_snapshot / _view_snapshot
-- 保留期：180 天；归档校验失败即 RAISE EXCEPTION，DROP 不执行。
-- 事务：由 scripts/migration/apply-forward.sh 以单事务执行，本文件不含 BEGIN/COMMIT。
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

DO $migration$
DECLARE
  r record; fkrec record; viewrec record;
  arc text; n_src bigint; n_arc bigint; n_ins bigint;
  v_rls boolean; v_force boolean;
BEGIN
  IF coalesce(current_setting('app.drop_dead_tables_gate', true), '') <> 'batch-1' THEN
    RAISE EXCEPTION 'gate closed: set app.drop_dead_tables_gate=batch-1';
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('crm', 'crm_master_data_refs'),
    ('mes', 'dashboard_stats'),
    ('mes', 'financial_records'),
    ('mes', 'material_requirement_items'),
    ('mes', 'supply_chain_orders'),
    ('mobile', 'mobile_leave_applications'),
    ('pm', 'acceptances'),
    ('pm', 'documents'),
    ('pm', 'pm_master_data_refs'),
    ('pm', 'service_integrations'),
    ('rs', 'equipment'),
    ('rs', 'equipment_inspections'),
    ('rs', 'equipment_maintenance_records'),
    ('shared', 'audit_logs'),
    ('tms', 'carriers'),
    ('tms', 'drivers'),
    ('wms', 'transfer_items'),
    ('wms', 'transfers'),
    ('wms', 'wms_master_data_refs')
  ) AS x(sch, tbl)
  LOOP
    IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing %.%', r.sch, r.tbl;
      CONTINUE;
    END IF;
    arc := 'drop_20261119_b1__' || r.sch || '__' || r.tbl;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO v_rls, v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl;

    INSERT INTO archive._rls_policy_snapshot
      (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
    SELECT '20261119100000', 'batch-1', r.sch, r.tbl, p.polname,
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
    SELECT '20261119100000', 'batch-1', k.conname, sn.nspname, sc.relname, tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND tn.nspname = r.sch AND tc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._view_snapshot
      (migration_version, batch, view_schema, view_name, object_kind, view_def)
    SELECT DISTINCT '20261119100000', 'batch-1', vn.nspname, v.relname, v.relkind::text, pg_get_viewdef(v.oid, true)
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class v ON v.oid = rw.ev_class JOIN pg_namespace vn ON vn.oid = v.relnamespace
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE v.relkind IN ('v','m') AND v.oid <> t.oid AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._column_defaults
      (migration_version, batch, schema_name, table_name, column_name, default_expr)
    SELECT '20261119100000', 'batch-1', r.sch, r.tbl, a.attname, pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._sequence_snapshot
      (migration_version, batch, seq_schema, seq_name, owned_schema, owned_table, owned_column,
       data_type, start_value, increment_by, min_value, max_value, cache_size, is_cycle, last_value)
    SELECT '20261119100000', 'batch-1', sn.nspname, s.relname, tn.nspname, t.relname, a.attname,
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

    IF to_regclass(format('archive.%I', arc)) IS NOT NULL THEN
      RAISE EXCEPTION 'archive table archive.% already exists: refusing to re-run (clean up manually or use a new batch)', arc;
    END IF;
    EXECUTE format('CREATE TABLE archive.%I (LIKE %I.%I INCLUDING ALL EXCLUDING DEFAULTS)', arc, r.sch, r.tbl);
    EXECUTE format('INSERT INTO archive.%I SELECT * FROM %I.%I', arc, r.sch, r.tbl);
    GET DIAGNOSTICS n_ins = ROW_COUNT;
    EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO n_src;
    EXECUTE format('SELECT count(*) FROM archive.%I', arc) INTO n_arc;
    IF n_src <> n_arc OR n_ins <> n_src THEN
      RAISE EXCEPTION 'archive verification failed for %.%: src=%, arc=%, inserted=%', r.sch, r.tbl, n_src, n_arc, n_ins;
    END IF;

    INSERT INTO archive._drop_manifest
      (migration_version, batch, schema_name, table_name, archive_table, row_count,
       relrowsecurity, relforcerowsecurity, retention_until)
    VALUES ('20261119100000', 'batch-1', r.sch, r.tbl, arc, n_src, v_rls, v_force, now() + interval '180 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 先删依赖视图，再删入向外键，最后删表
  FOR viewrec IN SELECT DISTINCT view_schema, view_name, object_kind FROM archive._view_snapshot WHERE batch = 'batch-1'
  LOOP
    IF viewrec.object_kind = 'm' THEN
      EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I', viewrec.view_schema, viewrec.view_name);
    ELSE
      EXECUTE format('DROP VIEW IF EXISTS %I.%I', viewrec.view_schema, viewrec.view_name);
    END IF;
  END LOOP;

  FOR fkrec IN SELECT * FROM archive._fk_snapshot WHERE batch = 'batch-1'
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I.%I DROP CONSTRAINT IF EXISTS %I', fkrec.src_schema, fkrec.src_table, fkrec.conname);
  END LOOP;
END
$migration$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__crm__*（迁移内先归档，保留 180 天）
DO $drop_crm$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('crm_master_data_refs')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'crm', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing crm.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS crm.%I', r.tbl);
  END LOOP;
END
$drop_crm$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__mes__*（迁移内先归档，保留 180 天）
DO $drop_mes$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('dashboard_stats'),
    ('financial_records'),
    ('material_requirement_items'),
    ('supply_chain_orders')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'mes', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing mes.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS mes.%I', r.tbl);
  END LOOP;
END
$drop_mes$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__mobile__*（迁移内先归档，保留 180 天）
DO $drop_mobile$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('mobile_leave_applications')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'mobile', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing mobile.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS mobile.%I', r.tbl);
  END LOOP;
END
$drop_mobile$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__pm__*（迁移内先归档，保留 180 天）
DO $drop_pm$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('acceptances'),
    ('documents'),
    ('pm_master_data_refs'),
    ('service_integrations')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'pm', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing pm.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS pm.%I', r.tbl);
  END LOOP;
END
$drop_pm$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__rs__*（迁移内先归档，保留 180 天）
DO $drop_rs$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('equipment'),
    ('equipment_inspections'),
    ('equipment_maintenance_records')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'rs', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing rs.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS rs.%I', r.tbl);
  END LOOP;
END
$drop_rs$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__shared__*（迁移内先归档，保留 180 天）
DO $drop_shared$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('audit_logs')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'shared', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing shared.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS shared.%I', r.tbl);
  END LOOP;
END
$drop_shared$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__tms__*（迁移内先归档，保留 180 天）
DO $drop_tms$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('carriers'),
    ('drivers')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'tms', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing tms.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS tms.%I', r.tbl);
  END LOOP;
END
$drop_tms$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-1 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__wms__*（迁移内先归档，保留 180 天）
DO $drop_wms$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('transfer_items'),
    ('transfers'),
    ('wms_master_data_refs')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'wms', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing wms.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS wms.%I', r.tbl);
  END LOOP;
END
$drop_wms$;