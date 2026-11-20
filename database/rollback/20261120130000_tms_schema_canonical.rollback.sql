-- 回滚 20261120130000_tms_schema_canonical
--
-- 接管型迁移：5 张表在目标库通常早已存在并被 tms 真实读写。
-- 自动 DROP TABLE 会直接丢运输主数据，因此这里明确拒绝自动回滚。
-- 如需在确认无数据的空环境撤销，请人工 DROP。

DO $$
BEGIN
    RAISE EXCEPTION
        '20261120130000 为 schema 接管型迁移，不可自动回滚；'
        '如需撤销请先确认 tms.tms_vehicles/tms_drivers/tms_carriers/tms_routes/tms_shipments 无数据，再人工 DROP';
END
$$;
