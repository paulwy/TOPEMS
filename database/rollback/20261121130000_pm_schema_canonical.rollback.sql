-- 回滚 20261121130000_pm_schema_canonical.sql
-- 本迁移接管 pm 18 张运行期表；回滚 DROP 会删除项目/合同/预算/风险等业务数据，
-- 因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121130000 为 pm schema 接管迁移，禁止自动回滚：回滚会删除项目业务数据。';
END $$;
