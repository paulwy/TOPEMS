-- 回滚 20261121170000_crm_schema_canonical.sql
-- 本迁移接管 crm 13 张运行期表；回滚 DROP 会删除客户/联系人/订单/机会/退货等业务数据，
-- 因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121170000 为 crm schema 接管迁移，禁止自动回滚：回滚会删除 CRM 业务数据。';
END $$;
