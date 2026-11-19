-- 20261119160000_drop_zero_path_legacy_tables
-- 批次：zero-path-20261119，共 16 张「零运行期路径」遗留表（先归档后 DROP）
-- 依据：docs/database/zero-path-tables-disposition-2026-11-19.md
-- 复核：静态全仓零引用；动态拼接（schema_prefix/format!/quote_ident/deploy/cron）零命中；
--       基线实测无出向外键、无触发器、无视图/函数引用；生产 n_live_tup=0、n_tup_ins=0。
-- 安全闸门：必须显式设置 app.drop_zero_path_tables_gate=zero-path-20261119，否则整条迁移中止。
-- 归档：archive.drop_20261119_zp__<schema>__<table>（结构 + 数据），元数据在 archive._drop_manifest 等快照表。
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

-- 1) 前置断言 + 归档 + 快照
DO $migration$
DECLARE
  r record; viewrec record;
  arc text; n_src bigint; n_arc bigint; n_ins bigint;
  v_rls boolean; v_force boolean;
  n_total int := 0;
  n_present int := 0;
BEGIN
  IF coalesce(current_setting('app.drop_zero_path_tables_gate', true), '') <> 'zero-path-20261119' THEN
    RAISE EXCEPTION 'gate closed: set app.drop_zero_path_tables_gate=zero-path-20261119';
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('doc', 'document_versions'),
    ('doc', 'documents'),
    ('doc', 'folders'),
    ('doc', 'templates'),
    ('doc_service', 'archives'),
    ('doc_service', 'files'),
    ('doc_service', 'folders'),
    ('doc_service', 'templates'),
    ('flow', 'notifications'),
    ('flow', 'workflows'),
    ('iam', 'permissions'),
    ('mail', 'emails'),
    ('mail', 'templates'),
    ('notification', 'notifications'),
    ('report', 'reports'),
    ('storage', 'files')
  ) AS x(sch, tbl)
  LOOP
    n_total := n_total + 1;
    IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing %.%', r.sch, r.tbl;
      CONTINUE;
    END IF;
    n_present := n_present + 1;
    arc := 'drop_20261119_zp__' || r.sch || '__' || r.tbl;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO v_rls, v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl;

    INSERT INTO archive._rls_policy_snapshot
      (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
    SELECT '20261119160000', 'zero-path-20261119', r.sch, r.tbl, p.polname,
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
    SELECT '20261119160000', 'zero-path-20261119', k.conname, sn.nspname, sc.relname, tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND tn.nspname = r.sch AND tc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._view_snapshot
      (migration_version, batch, view_schema, view_name, object_kind, view_def)
    SELECT DISTINCT '20261119160000', 'zero-path-20261119', vn.nspname, v.relname, v.relkind::text, pg_get_viewdef(v.oid, true)
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class v ON v.oid = rw.ev_class JOIN pg_namespace vn ON vn.oid = v.relnamespace
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE v.relkind IN ('v','m') AND v.oid <> t.oid AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._column_defaults
      (migration_version, batch, schema_name, table_name, column_name, default_expr)
    SELECT '20261119160000', 'zero-path-20261119', r.sch, r.tbl, a.attname, pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._sequence_snapshot
      (migration_version, batch, seq_schema, seq_name, owned_schema, owned_table, owned_column,
       data_type, start_value, increment_by, min_value, max_value, cache_size, is_cycle, last_value)
    SELECT '20261119160000', 'zero-path-20261119', sn.nspname, s.relname, tn.nspname, t.relname, a.attname,
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
      RAISE EXCEPTION 'archive table archive.% already exists: refusing to re-run', arc;
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
    VALUES ('20261119160000', 'zero-path-20261119', r.sch, r.tbl, arc, n_src, v_rls, v_force, now() + interval '180 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF n_present <> 16 THEN
    RAISE EXCEPTION 'pre-check failed: expected 16 tables present, found %', n_present;
  END IF;

  -- 依赖封闭前置断言：本批表不得有任何「出向? 入向」依赖未纳入归档
  IF EXISTS (
    SELECT 1 FROM archive._fk_snapshot
    WHERE migration_version = '20261119160000'
  ) THEN
    RAISE EXCEPTION 'pre-check failed: inbound foreign key found for zero-path batch; split dependent table out';
  END IF;

  IF EXISTS (
    SELECT 1 FROM archive._view_snapshot
    WHERE migration_version = '20261119160000'
  ) THEN
    RAISE EXCEPTION 'pre-check failed: dependent view found for zero-path batch; split dependent view out';
  END IF;

  RAISE NOTICE 'zero-path archive complete: tables=%', n_present;
END
$migration$;

-- 2) 归档校验通过后 DROP（schema 字面量，仅表名参数化；不使用 CASCADE）
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__*（迁移内先归档，保留 180 天）
DO $drop_doc$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('document_versions'),
    ('documents'),
    ('folders'),
    ('templates')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'doc', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing doc.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS doc.%I', r.tbl);
  END LOOP;
END
$drop_doc$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__doc_service__*（迁移内先归档，保留 180 天）
DO $drop_doc_service$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('archives'),
    ('files'),
    ('folders'),
    ('templates')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'doc_service', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing doc_service.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS doc_service.%I', r.tbl);
  END LOOP;
END
$drop_doc_service$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__flow__*（迁移内先归档，保留 180 天）
DO $drop_flow$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('notifications'),
    ('workflows')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'flow', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing flow.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS flow.%I', r.tbl);
  END LOOP;
END
$drop_flow$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__iam__*（迁移内先归档，保留 180 天）
DO $drop_iam$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('permissions')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'iam', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing iam.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS iam.%I', r.tbl);
  END LOOP;
END
$drop_iam$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__mail__*（迁移内先归档，保留 180 天）
DO $drop_mail$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('emails'),
    ('templates')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'mail', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing mail.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS mail.%I', r.tbl);
  END LOOP;
END
$drop_mail$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__notification__*（迁移内先归档，保留 180 天）
DO $drop_notification$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('notifications')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'notification', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing notification.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS notification.%I', r.tbl);
  END LOOP;
END
$drop_notification$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__report__*（迁移内先归档，保留 180 天）
DO $drop_report$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('reports')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'report', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing report.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS report.%I', r.tbl);
  END LOOP;
END
$drop_report$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: zero-path 遗留表清理：生产 0 行、全仓零引用、无动态拼接，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: ZERO-PATH-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_zp__storage__*（迁移内先归档，保留 180 天）
DO $drop_storage$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('files')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'storage', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing storage.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS storage.%I', r.tbl);
  END LOOP;
END
$drop_storage$;

-- 3) 后置断言：16 张全部消失；归档与 manifest 齐全；策略快照已留档
DO $post$
DECLARE
  n_left int;
  n_arc int;
  n_manifest int;
