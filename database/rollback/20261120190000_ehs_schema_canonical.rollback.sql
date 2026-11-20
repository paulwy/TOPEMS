-- 回滚 20261120190000_ehs_schema_canonical.sql
--
-- 接管型迁移：这 33 张 ehs 表在迁移前已存在于 baseline 库，并承载风险、隐患、
-- 巡检、事故、应急、职业健康、危化品、MSDS 等运行时数据。
-- 自动回滚执行 DROP TABLE 会不可逆删除 EHS 业务数据，因此明确拒绝自动执行。
--
-- 人工接管前提：
--   1) 已确认当前库不再由任何 topems 服务读写这 33 张 ehs 表；
--   2) 已完成全量逻辑备份并校验可恢复；
--   3) 已在变更单记录负责人与回滚窗口。
-- 人工接管顺序：先 DROP POLICY / DISABLE RLS，再按依赖逆序 DROP TABLE。
--
-- 注：本迁移只固化仍在库内的 33 张表。20261119110000_drop_dead_tables_batch2
-- 删除的 10 张 ehs 死表不在本迁移范围内，回滚不会重建它们。

DO $$
BEGIN
    RAISE EXCEPTION '20261120190000 为接管型迁移，禁止自动回滚：ehs 33 张表承载 EHS 运行时数据。请按 rollback 文件头部的人工接管步骤执行。';
END $$;

-- 以下为人工接管模板，默认不执行：
-- 对 33 张表逐一执行：
--   ALTER TABLE ehs.<table> DISABLE ROW LEVEL SECURITY;
-- 然后按外键依赖逆序 DROP TABLE IF EXISTS ehs.<table> CASCADE;
