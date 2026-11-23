-- B251：finance.budgets.status 收敛到 BudgetStatus 五态
-- 【已回迁 · 存档件】本文件的等价变更已固化为
--   database/migrations/20261124100000_finance_budgets_status_lifecycle.sql
--   （含 NOT VALID → VALIDATE 与 ck_budgets_exhausted_requires_depleted_budget 联动约束），
--   迁移为唯一权威；本文件仅保留原始候选记录，不再直接执行。
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
