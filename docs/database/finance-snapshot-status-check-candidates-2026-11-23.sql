-- B213：Finance 对账/结算本地快照状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/finance/src/modules/finance_snapshot_status.rs
--   finance.reconciliation_snapshots.status -> ReconciliationSnapshotStatus
--       pending / draft / matched / approved
--       来源：ERP 对账事件 payload.status（FinReconciliationStatus，B211）、本地创建 draft、本地审批 approved
--   finance.settlement_snapshots.status     -> SettlementSnapshotStatus
--       pending / draft / approved / rejected
--       来源：PM 结算事件 payload.status、本地创建 draft、本地审批 approved、本地驳回 rejected
-- 两列均为 text 可空（历史同步可能留下 NULL）；本约束只约束非 NULL 新写入，
-- NULL 行仍由调用方按"未知"处理，不在本批补值范围内。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE finance.reconciliation_snapshots
    ADD CONSTRAINT ck_finance_reconciliation_snapshots_status_standard
    CHECK (status IN ('pending', 'draft', 'matched', 'approved')) NOT VALID;

COMMENT ON CONSTRAINT ck_finance_reconciliation_snapshots_status_standard
    ON finance.reconciliation_snapshots
    IS '状态值域由 svc/finance/src/modules/finance_snapshot_status.rs 定义（B213）';

ALTER TABLE finance.settlement_snapshots
    ADD CONSTRAINT ck_finance_settlement_snapshots_status_standard
    CHECK (status IN ('pending', 'draft', 'approved', 'rejected')) NOT VALID;

COMMENT ON CONSTRAINT ck_finance_settlement_snapshots_status_standard
    ON finance.settlement_snapshots
    IS '状态值域由 svc/finance/src/modules/finance_snapshot_status.rs 定义（B213）';

COMMIT;
