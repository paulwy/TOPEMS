-- 回滚 20261121140000_pdm_schema_canonical.sql
-- 本迁移接管 pdm 19 张运行期表；回滚 DROP 会删除产品/BOM/图文档/工艺/项目等业务数据，
-- 因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121140000 为 pdm schema 接管迁移，禁止自动回滚：回滚会删除 PDM 业务数据。';
END $$;
