-- ============================================================
-- 20261123140000_erp_sales_orders_company_id.sql
--
-- W13 第一阶段：erp.sales_orders 补公司归属列（company_id）
--
-- 口径（2026-11-23 W13 方案 A）：
--   * 本轮只补列，允许 NULL：历史行暂时为空，等业务归属清单回填后
--     另起迁移收紧为 NOT NULL；本步不得因历史空值阻断。
--   * 新建路径由服务层写入请求公司上下文；缺上下文 fail-closed，
--     不静默置空（见 svc/erp/src/modules/order_company.rs）。
--   * 本轮不新增索引、外键或 RLS 策略；查询/切换留到后续阶段。
--
-- 变更内容：
--   1. 前置断言：erp.sales_orders 存在。
--   2. 新增 company_id uuid（可空、无默认，幂等）。
--   3. 写 NULL 语义 COMMENT。
--   4. 后置断言：列存在、类型 uuid、可空、无默认。
--
-- 影响：回滚会直接 DROP COLUMN（见 rollback 文件），列内已写入的公司归属
--   会随列一起丢失；回滚前需确认下游（v2 投影/对账脚本）已停止依赖该列。
-- 幂等性：ADD COLUMN IF NOT EXISTS；文件内不含 BEGIN/COMMIT。
-- 回滚：database/rollback/20261123140000_erp_sales_orders_company_id.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DO $w13_sales_company$
BEGIN
    IF to_regclass('erp.sales_orders') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp.sales_orders 不存在';
    END IF;

    EXECUTE 'ALTER TABLE erp.sales_orders '
         || 'ADD COLUMN IF NOT EXISTS company_id uuid';

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'erp'
           AND table_name = 'sales_orders'
           AND column_name = 'company_id'
           AND data_type = 'uuid'
           AND is_nullable = 'YES'
           AND column_default IS NULL
    ) THEN
        RAISE NOTICE 'W13: erp.sales_orders.company_id 已就绪（uuid, 可空, 无默认）';
    ELSE
        RAISE EXCEPTION '后置断言失败：erp.sales_orders.company_id 类型/可空/默认不符合预期';
    END IF;
END
$w13_sales_company$;

COMMENT ON COLUMN erp.sales_orders.company_id IS
    '归属公司（W13）：新建时写入请求公司上下文；历史行为 NULL，待业务清单回填后另行收紧 NOT NULL';
