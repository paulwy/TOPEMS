-- B28 · erp.purchase_orders.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/erp/src/modules/purchase_order_status.rs（pending/approved/cancelled）
-- 前置预检：
--   SELECT status, count(*) FROM erp.purchase_orders
--    WHERE deleted_at IS NULL
--      AND status <> ALL (ARRAY['pending','approved','cancelled'])
--    GROUP BY status;
--   本地：表 0 行。
-- 回滚：文件末尾。

ALTER TABLE erp.purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status = ANY (ARRAY['pending','approved','cancelled']))
  NOT VALID;

-- 窗口内（存量清理后）：
-- ALTER TABLE erp.purchase_orders VALIDATE CONSTRAINT purchase_orders_status_check;

-- 回滚：
-- ALTER TABLE erp.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

-- 本地演练记录（2026-11-21，事务内 ROLLBACK，残留 0）：
--   INSERT status='bogus'  → 23514 拦截
--   INSERT status='pending' → 成功
--   UPDATE pending → approved → UPDATE 1
