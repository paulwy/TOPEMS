-- B251：finance.budgets.status 收敛到 BudgetStatus 五态
-- 既有约束 ck_budgets_status_standard 允许 active/inactive/archived，
-- 前端契约却使用 active/frozen/exhausted；本批以五态替换旧约束。

ALTER TABLE finance.budgets
    DROP CONSTRAINT IF EXISTS ck_budgets_status_standard;

ALTER TABLE finance.budgets
    ADD CONSTRAINT ck_budgets_status_lifecycle_standard
    CHECK (
        (status IS NULL)
        OR ((status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'frozen'::text, 'exhausted'::text, 'archived'::text]))
    ) NOT VALID;
