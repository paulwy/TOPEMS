-- B134 · crm.customer_orders.status 状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/customer_order_status.rs（CustomerOrderStatus）
-- 台账由 SalesOrderCreated 事件写入；历史 confirmed 在应用层归一为 approved，不进入库值集。
-- 本地：16 行全 draft，NOT NULL DEFAULT 'completed'，无 CHECK。
-- 生产快照：0 行，nullable DEFAULT 'completed'，无 CHECK。

UPDATE crm.customer_orders SET status = 'draft' WHERE status IS NULL;
ALTER TABLE crm.customer_orders ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE crm.customer_orders ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.customer_orders'::regclass
      AND conname = 'ck_customer_orders_status_standard'
  ) THEN
    ALTER TABLE crm.customer_orders
      ADD CONSTRAINT ck_customer_orders_status_standard
      CHECK (status = ANY (ARRAY['draft','pending','approved','shipped','completed','cancelled']))
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN crm.customer_orders.status IS '状态：draft, pending, approved, shipped, completed, cancelled';

-- 窗口内验证：
-- ALTER TABLE crm.customer_orders VALIDATE CONSTRAINT ck_customer_orders_status_standard;
-- 回滚：
-- ALTER TABLE crm.customer_orders DROP CONSTRAINT IF EXISTS ck_customer_orders_status_standard;
-- ALTER TABLE crm.customer_orders ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.customer_orders ALTER COLUMN status DROP DEFAULT;
