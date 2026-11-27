-- public schema 盘点脚本（2026-11-27）
-- 用法：PGHOST=/tmp PGUSER=xingzhai psql -X -q "postgresql:///topems_prod?user=xingzhai" -f scripts/migration/audit-public-schema.sql
-- 输出：规模、非空表、真实受阻表（有入向 FK / 视图依赖）、干净可删清单、非表对象
-- 说明：只读查询，不产生任何 DDL；行数为精确 count（大库请先收紧表范围）。

\pset pager off
SET statement_timeout = '180s';

DROP TABLE IF EXISTS _pub_rows;
CREATE TEMP TABLE _pub_rows(table_name text, nrows bigint);

DO $$
DECLARE r record; c bigint;
BEGIN
  FOR r IN
    SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relispartition
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.t) INTO c;
    INSERT INTO _pub_rows VALUES (r.t, c);
  END LOOP;
END $$;

\echo '=== 0. 规模 ==='
SELECT (SELECT count(*) FROM _pub_rows) AS public_tables,
       (SELECT count(*) FROM _pub_rows WHERE nrows = 0) AS empty_tables,
       (SELECT count(*) FROM _pub_rows WHERE nrows > 0) AS nonempty_tables,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relkind='S') AS sequences,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relkind='v') AS views;

\echo '=== 1. 非空表（在用，禁删） ==='
SELECT p.table_name, p.nrows,
  (SELECT count(*) FROM information_schema.columns col
     WHERE col.table_schema='public' AND col.table_name=p.table_name AND col.column_name='tenant_id') AS has_tenant_id,
  (SELECT count(*) FROM pg_class k JOIN pg_namespace s ON s.oid=k.relnamespace
     WHERE s.nspname='public' AND k.relname=p.table_name AND k.relrowsecurity) AS rls,
  (SELECT count(*) FROM pg_constraint con
     WHERE con.confrelid = format('public.%I', p.table_name)::regclass AND con.contype='f') AS referenced_by_fk,
  (SELECT count(*) FROM pg_constraint con
     WHERE con.conrelid = format('public.%I', p.table_name)::regclass AND con.contype='f') AS fk_out
FROM _pub_rows p
WHERE p.nrows > 0
ORDER BY p.nrows DESC, p.table_name;

\echo '=== 2. 真实受阻表（空表但有入向 FK 或视图依赖，须先退引用） ==='
SELECT p.table_name, p.nrows,
  (SELECT string_agg(DISTINCT cn.nspname||'.'||cl.relname, ', ')
     FROM pg_constraint con JOIN pg_class cl ON cl.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=cl.relnamespace
     WHERE con.confrelid = format('public.%I', p.table_name)::regclass AND con.contype='f') AS in_fk_by,
  (SELECT string_agg(DISTINCT vn.nspname||'.'||v.relname, ', ')
     FROM pg_depend d JOIN pg_rewrite rv ON rv.oid=d.objid
     JOIN pg_class v ON v.oid=rv.ev_class JOIN pg_namespace vn ON vn.oid=v.relnamespace
     WHERE d.refobjid = format('public.%I', p.table_name)::regclass AND d.deptype='n') AS view_by
FROM _pub_rows p
WHERE p.nrows = 0
  AND (
    EXISTS (SELECT 1 FROM pg_constraint con
             WHERE con.confrelid = format('public.%I', p.table_name)::regclass AND con.contype='f')
    OR EXISTS (SELECT 1 FROM pg_depend d JOIN pg_rewrite rv ON rv.oid=d.objid
                WHERE d.refobjid = format('public.%I', p.table_name)::regclass AND d.deptype='n')
  )
ORDER BY p.table_name;

\echo '=== 3. 候选可删（0 行 + 无入向 FK + 无视图依赖；仍需人工核「来源」与「代码引用」） ==='
SELECT p.table_name FROM _pub_rows p
WHERE p.nrows = 0
  AND NOT EXISTS (SELECT 1 FROM pg_constraint con
                   WHERE con.confrelid = format('public.%I', p.table_name)::regclass AND con.contype='f')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d JOIN pg_rewrite rv ON rv.oid=d.objid
                   WHERE d.refobjid = format('public.%I', p.table_name)::regclass AND d.deptype='n')
ORDER BY p.table_name;

\echo '=== 4. 非表对象分布 ==='
SELECT c.relkind, count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' GROUP BY 1 ORDER BY 1;
