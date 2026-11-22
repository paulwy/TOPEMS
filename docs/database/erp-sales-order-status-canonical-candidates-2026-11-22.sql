-- B139 · erp.sales_orders.status 历史 confirmed 归一 + 六值约束候选 DDL
-- 值集来源：svc/erp/src/modules/sales_order_status.rs（SalesOrderStatus）
-- 本地：17 行（draft 16 / confirmed 1），NOT NULL DEFAULT 'draft'，无 CHECK。
-- 生产快照：0 行，NOT NULL DEFAULT 'draft'，无 CHECK。
-- 历史 confirmed 在应用层已按 approved 读写；本候选先把库值归一，再加约束，
-- 避免 NOT VALID 约束放行存量却拦截该行任何 UPDATE。

UPDATE erp.sales_orders SET status = 'approved' WHERE status = 'confirmed';
ALTER TABLE erp.sales_orders ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE erp.sales_orders ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'erp.sales_orders'::regclass
      AND conname = 'sales_orders_status_check'
  ) THEN
    ALTER TABLE erp.sales_orders
      ADD CONSTRAINT sales_orders_status_check
      CHECK (status = ANY (ARRAY['draft','pending','approved','shipped','completed','cancelled']))
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN erp.sales_orders.status IS '状态：draft, pending, approved, shipped, completed, cancelled';

-- 窗口内验证：
-- ALTER TABLE erp.sales_orders VALIDATE CONSTRAINT sales_orders_status_check;
-- 回滚：
-- ALTER TABLE erp.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
