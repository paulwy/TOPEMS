-- B218 · 财务 v54/v55/v58/v60 状态列候选约束（NOT VALID）
--
-- 四列代码侧早已收敛到模块内枚举，但都没有 DB CHECK：
--   finance.finance_v54_review_workflows.status      ReviewWorkflowStatus (risk_v54.rs)
--   finance.finance_v55_payment_results.status       PaymentStatus        (settlement_v55.rs)
--   finance.finance_v58_pool_transfers.status        TransferStatus       (treasury_v58.rs)
--   finance.finance_v60_schedule_executions.status   ScheduleExecutionStatus (decision_v60.rs)
--
-- 本地 topems 已应用（四表均 0 行存量；bogus 写入被拒）。
-- 生产发布前先按表核对值分布。

ALTER TABLE finance.finance_v54_review_workflows
  ADD CONSTRAINT ck_finance_v54_review_workflows_status_standard
  CHECK (status IS NULL OR status IN ('pending', 'in_progress', 'completed', 'rejected'))
  NOT VALID;

ALTER TABLE finance.finance_v55_payment_results
  ADD CONSTRAINT ck_finance_v55_payment_results_status_standard
  CHECK (status IS NULL OR status IN ('pending', 'processing', 'completed', 'failed', 'reversed'))
  NOT VALID;

ALTER TABLE finance.finance_v58_pool_transfers
  ADD CONSTRAINT ck_finance_v58_pool_transfers_status_standard
  CHECK (status IS NULL OR status IN ('pending', 'completed', 'failed'))
  NOT VALID;

ALTER TABLE finance.finance_v60_schedule_executions
  ADD CONSTRAINT ck_finance_v60_schedule_executions_status_standard
  CHECK (status IS NULL OR status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE finance.finance_v54_review_workflows DROP CONSTRAINT IF EXISTS ck_finance_v54_review_workflows_status_standard;
-- ALTER TABLE finance.finance_v55_payment_results DROP CONSTRAINT IF EXISTS ck_finance_v55_payment_results_status_standard;
-- ALTER TABLE finance.finance_v58_pool_transfers DROP CONSTRAINT IF EXISTS ck_finance_v58_pool_transfers_status_standard;
-- ALTER TABLE finance.finance_v60_schedule_executions DROP CONSTRAINT IF EXISTS ck_finance_v60_schedule_executions_status_standard;
