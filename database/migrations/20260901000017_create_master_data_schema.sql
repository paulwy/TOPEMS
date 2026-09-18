-- 2026-09-01 master-data 服务 schema 化：
-- 归位 master-data 独占的 4 张表（仅 master-data 引用）到 master_data schema：
--   core_dict_types / core_dict_items（core_ 前缀历史命名，实际仅 master-data 用）
--   schema_registry（DB 表仅 master-data 用；portal/lib 的 schema_registry 为代码内定义）
--   dynamic_data（仅 master-data 用）
-- 同步改代码 SEARCH_PATH/SERVICE_SCHEMA 后即时生效
CREATE SCHEMA IF NOT EXISTS master_data;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_dict_types' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='master_data' AND c.relname='core_dict_types' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_dict_types" SET SCHEMA master_data';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='master_data' AND c.relname='core_dict_items' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_dict_items" SET SCHEMA master_data';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='schema_registry' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='master_data' AND c.relname='schema_registry' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."schema_registry" SET SCHEMA master_data';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='dynamic_data' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='master_data' AND c.relname='dynamic_data' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."dynamic_data" SET SCHEMA master_data';
  END IF;
END $rehome$;
