-- B33 · mes.work_orders.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/work_order_status.rs（pending/in_progress/paused/completed/cancelled）
-- 写入方：work_order.rs（create 绑 DEFAULT；start/complete/cancel/pause/resume 绑目标态 + 起始态 ANY 谓词；delete 软删仅 pending|cancelled）
-- 预检：本地 56 行全 completed，集合外 0。
-- 回滚：文件末尾。

ALTER TABLE mes.work_orders
  ADD CONSTRAINT work_orders_status_check
  CHECK (status = ANY (ARRAY['pending','in_progress','paused','completed','cancelled']))
  NOT VALID;

-- 窗口内（存量清理后）：
-- ALTER TABLE mes.work_orders VALIDATE CONSTRAINT work_orders_status_check;
-- 回滚：
-- ALTER TABLE mes.work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   UPDATE completed→'bogus' → 23514
--   pending→in_progress→paused→in_progress→completed 链 → 每条 UPDATE 1
