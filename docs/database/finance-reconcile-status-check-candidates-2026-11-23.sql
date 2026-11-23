-- B219 · 对账订单 / 明细状态候选约束（NOT VALID）
--
-- 值集来源 svc/finance/src/modules/reconcile_status.rs
--   ReconcileOrderStatus::DB_VALUES = draft / pending / confirmed / disputed / cancelled（默认 pending）
--   ReconcileItemStatus::DB_VALUES  = unmatched / matched / disputed（默认 unmatched）
--
-- 本地 topems 已应用（两表均 0 行存量；bogus 被拒）。
-- 生产发布前先核对值分布，再按窗口执行。

ALTER TABLE finance.reconcile_orders
  ADD CONSTRAINT ck_reconcile_orders_status_standard
  CHECK (status IS NULL OR status IN ('draft', 'pending', 'confirmed', 'disputed', 'cancelled'))
  NOT VALID;

ALTER TABLE finance.reconcile_items
  ADD CONSTRAINT ck_reconcile_items_status_standard
  CHECK (status IS NULL OR status IN ('unmatched', 'matched', 'disputed'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE finance.reconcile_orders DROP CONSTRAINT IF EXISTS ck_reconcile_orders_status_standard;
-- ALTER TABLE finance.reconcile_items DROP CONSTRAINT IF EXISTS ck_reconcile_items_status_standard;
