-- B30 · erp.receivables.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/erp/src/modules/receivable_status.rs（pending/paid）
-- 写入方仅事件消费者：销售订单创建应收（pending）、收款核销（pending→paid）。
-- 预检：本地 5 行全为 pending，集合外 0。
-- 回滚：文件末尾。

ALTER TABLE erp.receivables
  ADD CONSTRAINT receivables_status_check
  CHECK (status = ANY (ARRAY['pending','paid']))
  NOT VALID;

-- 窗口内（存量清理后）：
-- ALTER TABLE erp.receivables VALIDATE CONSTRAINT receivables_status_check;

-- 回滚：
-- ALTER TABLE erp.receivables DROP CONSTRAINT IF EXISTS receivables_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   UPDATE pending→'bogus' → 23514
--   UPDATE pending→paid    → UPDATE 1
