-- 回滚 20261121180000_integration_schema_canonical.sql
-- 本迁移接管 integration 8 张运行期表；回滚 DROP 会删除转换规则/执行/集成事件/同步日志等业务数据，
-- 因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121180000 为 integration schema 接管迁移，禁止自动回滚：回滚会删除集成业务数据。';
END $$;
