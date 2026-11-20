-- 回滚 20261121200000_analytics_schema_canonical.sql（W2-D2 analytics 接管迁移）
--
-- 本迁移把 bi.reports / bi.report_schedules / bi.report_templates 的 live 形状
-- 纳入迁移链。回滚会删除报表、排期、模板三类业务数据，禁止自动执行。
DO $$
BEGIN
    RAISE EXCEPTION '20261121200000 为 analytics schema 接管迁移，禁止自动回滚：回滚会删除报表业务数据。';
END $$;
