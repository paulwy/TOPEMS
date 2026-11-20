-- 回滚 20261120235945_unified_core_schema_canonical.sql
--
-- 本迁移把 unified-core 27 张 public 运行期表的真实形状接管到迁移链。
-- 回滚若 DROP 这些表，会删除租户、用户、权限、工作流、文件、文档等核心业务数据，
-- 因此明确拒绝自动回滚。确需回退请人工评估并按表做数据备份后再操作。

DO $$
BEGIN
    RAISE EXCEPTION '20261120235945 为 unified-core schema 接管迁移，禁止自动回滚：回滚会删除核心业务数据。';
END $$;
