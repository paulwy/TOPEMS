BEGIN;
SET lock_timeout = '10s';

-- 1) schema 归属 + 应用 USAGE
DO $$
DECLARE s text; c_sch int := 0;
BEGIN
  FOR s IN SELECT nspname FROM pg_namespace
            WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
  LOOP
    EXECUTE format('ALTER SCHEMA %I OWNER TO topems_owner', s);
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO topems_app', s);
    c_sch := c_sch + 1;
  END LOOP;
  RAISE NOTICE 'schemas converged: %', c_sch;
END $$;

-- 2) 表/分区/视图/物化视图/序列 归属
DO $$
DECLARE r record; c int := 0;
BEGIN
  FOR r IN SELECT n.nspname AS sch, c.relname AS rel, c.relkind AS kind
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname !~ '^pg_'
              AND n.nspname <> 'information_schema'
              AND c.relkind IN ('r','p','v','m','S','f')
              AND pg_get_userbyid(c.relowner) <> 'topems_owner'
              AND NOT (c.relkind = 'S' AND EXISTS (
                    SELECT 1 FROM pg_depend d
                     WHERE d.objid = c.oid AND d.classid = 'pg_class'::regclass
                       AND d.refclassid = 'pg_class'::regclass
                       AND d.deptype IN ('a','i')))
  LOOP
    IF r.kind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO topems_owner', r.sch, r.rel);
    ELSIF r.kind = 'v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO topems_owner', r.sch, r.rel);
    ELSIF r.kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO topems_owner', r.sch, r.rel);
    ELSIF r.kind = 'f' THEN
      EXECUTE format('ALTER FOREIGN TABLE %I.%I OWNER TO topems_owner', r.sch, r.rel);
    ELSE
      EXECUTE format('ALTER TABLE %I.%I OWNER TO topems_owner', r.sch, r.rel);
    END IF;
    c := c + 1;
  END LOOP;
  RAISE NOTICE 'relations converged: %', c;
END $$;

-- 3) 函数/过程 归属（扩展内置函数随扩展管理，不改属主）
DO $$
DECLARE f record; c int := 0;
BEGIN
  FOR f IN SELECT n.nspname AS sch, p.proname AS fn,
                  pg_get_function_identity_arguments(p.oid) AS args
             FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname !~ '^pg_'
              AND n.nspname <> 'information_schema'
              AND pg_get_userbyid(p.proowner) <> 'topems_owner'
              AND NOT EXISTS (
                    SELECT 1 FROM pg_depend d
                     WHERE d.objid = p.oid AND d.classid = 'pg_proc'::regclass
                       AND d.deptype = 'e'
                  )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) OWNER TO topems_owner', f.sch, f.fn, f.args);
    c := c + 1;
  END LOOP;
  RAISE NOTICE 'functions converged: %', c;
END $$;

-- 4) 枚举/域/范围类型 归属（扩展类型随扩展管理，不改属主）
DO $$
DECLARE t record; c int := 0;
BEGIN
  FOR t IN SELECT n.nspname AS sch, ty.typname AS typ, ty.typtype AS kind
             FROM pg_type ty JOIN pg_namespace n ON n.oid = ty.typnamespace
            WHERE n.nspname !~ '^pg_'
              AND n.nspname <> 'information_schema'
              AND ty.typtype IN ('e','d','r')
              AND pg_get_userbyid(ty.typowner) <> 'topems_owner'
              AND NOT EXISTS (
                    SELECT 1 FROM pg_depend d
                     WHERE d.objid = ty.oid AND d.classid = 'pg_type'::regclass
                       AND d.deptype = 'e'
                  )
  LOOP
    EXECUTE format('ALTER TYPE %I.%I OWNER TO topems_owner', t.sch, t.typ);
    c := c + 1;
  END LOOP;
  RAISE NOTICE 'types converged: %', c;
END $$;

-- 5) 应用 DML 授权 + owner 侧默认权限（未来对象自动可用）
DO $$
DECLARE s text;
BEGIN
  FOR s IN SELECT nspname FROM pg_namespace
            WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO topems_app', s);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO topems_app', s);
    EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO topems_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE topems_owner IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO topems_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE topems_owner IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO topems_app', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE topems_owner IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO topems_app', s);
  END LOOP;
  RAISE NOTICE 'grants + default privileges applied';
END $$;

-- 6) 例外：运行期自愈建表的 schema 保留 CREATE（见 docs/database/role-ownership.md）
GRANT CREATE ON SCHEMA public, erp, finance, master_data, hrm TO topems_app;

COMMIT;
