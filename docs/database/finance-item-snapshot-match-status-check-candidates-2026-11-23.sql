-- B220 · 对账明细快照 match_status 候选约束（NOT VALID）
--
-- 值集来源 svc/finance/src/modules/settlement_center_status.rs
--   SnapshotMatchStatus::DB_VALUES = unmatched / matched / diff / manual
-- 列可空、无默认值；SQL 侧把 NULL 按 unmatched 处理。
--
-- 本地 topems 已应用（0 行存量；bogus 被拒）。

ALTER TABLE finance.reconciliation_item_snapshots
  ADD CONSTRAINT ck_reconciliation_item_snapshots_match_status_standard
  CHECK (match_status IS NULL OR match_status IN ('unmatched', 'matched', 'diff', 'manual'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE finance.reconciliation_item_snapshots DROP CONSTRAINT IF EXISTS ck_reconciliation_item_snapshots_match_status_standard;
