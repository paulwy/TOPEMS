-- B34 · mes.production_orders.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/production_order_status.rs
-- 规范 7 态：pending/released/in_progress/paused/completed/closed/cancelled
-- 历史遗留 planned（本地 67 行、当前无写入方）保留在集合内，仅允许取消；清理后再评估移除。
-- 写入方：production_order.rs（release/start/complete/cancel + update/delete 谓词）、event_handlers.rs（创建 pending）。
-- 预检（本地 134 行）：pending 52 / planned 67 / released 10 / in_progress 5，集合外 0。
-- B95：读取侧已加八值过滤并严格校验列表参数；注意 DB 列默认值仍为历史 'created'，
--      代码创建显式写 'pending'，窗口内应把默认值改为 'pending' 后再 VALIDATE。
-- 回滚：文件末尾。

ALTER TABLE mes.production_orders
  ADD CONSTRAINT production_orders_status_check
  CHECK (status = ANY (ARRAY['pending','released','in_progress','paused','completed','closed','cancelled','planned']))
  NOT VALID;

-- 窗口内（存量清理后）：
-- ALTER TABLE mes.production_orders VALIDATE CONSTRAINT production_orders_status_check;
-- 回滚：
-- ALTER TABLE mes.production_orders DROP CONSTRAINT IF EXISTS production_orders_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   pending→'bogus' → 23514
--   pending→released→in_progress→completed 链 → 每条 UPDATE 1
--   completed→cancelled → UPDATE 0（终态守卫生效）

-- 遗留清理候选（需业务确认 planned 语义后执行）：
-- UPDATE mes.production_orders SET status='pending', updated_at=NOW() WHERE status='planned';
