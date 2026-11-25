-- =============================================================================
-- bootstrap_schemas.sql —— 数据库 schema 的唯一创建入口（由超管执行一次）
--
-- 背景：历史上 74 个迁移文件各自 `CREATE SCHEMA IF NOT EXISTS x;`，这要求迁移角色
-- 持有库级 `CREATE ON DATABASE`（曾被 20261121220000 挡在 finance 上）。本文件把
-- 「建 schema」从迁移里剥离出来：
--   * schema 全部在此预置，且直接 `AUTHORIZATION topems_owner`（迁移角色即属主）；
--   * `scripts/db/apply-pending.sh` 拒绝任何自带 `CREATE SCHEMA` 的迁移文件；
--   * 归位后即可收回 `topems_owner` 的库级 CREATE（见 docs/database/role-ownership.md §10）。
--
-- 用法：psql -d topems -v ON_ERROR_STOP=1 -f database/scripts/bootstrap_schemas.sql
-- 幂等：已存在的 schema 不重建、不改变属主。
-- =============================================================================
\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS _sqlx_test AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS ai AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS analytics AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS archive AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS bi AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS communication AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS core AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS crm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS doc AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS doc_service AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS ehs AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS erp AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS file AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS finance AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS flow AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS gis AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS hrm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS iam AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS im AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS integration AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS lims AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS mail AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS master_data AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS mes AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS mobile AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS notification AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS pdm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_ai AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_bi AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_crm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_ehs AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_erp AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_finance AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_gis AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_hrm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_integration AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_lims AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_mes AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_mobile AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_pdm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_pm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_portal AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_qms AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_report AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_rs AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_scm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS plugin_wms AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS pm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS portal AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS public AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS qms AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS rd AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS report AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS rs AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS scm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS shared AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS srm AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS ticket AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS tms AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS unified_core AUTHORIZATION topems_owner;
CREATE SCHEMA IF NOT EXISTS wms AUTHORIZATION topems_owner;

-- public 由 PG 初始化时建成、属主是 pg_database_owner；迁移角色在建表前必须拥有它。
-- 本地库此前由 database/scripts/converge_owner.sql 收敛过；新库必须在 bootstrap 里补这一步，
-- 否则 canonical/常规迁移都会因 "permission denied for schema public" 失败。
ALTER SCHEMA public OWNER TO topems_owner;

-- ---------------------------------------------------------------------------
-- 扩展：迁移里用到 vector / uuid-ossp / pgcrypto / pg_trgm / btree_gin / postgis，
-- 但 CREATE EXTENSION 需要超级用户，迁移角色（topems_owner）永远做不了。
-- 所以扩展只能在 bootstrap（超管）里落，且必须在跑任何迁移之前。
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS plpgsql;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;
  ELSE
    RAISE NOTICE '跳过 vector：当前 PostgreSQL 镜像未提供该扩展';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
    CREATE EXTENSION IF NOT EXISTS postgis;
  ELSE
    RAISE NOTICE '跳过 postgis：当前 PostgreSQL 镜像未提供该扩展（GIS 在线门禁需换用含 postgis 的镜像）';
  END IF;
END $$;
