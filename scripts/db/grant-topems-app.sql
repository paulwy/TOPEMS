-- topems_app 受限角色全库授权（幂等 · 动态版）
-- 用途：服务运行时池（NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE，仅 DML）
-- 迁移/DDL 走 MIGRATE_URL owner 池（topems），见 .env
-- 新库重建后执行顺序：建角色 → 本脚本 → 默认权限（已内置）
-- 2026-09-26 重写：动态遍历所有 schema，自动覆盖新增表

-- ================================================
-- 1. 建角色（幂等）
-- ================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'topems_app') THEN
    CREATE ROLE topems_app LOGIN PASSWORD 'topems_app_secret'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE topems TO topems_app;

-- ================================================
-- 2. 全 schema USAGE 授权
-- ================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      AND schema_name NOT LIKE 'pg_toast%'
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO topems_app', r.schema_name);
  END LOOP;
END
$$;

-- ================================================
-- 3. 全库表 DML 授权（动态遍历）
-- ================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_schema NOT LIKE 'pg_toast%'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO topems_app',
      r.table_schema, r.table_name
    );
  END LOOP;
END
$$;

-- ================================================
-- 4. 全库 Sequence USAGE 授权
-- ================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema')
      AND sequence_schema NOT LIKE 'pg_toast%'
  LOOP
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO topems_app',
      r.sequence_schema, r.sequence_name
    );
  END LOOP;
END
$$;

-- ================================================
-- 5. 设置默认权限（关键！新增表自动授权）
-- ================================================
-- 以后所有由 topems 用户创建的表/sequence，自动授权给 topems_app
ALTER DEFAULT PRIVILEGES
  FOR ROLE topems
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO topems_app;

ALTER DEFAULT PRIVILEGES
  FOR ROLE topems
  GRANT USAGE, SELECT ON SEQUENCES TO topems_app;

-- ================================================
-- 6. 验证输出
-- ================================================
DO $$
DECLARE
  table_count INT;
  seq_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.role_table_grants
  WHERE grantee = 'topems_app'
    AND privilege_type = 'SELECT';

  SELECT COUNT(*) INTO seq_count
  FROM information_schema.role_usage_grants
  WHERE grantee = 'topems_app'
    AND object_type = 'SEQUENCE';

  RAISE NOTICE '✅ topems_app 授权完成：';
  RAISE NOTICE '   - 表授权数: %', table_count;
  RAISE NOTICE '   - Sequence 授权数: %', seq_count;
  RAISE NOTICE '   - 默认权限已设置：新增表自动授权给 topems_app';
END
$$;
