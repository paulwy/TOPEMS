-- finance 状态唯一集合候选 CHECK（W5-B B4～B16 代码已收口，DB 尚未加约束）
-- 生成日期：2026-11-21
-- 状态：候选，未在生产执行。生产执行需窗口，且先跑第 0 节盘点，确认无违例行。
--
-- 执行方式（建议）：
--   1) 先跑第 0 节预检，每个查询都必须返回 0；
--   2) 在一个事务里执行第 1 节全部 ALTER（NOT VALID 不扫描存量，只约束后续写入）；
--   3) 观察一个发布周期无 23514 后，再对关键表执行 VALIDATE CONSTRAINT。
--
-- 说明：
--   - NOT VALID 只对新写入/更新生效，不会因历史脏值阻塞；但脏值一旦被更新仍会触发。
--   - 可空列的 NULL 在 CHECK 里按 unknown 处理，视为通过，因此历史 NULL（如
--     erp_collection_records 351 行 NULL）不会被拦截，读取侧仍走 COALESCE(status,'pending')。

-- ============ 0. 预检（每条必须返回 0 行） ============

-- 0.1 应收 / 应付
SELECT 'receivables', status, count(*) FROM finance.receivables
 WHERE status IS NOT NULL AND status NOT IN ('draft','approved','posted','cancelled') GROUP BY 2;
SELECT 'payables', status, count(*) FROM finance.payables
 WHERE status IS NOT NULL AND status NOT IN ('draft','approved','posted','cancelled') GROUP BY 2;

-- 0.2 对账订单 / 明细
SELECT 'reconcile_orders', status, count(*) FROM finance.reconcile_orders
 WHERE status NOT IN ('draft','pending','confirmed','disputed','cancelled') GROUP BY 2;
SELECT 'reconcile_items', status, count(*) FROM finance.reconcile_items
 WHERE status NOT IN ('unmatched','matched','disputed') GROUP BY 2;

-- 0.3 财务报表双列
SELECT 'financial_reports.status', status, count(*) FROM finance.financial_reports
 WHERE status NOT IN ('draft','pending','approved','rejected','locked') GROUP BY 2;
SELECT 'financial_reports.approval_status', approval_status, count(*) FROM finance.financial_reports
 WHERE approval_status NOT IN ('draft','pending','approved','rejected','locked') GROUP BY 2;

-- 0.4 收款记录
SELECT 'erp_collection_records', status, count(*) FROM finance.erp_collection_records
 WHERE status IS NOT NULL AND status NOT IN ('pending','confirmed','written_off') GROUP BY 2;

-- 0.5 付款单 / 付款明细核销
SELECT 'core_finance_payments', status, count(*) FROM finance.core_finance_payments
 WHERE status NOT IN ('draft','pending','processing','completed','failed','cancelled') GROUP BY 2;
SELECT 'core_finance_payment_items', write_off_status, count(*) FROM finance.core_finance_payment_items
 WHERE write_off_status IS NOT NULL AND write_off_status NOT IN ('pending','completed') GROUP BY 2;

-- 0.6 对账中心关联 / 快照 / 差异调整
SELECT 'reconciliation_settlement_links', status, count(*) FROM finance.reconciliation_settlement_links
 WHERE status NOT IN ('linked','cancelled') GROUP BY 2;
SELECT 'reconciliation_item_snapshots', match_status, count(*) FROM finance.reconciliation_item_snapshots
 WHERE match_status IS NOT NULL AND match_status NOT IN ('unmatched','matched','diff','manual') GROUP BY 2;
SELECT 'difference_adjustments', status, count(*) FROM finance.difference_adjustments
 WHERE status NOT IN ('pending','approved','rejected') GROUP BY 2;

-- 0.7 v60 决策 / 调度
SELECT 'finance_v60_decision_scenarios', status, count(*) FROM finance.finance_v60_decision_scenarios
 WHERE status NOT IN ('draft','active','evaluated','archived') GROUP BY 2;
SELECT 'finance_v60_schedule_tasks', status, count(*) FROM finance.finance_v60_schedule_tasks
 WHERE status NOT IN ('pending','running','paused','completed','failed') GROUP BY 2;
SELECT 'finance_v60_schedule_executions', status, count(*) FROM finance.finance_v60_schedule_executions
 WHERE status NOT IN ('pending','running','completed','failed','cancelled') GROUP BY 2;

-- 0.8 v54 审核工作流
SELECT 'finance_v54_review_workflows', status, count(*) FROM finance.finance_v54_review_workflows
 WHERE status NOT IN ('pending','in_progress','completed','rejected') GROUP BY 2;

-- 0.9 v55 发票 / 支付 / 对账
SELECT 'finance_v55_invoices', status, count(*) FROM finance.finance_v55_invoices
 WHERE status NOT IN ('pending','recognized','verified','posted') GROUP BY 2;
SELECT 'finance_v55_payment_results', status, count(*) FROM finance.finance_v55_payment_results
 WHERE status NOT IN ('pending','processing','completed','failed','reversed') GROUP BY 2;
