-- 回滚 20261120200000_lims_schema_canonical.sql
--
-- 接管型迁移：这 42 张 lims 表在迁移前已存在于 baseline 库，并承载样品、
-- 检验任务/记录、仪器校准、试剂、标准方法、期间核查、不确定度、实验室台账
-- 等运行时数据。
-- 自动回滚执行 DROP TABLE 会不可逆删除 LIMS 业务数据，因此明确拒绝自动执行。
--
-- 人工接管前提：
--   1) 已确认当前库不再由任何 topems 服务读写这 42 张 lims 表；
--   2) 已完成全量逻辑备份并校验可恢复；
--   3) 已在变更单记录负责人与回滚窗口。
-- 人工接管顺序：先 DROP POLICY / DISABLE RLS，再按依赖逆序 DROP TABLE。
--
-- 注：lims.lims_inspection_records / lims.lims_safety_tasks / lims.qa_lims_analytes
-- 由既有迁移维护，不在本迁移范围，回滚不涉及。

DO $$
BEGIN
    RAISE EXCEPTION '20261120200000 为接管型迁移，禁止自动回滚：lims 42 张表承载 LIMS 运行时数据。请按 rollback 文件头部的人工接管步骤执行。';
END $$;

-- 以下为人工接管模板，默认不执行：
-- 对 42 张表逐一执行：
--   ALTER TABLE lims.<table> DISABLE ROW LEVEL SECURITY;
-- 然后按外键依赖逆序 DROP TABLE IF EXISTS lims.<table> CASCADE;
