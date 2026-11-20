-- 回滚 20261121150000_srm_schema_canonical.sql
-- 本迁移接管 srm 16 张运行期表；回滚 DROP 会删除供应商/合同/采购/招标等业务数据，
-- 因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121150000 为 srm schema 接管迁移，禁止自动回滚：回滚会删除 SRM 业务数据。';
END $$;
