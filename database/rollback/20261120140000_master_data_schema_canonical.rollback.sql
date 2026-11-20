-- 回滚 20261120140000_master_data_schema_canonical
--
-- 接管型迁移：5 张表在目标库通常已存在并被 master-data 真实读写。
-- 自动 DROP TABLE 会丢主数据，因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION
        '20261120140000 为 schema 接管型迁移，不可自动回滚；'
        '如需撤销请先确认 master_data.schema_registry/dynamic_data/materials/uoms/samples 无数据，再人工 DROP';
END
$$;
