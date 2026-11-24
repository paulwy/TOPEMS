-- B274: 收口 finance.expenses.status 值域与可空性
-- 背景：ExpenseStatus 五态代码侧已存在，但列可空、CHECK 仍带 status IS NULL 豁免；
--   update_expense 直接写 status，且请求省略 status 时会把列写成 NULL。
-- 处置：NULL 归 draft，默认值固定 draft，SET NOT NULL，重建精确五态 CHECK 并 VALIDATE。
-- 回滚：database/rollback/20261125004000_finance_expense_status_standard.rollback.sql

ALTER TABLE finance.expenses
    ALTER COLUMN status SET DEFAULT 'draft';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把报销空状态补为 draft，随后收紧 NOT NULL
-- destructive-owner: finance-core
-- destructive-ticket: W5-B-B274
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t finance.expenses
UPDATE finance.expenses
SET status = 'draft'
WHERE status IS NULL;

ALTER TABLE finance.expenses
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE finance.expenses
    DROP CONSTRAINT IF EXISTS ck_expenses_status_standard;

ALTER TABLE finance.expenses
    ADD CONSTRAINT ck_expenses_status_standard
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid'))
    NOT VALID;

ALTER TABLE finance.expenses
    VALIDATE CONSTRAINT ck_expenses_status_standard;

COMMENT ON COLUMN finance.expenses.status IS
    '报销状态：draft, submitted, approved, rejected, paid';
