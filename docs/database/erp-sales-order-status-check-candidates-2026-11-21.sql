-- B27 · erp.sales_orders.status 唯一集合候选 DDL（全部 NOT VALID）
-- 值集来源：svc/erp/src/modules/sales_order_status.rs（draft/pending/approved/shipped/completed/cancelled）
-- 前置：生产执行前先跑「预检」，确认存量无 'confirmed' 等集合外值；VALIDATE 前必须清零。
-- 回滚：见文件末尾。

-- ── 预检（只读）────────────────────────────────────────────
-- 1) 集合外存量
--    SELECT status, count(*) FROM erp.sales_orders
--     WHERE deleted_at IS NULL
--       AND status <> ALL (ARRAY['draft','pending','approved','shipped','completed','cancelled'])
--     GROUP BY status;
--    本地已知：SO-TEST-0001 = 'confirmed'（1 行测试种子，B27 前不计入集合，VALIDATE 前需人工修订）
--    ⚠️ NOT VALID 只放过存量行，不放过对存量行的 UPDATE：该行只要被任何 UPDATE 触及
--       （包括 status = status）都会 23514。所以生产执行前必须先修数据：
--       UPDATE erp.sales_orders SET status = 'approved' WHERE status = 'confirmed';  -- 业务确认后
-- 2) 空值
--    SELECT count(*) FROM erp.sales_orders WHERE deleted_at IS NULL AND status IS NULL;

-- ── 本地演练记录（2026-11-21，事务内，均 ROLLBACK）────────
-- precheck: confirmed = 1
-- txn A 加约束 + INSERT status='bogus' → 23514 拦截；回滚残留 0
-- txn B 加约束 + UPDATE draft→approved    → UPDATE 1；回滚残留 0
-- txn C 加约束 + UPDATE confirmed=confirmed → 23514（见上，存量行 UPDATE 被拦）；回滚残留 0

-- ── 约束（NOT VALID：只拦新写入，不校验存量）──────────────
ALTER TABLE erp.sales_orders
  ADD CONSTRAINT sales_orders_status_check
  CHECK (status = ANY (ARRAY['draft','pending','approved','shipped','completed','cancelled']))
  NOT VALID;

-- ── 后续（窗口内、存量清理后）───────────────────────────
-- ALTER TABLE erp.sales_orders VALIDATE CONSTRAINT sales_orders_status_check;

-- ── 回滚 ────────────────────────────────────────────────
-- ALTER TABLE erp.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