SELECT 'finance_v55_reconciliation_results', match_status, count(*) FROM finance.finance_v55_reconciliation_results
 WHERE match_status NOT IN ('matched','partial','unmatched','discrepancy') GROUP BY 2;

-- 0.10 v56 税务表单 / 筹划
SELECT 'finance_v56_tax_forms', status, count(*) FROM finance.finance_v56_tax_forms
 WHERE status NOT IN ('draft','calculated','submitted','accepted','rejected') GROUP BY 2;
SELECT 'finance_v56_tax_plans', status, count(*) FROM finance.finance_v56_tax_plans
 WHERE status NOT IN ('draft','proposed','under_review','approved','rejected','executed') GROUP BY 2;

-- 0.11 v57 报表 / v58 划转
SELECT 'finance_v57_generated_reports', status, count(*) FROM finance.finance_v57_generated_reports
 WHERE status NOT IN ('pending','generating','completed','failed') GROUP BY 2;
SELECT 'finance_v58_pool_transfers', status, count(*) FROM finance.finance_v58_pool_transfers
 WHERE status NOT IN ('pending','completed','failed') GROUP BY 2;

-- 0.12 费用审批 / 报销
SELECT 'expense_approvals', status, count(*) FROM finance.expense_approvals
 WHERE status IS NOT NULL AND status NOT IN ('draft','pending','approved','rejected','reimbursed') GROUP BY 2;
SELECT 'expenses', status, count(*) FROM finance.expenses
 WHERE status IS NOT NULL AND status NOT IN ('draft','submitted','approved','rejected','paid') GROUP BY 2;

-- ============ 1. 约束（事务内执行） ============

ALTER TABLE finance.receivables
  ADD CONSTRAINT receivables_status_check
  CHECK (status IN ('draft','approved','posted','cancelled')) NOT VALID;

ALTER TABLE finance.payables
  ADD CONSTRAINT payables_status_check
  CHECK (status IN ('draft','approved','posted','cancelled')) NOT VALID;

ALTER TABLE finance.reconcile_orders
  ADD CONSTRAINT reconcile_orders_status_check
  CHECK (status IN ('draft','pending','confirmed','disputed','cancelled')) NOT VALID;

ALTER TABLE finance.reconcile_items
  ADD CONSTRAINT reconcile_items_status_check
  CHECK (status IN ('unmatched','matched','disputed')) NOT VALID;

ALTER TABLE finance.financial_reports
  ADD CONSTRAINT financial_reports_status_check
  CHECK (status IN ('draft','pending','approved','rejected','locked')) NOT VALID;
ALTER TABLE finance.financial_reports
  ADD CONSTRAINT financial_reports_approval_status_check
  CHECK (approval_status IN ('draft','pending','approved','rejected','locked')) NOT VALID;

ALTER TABLE finance.erp_collection_records
  ADD CONSTRAINT erp_collection_records_status_check
  CHECK (status IS NULL OR status IN ('pending','confirmed','written_off')) NOT VALID;

ALTER TABLE finance.core_finance_payments
  ADD CONSTRAINT core_finance_payments_status_check
  CHECK (status IN ('draft','pending','processing','completed','failed','cancelled')) NOT VALID;

ALTER TABLE finance.core_finance_payment_items
  ADD CONSTRAINT payment_items_write_off_status_check
  CHECK (write_off_status IS NULL OR write_off_status IN ('pending','completed')) NOT VALID;

ALTER TABLE finance.reconciliation_settlement_links
  ADD CONSTRAINT settlement_links_status_check
  CHECK (status IN ('linked','cancelled')) NOT VALID;

ALTER TABLE finance.reconciliation_item_snapshots
  ADD CONSTRAINT item_snapshots_match_status_check
  CHECK (match_status IS NULL OR match_status IN ('unmatched','matched','diff','manual')) NOT VALID;

ALTER TABLE finance.difference_adjustments
  ADD CONSTRAINT difference_adjustments_status_check
  CHECK (status IN ('pending','approved','rejected')) NOT VALID;

ALTER TABLE finance.finance_v60_decision_scenarios
  ADD CONSTRAINT v60_decision_scenarios_status_check
  CHECK (status IN ('draft','active','evaluated','archived')) NOT VALID;

ALTER TABLE finance.finance_v60_schedule_tasks
  ADD CONSTRAINT v60_schedule_tasks_status_check
  CHECK (status IN ('pending','running','paused','completed','failed')) NOT VALID;

ALTER TABLE finance.finance_v60_schedule_executions
  ADD CONSTRAINT v60_schedule_executions_status_check
  CHECK (status IN ('pending','running','completed','failed','cancelled')) NOT VALID;

ALTER TABLE finance.finance_v54_review_workflows
  ADD CONSTRAINT v54_review_workflows_status_check
  CHECK (status IN ('pending','in_progress','completed','rejected')) NOT VALID;

ALTER TABLE finance.finance_v55_invoices
  ADD CONSTRAINT v55_invoices_status_check
  CHECK (status IN ('pending','recognized','verified','posted')) NOT VALID;

