-- B140 · finance.expense_approvals.status 状态收敛候选 DDL
-- 值集来源：svc/finance/src/modules/expense_status.rs（ExpenseApprovalStatus）
-- draft → pending；pending → approved/rejected；approved → reimbursed；
-- rejected/reimbursed 终态。新建默认 draft，提交后进入 pending。
-- 本地：178 行全 pending，nullable 默认 pending，无 CHECK。
-- 生产快照：未应用；发布窗口执行后需 VALIDATE。

ALTER TABLE finance.expense_approvals
  DROP CONSTRAINT IF EXISTS ck_expense_approvals_status_standard;

UPDATE finance.expense_approvals SET status = 'draft' WHERE status IS NULL;
ALTER TABLE finance.expense_approvals ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE finance.expense_approvals ALTER COLUMN status SET NOT NULL;

ALTER TABLE finance.expense_approvals
  ADD CONSTRAINT ck_expense_approvals_status_standard
  CHECK (status = ANY (ARRAY['draft','pending','approved','rejected','reimbursed']))
  NOT VALID;

COMMENT ON COLUMN finance.expense_approvals.status IS '状态：draft, pending, approved, rejected, reimbursed';

-- 窗口内验证：
-- ALTER TABLE finance.expense_approvals VALIDATE CONSTRAINT ck_expense_approvals_status_standard;
-- 回滚：
-- ALTER TABLE finance.expense_approvals DROP CONSTRAINT IF EXISTS ck_expense_approvals_status_standard;
-- ALTER TABLE finance.expense_approvals ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE finance.expense_approvals ALTER COLUMN status SET DEFAULT 'pending';
