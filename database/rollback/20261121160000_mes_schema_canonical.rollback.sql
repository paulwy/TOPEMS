-- 回滚 20261121160000_mes_schema_canonical.sql
-- 本迁移接管 mes 14 张运行期表；回滚 DROP 会删除生产订单/工序/设备/车间/班次等业务数据，
-- 因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121160000 为 mes schema 接管迁移，禁止自动回滚：回滚会删除 MES 业务数据。';
END $$;
