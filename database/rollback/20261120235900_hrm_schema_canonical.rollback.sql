-- 回滚 20261120235900_hrm_schema_canonical.sql
--
-- 接管型迁移：这 23 张 hrm 表在迁移前已存在于 baseline 库，并承载公司、部门、
-- 岗位、员工、合同、考勤、薪酬运行/明细、绩效、培训、招聘、候选人、面试等数据。
-- 自动回滚执行 DROP TABLE 会不可逆删除 HRM 业务数据，因此明确拒绝自动执行。
--
-- 人工接管前提：
--   1) 已确认当前库不再由任何 topems 服务读写这 23 张 hrm 表；
--   2) 已完成全量逻辑备份并校验可恢复；
--   3) 已在变更单记录负责人与回滚窗口。
-- 人工接管顺序：先 DROP POLICY / DISABLE RLS，再按依赖逆序 DROP TABLE。
--
-- 注：payroll_records/performance_records/recruitment_applications/
-- recruitment_records/training_participants/hrm_master_data_refs 为 batch2
-- 已归档删除的死表，不在本迁移范围。

DO $$
BEGIN
    RAISE EXCEPTION '20261120235900 为接管型迁移，禁止自动回滚：hrm 23 张表承载 HRM 运行时数据。请按 rollback 文件头部的人工接管步骤执行。';
END $$;

-- 以下为人工接管模板，默认不执行：
-- 对 23 张表逐一执行：
--   ALTER TABLE hrm.<table> DISABLE ROW LEVEL SECURITY;
-- 然后按外键依赖逆序 DROP TABLE IF EXISTS hrm.<table>;
