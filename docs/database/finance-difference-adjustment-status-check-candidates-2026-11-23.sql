-- B216 · finance.difference_adjustments.status 候选约束（NOT VALID）
--
-- 值集来自 svc/finance/src/modules/settlement_center_status.rs
--   DifferenceAdjustmentStatus::DB_VALUES = pending / approved / rejected
--
-- 本地 topems 已应用（0 行存量数据，bogus 插入被拒）。
-- 生产发布时按窗口执行，再考虑 VALIDATE CONSTRAINT。
--
-- 前置核对（生产只读快照 topems_prod_verify_20261106）：
--   SELECT status, count(*) FROM finance.difference_adjustments GROUP BY 1;

ALTER TABLE finance.difference_adjustments
  ADD CONSTRAINT ck_difference_adjustments_status_standard
  CHECK (status IS NULL OR status IN ('pending', 'approved', 'rejected'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE finance.difference_adjustments
--   DROP CONSTRAINT IF EXISTS ck_difference_adjustments_status_standard;

-- 关联表 finance.reconciliation_settlement_links.status 的约束
-- ck_reconciliation_settlement_links_status_standard（linked / cancelled，NOT VALID）
-- 已在 B10 应用，见 docs/database/finance-settlement-link-status-check-candidates-2026-11-22.sql。
