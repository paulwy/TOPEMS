-- 2026-08-31 archive schema 收尾清理（用户确认）
-- 背景：archive 118 张表（101 旧版 _archive_* + 17 core_* 无引用残留）经双验证确认无任何代码/SQL 引用
--       （schema-boundary 门禁 PASS + 精确 grep `archive.`/`_archive_` 零命中）。
--       数据永久删除前已备份：database/backup/topems_pre_archive_drop_20260831_2037.dump（4.06M）。
-- 幂等：DROP SCHEMA IF EXISTS。
DROP SCHEMA IF EXISTS archive CASCADE;
