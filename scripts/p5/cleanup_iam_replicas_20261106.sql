-- P5 IAM 冗余副本清理（一次性执行，不进入通用迁移链）
-- 批 10 / 2026-11-06
--
-- 前置：必须先执行 database/migrations/20261107000001_iam_core_public_authority_sync.sql
--       （public 已补齐 mes 独有的 4 条码，本地验证 public=1037）
-- 备份：database/backup/p5_20261106/{public,iam,mes,flow}_iam_core.sql
--
-- 清理范围（均已在 public 权威副本留有数据或为空表）：
--   mes:  core_permissions(647) / core_roles(0) / core_role_permissions / core_user_roles / core_users
--         —— 历史种子按 search_path 落盘的误写副本，数据已归一至 public
--   flow: core_tenant_modules(0)
--
-- 【不清理】iam 的 6 张同名表：
--   iam 是 database/init/06_iam_schema.sql 的规范定义 schema（284 处引用，含 core_chat_* 等表），
--   不是"冗余副本"。当前 iam 副本全空，运行时由 SEARCH_PATH=public 优先保证权威性；
--   待 init 脚本将 IAM 表定义迁移到 public 后再清理（登记 P5 后续）。
--
-- 回滚：
--   psql "$DB" -f database/backup/p5_20261106/mes_iam_core.sql
--   psql "$DB" -f database/backup/p5_20261106/flow_iam_core.sql
--   然后恢复 .env 的 SEARCH_PATH 原值（iam,shared,public）

-- mes 副本（按外键依赖顺序：子表 → 父表）
DROP TABLE IF EXISTS mes.core_role_permissions;
DROP TABLE IF EXISTS mes.core_user_roles;
DROP TABLE IF EXISTS mes.core_permissions;
DROP TABLE IF EXISTS mes.core_roles;
DROP TABLE IF EXISTS mes.core_users;

-- mes.core_tenant_modules（副本，批 11 在 public 上做 tier 迁移）
DROP TABLE IF EXISTS mes.core_tenant_modules;

-- flow 副本
DROP TABLE IF EXISTS flow.core_tenant_modules;
