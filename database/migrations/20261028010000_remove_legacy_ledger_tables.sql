-- ============================================================
-- 20261028010000: 迁移台账治理——清理历史僵尸台账表
--
-- 背景：迁移体系曾按 schema 分裂为三套 _sqlx_migrations（public 493 +
-- iam 49 + mes 292）。iam/mes 台账为历史遗留（旧迁移目录已归并至
-- database/migrations，新迁移全部走 public 台账；iam/mes 台账停更于
-- 2026-10-05/2026-10-03），且代码与部署脚本均无引用。
--
-- 本迁移幂等清理 iam/mes 僵尸台账，使全库收敛为单一 public 台账。
-- IF EXISTS 保证无僵尸表的环境（新库/已治理库）重放无害。
-- 若需回滚，备份见 /tmp/ledger_backup_iam_mes.sql（本次治理时 pg_dump）。
-- ============================================================

DROP TABLE IF EXISTS iam._sqlx_migrations;
DROP TABLE IF EXISTS mes._sqlx_migrations;
