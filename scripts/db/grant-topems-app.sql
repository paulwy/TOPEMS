-- 运行角色全库授权（幂等 · 动态版 · 库名/角色名参数化）
-- 用途：服务运行时池（NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE，仅 DML）
-- 迁移/DDL 走 MIGRATE_URL owner 池（topems），见 .env
-- 调用方式：
--   psql <目标库 DSN> -v ON_ERROR_STOP=1 -v runtime_role=topems_app \
--        -f scripts/db/grant-topems-app.sql
-- 前置：运行角色必须已存在（由 scripts/deploy/setup-db.sh --create-user 创建）。
-- 本脚本不再创建角色、不再内置任何默认口令，也不硬编码 topems 库名。

-- 把 psql 变量转成会话 GUC，供 DO 块内使用（psql 变量不会在 dollar-quoted 块内替换）
SELECT set_config('topems.runtime_role', :'runtime_role', false);

-- ================================================
-- 1. 运行角色存在性检查（不创建角色）
-- ================================================
DO $$
DECLARE
  v_role TEXT := current_setting('topems.runtime_role');
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = v_role) THEN
    RAISE EXCEPTION
      '运行角色 % 不存在；请先执行 setup-db.sh --create-user 创建角色后再授权', v_role;
  END IF;
END
$$;

-- ================================================
-- 2. 当前目标库 CONNECT 授权（库名动态解析）
-- ================================================
SELECT format(
  'GRANT CONNECT ON DATABASE %I TO %I',
  current_database(),
  current_setting('topems.runtime_role')
) \gexec

-- ================================================
-- 3. 全 schema USAGE 授权
-- ================================================
DO $$
DECLARE
  r RECORD;
  v_role TEXT := current_setting('topems.runtime_role');
BEGIN
  FOR r IN
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      AND schema_name NOT LIKE 'pg_toast%'
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', r.schema_name, v_role);
  END LOOP;
END
$$;

-- ================================================
-- 4. 全库表 DML 授权（动态遍历）
-- ================================================
DO $$
DECLARE
  r RECORD;
  v_role TEXT := current_setting('topems.runtime_role');
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_schema NOT LIKE 'pg_toast%'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO %I',
      r.table_schema, r.table_name, v_role
    );
  END LOOP;
END
$$;

-- ================================================
-- 5. 全库 Sequence USAGE 授权
-- ================================================
DO $$
DECLARE
  r RECORD;
  v_role TEXT := current_setting('topems.runtime_role');
BEGIN
  FOR r IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema')
      AND sequence_schema NOT LIKE 'pg_toast%'
  LOOP
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO %I',
      r.sequence_schema, r.sequence_name, v_role
    );
  END LOOP;
END
$$;

-- ================================================
-- 6. 设置默认权限（新增表自动授权）
-- ================================================
-- 按当前供给账号（目标库 owner）设置，不再硬编码 topems。
DO $$
DECLARE
  v_role TEXT := current_setting('topems.runtime_role');
  v_owner TEXT := current_user;
BEGIN
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
    v_owner, v_role
  );
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I GRANT USAGE, SELECT ON SEQUENCES TO %I',
    v_owner, v_role
  );
END
$$;

-- ================================================
-- 7. 验证输出
-- ================================================
DO $$
DECLARE
  v_role TEXT := current_setting('topems.runtime_role');
  table_count INT;
  seq_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.role_table_grants
  WHERE grantee = v_role
    AND privilege_type = 'SELECT';

  SELECT COUNT(*) INTO seq_count
  FROM information_schema.role_usage_grants
  WHERE grantee = v_role
    AND object_type = 'SEQUENCE';

  RAISE NOTICE '运行角色授权完成：%', v_role;
  RAISE NOTICE '   - 表授权数: %', table_count;
  RAISE NOTICE '   - Sequence 授权数: %', seq_count;
  RAISE NOTICE '   - 默认权限已设置（owner=%，新增表自动授权）', current_user;
END
$$;
