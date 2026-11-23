-- ============================================================
-- 20261123131000_erp_purchase_orders_company_id.sql
--
-- W13 第一阶段：erp.purchase_orders 补公司归属列（company_id）
--
-- 口径与 20261123130000（sales_orders）一致：
--   * 本轮只补列，允许 NULL；历史行等业务清单回填后再单独收紧 NOT NULL。
--   * 新建路径写入请求公司上下文，缺上下文 fail-closed，不静默置空。
--   * 本轮不新增索引、外键或 RLS 策略。
--
-- 变更内容：
--   1. 前置断言：erp.purchase_orders 存在。
--   2. 新增 company_id uuid（可空、无默认，幂等）。
--   3. 写 NULL 语义 COMMENT。
--   4. 后置断言：列存在、类型 uuid、可空、无默认。
--
-- 影响：回滚会直接 DROP COLUMN，列内公司归属随列丢失。
-- 幂等性：ADD COLUMN IF NOT EXISTS；文件内不含 BEGIN/COMMIT。
-- 回滚：database/rollback/20261123131000_erp_purchase_orders_company_id.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DO $w13_purchase_company$
BEGIN
    IF to_regclass('erp.purchase_orders') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：erp.purchase_orders 不存在';
    END IF;

    EXECUTE 'ALTER TABLE erp.purchase_orders '
         || 'ADD COLUMN IF NOT EXISTS company_id uuid';

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'erp'
           AND table_name = 'purchase_orders'
           AND column_name = 'company_id'
           AND data_type = 'uuid'
           AND is_nullable = 'YES'
           AND column_default IS NULL
    ) THEN
        RAISE NOTICE 'W13: erp.purchase_orders.company_id 已就绪（uuid, 可空, 无默认）';
    ELSE
        RAISE EXCEPTION '后置断言失败：erp.purchase_orders.company_id 类型/可空/默认不符合预期';
    END IF;
END
$w13_purchase_company$;

COMMENT ON COLUMN erp.purchase_orders.company_id IS
    '归属公司（W13）：新建时写入请求公司上下文；历史行为 NULL，待业务清单回填后另行收紧 NOT NULL';
