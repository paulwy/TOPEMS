-- ============================================================
-- 20261123130000_erp_sales_orders_company_id.rollback.sql
--
-- 回滚：删除 erp.sales_orders.company_id。
--
-- 影响（必须知悉）：
--   * 直接 DROP COLUMN，不因存量非空数据阻断；列内已写入的公司归属会丢失。
--   * 依赖该列的下游（v2 搜索投影双写、回填/对账脚本、后续收紧迁移）
--     必须先停用或回滚，否则会出现缺列错误。
--
-- 幂等性：DROP COLUMN IF EXISTS；文件内不含 BEGIN/COMMIT。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DO $w13_sales_company_rb$
BEGIN
    IF to_regclass('erp.sales_orders') IS NULL THEN
        RAISE NOTICE 'W13 回滚跳过：erp.sales_orders 不存在';
        RETURN;
    END IF;

    EXECUTE 'ALTER TABLE erp.sales_orders DROP COLUMN IF EXISTS company_id';

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'erp'
           AND table_name = 'sales_orders'
           AND column_name = 'company_id'
    ) THEN
        RAISE EXCEPTION '回滚后置断言失败：erp.sales_orders.company_id 仍存在';
    END IF;
END
$w13_sales_company_rb$;