ALTER TABLE finance.finance_v55_payment_results
  ADD CONSTRAINT v55_payment_results_status_check
  CHECK (status IN ('pending','processing','completed','failed','reversed')) NOT VALID;

ALTER TABLE finance.finance_v55_reconciliation_results
  ADD CONSTRAINT v55_recon_results_match_status_check
  CHECK (match_status IN ('matched','partial','unmatched','discrepancy')) NOT VALID;

ALTER TABLE finance.finance_v56_tax_forms
  ADD CONSTRAINT v56_tax_forms_status_check
  CHECK (status IN ('draft','calculated','submitted','accepted','rejected')) NOT VALID;

ALTER TABLE finance.finance_v56_tax_plans
  ADD CONSTRAINT v56_tax_plans_status_check
  CHECK (status IN ('draft','proposed','under_review','approved','rejected','executed')) NOT VALID;

ALTER TABLE finance.finance_v57_generated_reports
  ADD CONSTRAINT v57_generated_reports_status_check
  CHECK (status IN ('pending','generating','completed','failed')) NOT VALID;

ALTER TABLE finance.finance_v58_pool_transfers
  ADD CONSTRAINT v58_pool_transfers_status_check
  CHECK (status IN ('pending','completed','failed')) NOT VALID;

ALTER TABLE finance.expense_approvals
  ADD CONSTRAINT expense_approvals_status_check
  CHECK (status IS NULL OR status IN ('draft','pending','approved','rejected','reimbursed')) NOT VALID;

ALTER TABLE finance.expenses
  ADD CONSTRAINT expenses_status_check
  CHECK (status IS NULL OR status IN ('draft','submitted','approved','rejected','paid')) NOT VALID;

-- ============ 2. 回滚（单独使用） ============
-- ALTER TABLE finance.receivables DROP CONSTRAINT IF EXISTS receivables_status_check;
-- ALTER TABLE finance.payables DROP CONSTRAINT IF EXISTS payables_status_check;
-- ALTER TABLE finance.reconcile_orders DROP CONSTRAINT IF EXISTS reconcile_orders_status_check;
-- ALTER TABLE finance.reconcile_items DROP CONSTRAINT IF EXISTS reconcile_items_status_check;
-- ALTER TABLE finance.financial_reports DROP CONSTRAINT IF EXISTS financial_reports_status_check, DROP CONSTRAINT IF EXISTS financial_reports_approval_status_check;
-- ALTER TABLE finance.erp_collection_records DROP CONSTRAINT IF EXISTS erp_collection_records_status_check;
-- ALTER TABLE finance.core_finance_payments DROP CONSTRAINT IF EXISTS core_finance_payments_status_check;
-- ALTER TABLE finance.core_finance_payment_items DROP CONSTRAINT IF EXISTS payment_items_write_off_status_check;
-- ALTER TABLE finance.reconciliation_settlement_links DROP CONSTRAINT IF EXISTS settlement_links_status_check;
-- ALTER TABLE finance.reconciliation_item_snapshots DROP CONSTRAINT IF EXISTS item_snapshots_match_status_check;
-- ALTER TABLE finance.difference_adjustments DROP CONSTRAINT IF EXISTS difference_adjustments_status_check;
-- ALTER TABLE finance.finance_v60_decision_scenarios DROP CONSTRAINT IF EXISTS v60_decision_scenarios_status_check;
-- ALTER TABLE finance.finance_v60_schedule_tasks DROP CONSTRAINT IF EXISTS v60_schedule_tasks_status_check;
-- ALTER TABLE finance.finance_v60_schedule_executions DROP CONSTRAINT IF EXISTS v60_schedule_executions_status_check;
-- ALTER TABLE finance.finance_v54_review_workflows DROP CONSTRAINT IF EXISTS v54_review_workflows_status_check;
-- ALTER TABLE finance.finance_v55_invoices DROP CONSTRAINT IF EXISTS v55_invoices_status_check;
-- ALTER TABLE finance.finance_v55_payment_results DROP CONSTRAINT IF EXISTS v55_payment_results_status_check;
-- ALTER TABLE finance.finance_v55_reconciliation_results DROP CONSTRAINT IF EXISTS v55_recon_results_match_status_check;
-- ALTER TABLE finance.finance_v56_tax_forms DROP CONSTRAINT IF EXISTS v56_tax_forms_status_check;
-- ALTER TABLE finance.finance_v56_tax_plans DROP CONSTRAINT IF EXISTS v56_tax_plans_status_check;
-- ALTER TABLE finance.finance_v57_generated_reports DROP CONSTRAINT IF EXISTS v57_generated_reports_status_check;
-- ALTER TABLE finance.finance_v58_pool_transfers DROP CONSTRAINT IF EXISTS v58_pool_transfers_status_check;
-- ALTER TABLE finance.expense_approvals DROP CONSTRAINT IF EXISTS expense_approvals_status_check;
-- ALTER TABLE finance.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
