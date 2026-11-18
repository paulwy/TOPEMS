-- 回滚 20261119120000_erp_sales_order_items
-- 恢复「无 erp.sales_order_items、scm.sales_order_items 无归档注释」的原状。
-- 注意：若新表已有业务写入，回滚会丢行项目数据；执行前确认。

DO $$
BEGIN
    IF to_regclass('erp.sales_order_items') IS NULL THEN
        RAISE NOTICE 'erp.sales_order_items 不存在，跳过 DROP';
    END IF;
END $$;

DROP TABLE IF EXISTS erp.sales_order_items;

COMMENT ON TABLE scm.sales_order_items IS NULL;
