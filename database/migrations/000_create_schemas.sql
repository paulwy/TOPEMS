-- ================================================================================
-- 000_create_schemas.sql — 预创建所有业务 Schema（幂等）
-- ================================================================================
-- 背景：database/migrations/ 中 20260716+ 的迁移引用裸 schema 名
-- (iam/hrm/mobile/wms/rs/unified_core/plugin_*)，但 sqlx-prepare.sh 的 fresh PG
-- 容器只有默认 public schema。deploy.sh init_database 会创建这些 schema，
-- 但 sqlx-prepare.sh 不走 deploy.sh 路径。本迁移在 001-iam.sql 之前运行，
-- 确保后续迁移的 CREATE TABLE schema.table 不再报 "schema does not exist"。
--
-- 幂等：CREATE SCHEMA IF NOT EXISTS 对已存在的 schema 零副作用。
-- 来源：scripts/deploy/deploy.sh L256-L281 + database/init/01_rebuild_database.sql
-- ================================================================================

-- 平台服务 schema
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS doc;
CREATE SCHEMA IF NOT EXISTS flow;
CREATE SCHEMA IF NOT EXISTS unified_core;

-- 业务服务 schema（裸名）
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS hrm;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS pm;
CREATE SCHEMA IF NOT EXISTS rs;
CREATE SCHEMA IF NOT EXISTS lims;
CREATE SCHEMA IF NOT EXISTS pdm;
CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS qms;
CREATE SCHEMA IF NOT EXISTS ehs;
CREATE SCHEMA IF NOT EXISTS scm;
CREATE SCHEMA IF NOT EXISTS srm;
CREATE SCHEMA IF NOT EXISTS wms;
CREATE SCHEMA IF NOT EXISTS gis;
CREATE SCHEMA IF NOT EXISTS im;
CREATE SCHEMA IF NOT EXISTS bi;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS mail;
CREATE SCHEMA IF NOT EXISTS mobile;
CREATE SCHEMA IF NOT EXISTS core;

-- 插件 schema（plugin_* 前缀，01_rebuild_database.sql 命名）
CREATE SCHEMA IF NOT EXISTS plugin_erp;
CREATE SCHEMA IF NOT EXISTS plugin_finance;
CREATE SCHEMA IF NOT EXISTS plugin_hrm;
CREATE SCHEMA IF NOT EXISTS plugin_crm;
CREATE SCHEMA IF NOT EXISTS plugin_pm;
CREATE SCHEMA IF NOT EXISTS plugin_rs;
CREATE SCHEMA IF NOT EXISTS plugin_scm;
CREATE SCHEMA IF NOT EXISTS plugin_wms;
CREATE SCHEMA IF NOT EXISTS plugin_mes;
CREATE SCHEMA IF NOT EXISTS plugin_qms;
CREATE SCHEMA IF NOT EXISTS plugin_lims;
CREATE SCHEMA IF NOT EXISTS plugin_pdm;
CREATE SCHEMA IF NOT EXISTS plugin_ehs;
CREATE SCHEMA IF NOT EXISTS plugin_gis;
CREATE SCHEMA IF NOT EXISTS plugin_ai;
CREATE SCHEMA IF NOT EXISTS plugin_mobile;
CREATE SCHEMA IF NOT EXISTS plugin_integration;
CREATE SCHEMA IF NOT EXISTS plugin_portal;
CREATE SCHEMA IF NOT EXISTS plugin_bi;
CREATE SCHEMA IF NOT EXISTS plugin_report;

-- 共享 schema
CREATE SCHEMA IF NOT EXISTS shared;

-- 扩展（vector 需 pgvector 镜像，缺失时非致命）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector 扩展不可用，AI 向量功能将不可用（非致命）';
END $$;