BEGIN
  SELECT count(*) INTO n_left
  FROM (VALUES
    ('doc', 'document_versions'), ('doc', 'documents'), ('doc', 'folders'), ('doc', 'templates'),
    ('doc_service', 'archives'), ('doc_service', 'files'), ('doc_service', 'folders'), ('doc_service', 'templates'),
    ('flow', 'notifications'), ('flow', 'workflows'), ('iam', 'permissions'),
    ('mail', 'emails'), ('mail', 'templates'), ('notification', 'notifications'),
    ('report', 'reports'), ('storage', 'files')
  ) AS x(sch, tbl)
  WHERE to_regclass(format('%I.%I', x.sch, x.tbl)) IS NOT NULL;
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'post-check failed: % zero-path tables still exist', n_left;
  END IF;

  SELECT count(*) INTO n_arc
  FROM (VALUES
    ('drop_20261119_zp__doc__document_versions'), ('drop_20261119_zp__doc__documents'),
    ('drop_20261119_zp__doc__folders'), ('drop_20261119_zp__doc__templates'),
    ('drop_20261119_zp__doc_service__archives'), ('drop_20261119_zp__doc_service__files'),
    ('drop_20261119_zp__doc_service__folders'), ('drop_20261119_zp__doc_service__templates'),
    ('drop_20261119_zp__flow__notifications'), ('drop_20261119_zp__flow__workflows'),
    ('drop_20261119_zp__iam__permissions'), ('drop_20261119_zp__mail__emails'),
    ('drop_20261119_zp__mail__templates'), ('drop_20261119_zp__notification__notifications'),
    ('drop_20261119_zp__report__reports'), ('drop_20261119_zp__storage__files')
  ) AS x(tbl)
  WHERE to_regclass(format('archive.%I', x.tbl)) IS NOT NULL;
  IF n_arc <> 16 THEN
    RAISE EXCEPTION 'post-check failed: expected 16 archive tables, found %', n_arc;
  END IF;

  SELECT count(*) INTO n_manifest FROM archive._drop_manifest
  WHERE migration_version = '20261119160000' AND batch = 'zero-path-20261119';
  IF n_manifest <> 16 THEN
    RAISE EXCEPTION 'post-check failed: expected 16 manifest rows, found %', n_manifest;
  END IF;

  RAISE NOTICE 'zero-path drop complete: 16 tables dropped, 16 archived';
END
$post$;
