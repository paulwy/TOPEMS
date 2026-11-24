-- 回滚 B274：finance.expenses.status 恢复可空与旧版允许 NULL 的 CHECK
ALTER TABLE finance.expenses
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE finance.expenses
    DROP CONSTRAINT IF EXISTS ck_expenses_status_standard;

ALTER TABLE finance.expenses
    ADD CONSTRAINT ck_expenses_status_standard
    CHECK (
        status IS NULL
        OR status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')
    ) NOT VALID;
