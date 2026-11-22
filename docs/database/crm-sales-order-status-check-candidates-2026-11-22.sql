-- B136 · crm.sales_orders.status 状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/sales_order_status.rs（SalesOrderStatus）
-- 本地：0 行，NOT NULL DEFAULT 'pending'，无 CHECK。
-- 生产快照：0 行，nullable DEFAULT 'pending'，无 CHECK。

UPDATE crm.sales_orders SET status = 'pending' WHERE status IS NULL;
ALTER TABLE crm.sales_orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE crm.sales_orders ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.sales_orders'::regclass
      AND conname = 'ck_sales_orders_status_standard'
  ) THEN
    ALTER TABLE crm.sales_orders
      ADD CONSTRAINT ck_sales_orders_status_standard
      CHECK (status = ANY (ARRAY['draft','pending','approved','shipped','completed','cancelled']))
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN crm.sales_orders.status IS '状态：draft, pending, approved, shipped, completed, cancelled';

-- 窗口内验证：
-- ALTER TABLE crm.sales_orders VALIDATE CONSTRAINT ck_sales_orders_status_standard;
-- 回滚：
-- ALTER TABLE crm.sales_orders DROP CONSTRAINT IF EXISTS ck_sales_orders_status_standard;
-- ALTER TABLE crm.sales_orders ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.sales_orders ALTER COLUMN status DROP DEFAULT;
