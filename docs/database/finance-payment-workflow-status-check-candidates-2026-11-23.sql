-- B217 · 付款单工作流 / 明细核销状态候选约束（NOT VALID）
--
-- 值集来源：
--   PaymentWorkflowStatus    svc/finance/src/modules/payment_workflow_status.rs
--                            （镜像 unified-core WorkflowInstanceStatus，8 值）
--   PaymentItemWriteOffStatus svc/finance/src/modules/payment_item_write_off_status.rs（pending/completed）
--
-- 本地 topems 已应用（两表均 0 行存量；bogus 被拒）。
-- 生产发布前先核对值分布，再按窗口执行。

ALTER TABLE finance.core_finance_payment_workflow
  ADD CONSTRAINT ck_core_finance_payment_workflow_status_standard
  CHECK (status IS NULL OR status IN (
    'pending', 'running', 'approved', 'rejected',
    'cancelled', 'suspended', 'completed', 'error'
  ))
  NOT VALID;

ALTER TABLE finance.core_finance_payment_items
  ADD CONSTRAINT ck_core_finance_payment_items_write_off_status_standard
  CHECK (write_off_status IS NULL OR write_off_status IN ('pending', 'completed'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE finance.core_finance_payment_workflow DROP CONSTRAINT IF EXISTS ck_core_finance_payment_workflow_status_standard;
-- ALTER TABLE finance.core_finance_payment_items DROP CONSTRAINT IF EXISTS ck_core_finance_payment_items_write_off_status_standard;
