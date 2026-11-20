-- 回滚 20261121210000_communication_schema_canonical.sql（W2-D2 communication 接管迁移）
--
-- 本迁移把 communication.core_location_messages 的 live 形状纳入迁移链。
-- 回滚会删除 IM 位置消息数据，禁止自动执行。
DO $$
BEGIN
    RAISE EXCEPTION '20261121210000 为 communication schema 接管迁移，禁止自动回滚：回滚会删除 IM 位置消息数据。';
END $$;
