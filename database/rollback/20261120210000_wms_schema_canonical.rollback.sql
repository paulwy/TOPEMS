-- 回滚 20261120210000_wms_schema_canonical.sql
--
-- 接管型迁移：这 31 张 wms 表在迁移前已存在于 baseline 库，并承载仓库、
-- 库位、库存、入出库、盘点、波次、补货、安全库存、库存流水、同步记录等运行时数据。
-- 自动回滚执行 DROP TABLE 会不可逆删除 WMS 业务数据，因此明确拒绝自动执行。
--
-- 人工接管前提：
--   1) 已确认当前库不再由任何 topems 服务读写这 31 张 wms 表；
--   2) 已完成全量逻辑备份并校验可恢复；
--   3) 已在变更单记录负责人与回滚窗口。
-- 人工接管顺序：先 DROP POLICY / DISABLE RLS，再按依赖逆序 DROP TABLE。
--
-- 注：wms.transfers / wms.transfer_items / wms.wms_master_data_refs 为 batch1
-- 已归档删除的死表，不在本迁移范围；本迁移不重建它们。

DO $$
BEGIN
    RAISE EXCEPTION '20261120210000 为接管型迁移，禁止自动回滚：wms 31 张表承载 WMS 运行时数据。请按 rollback 文件头部的人工接管步骤执行。';
END $$;

-- 以下为人工接管模板，默认不执行：
-- 对 31 张表逐一执行：
--   ALTER TABLE wms.<table> DISABLE ROW LEVEL SECURITY;
-- 然后按外键依赖逆序 DROP TABLE IF EXISTS wms.<table> CASCADE;
