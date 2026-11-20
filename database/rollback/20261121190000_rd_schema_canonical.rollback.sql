-- 回滚 20261121190000_rd_schema_canonical.sql
-- 本迁移接管 rs 6 张运行期表；回滚 DROP 会删除研发项目/阶段/里程碑/成员/变更等业务数据，
-- 因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121190000 为 rd schema 接管迁移，禁止自动回滚：回滚会删除研发业务数据。';
END $$;
