-- B221 · finance.expenses.status 候选约束（NOT VALID）
--
-- 值集来源 svc/finance/src/modules/expense_status.rs
--   ExpenseStatus::DB_VALUES = draft / submitted / approved / rejected / paid
--
-- 注意：本地库仍有 3 行历史 `pending`（读侧按 submitted 处理）。
-- NOT VALID 不会校验存量；生产在 VALIDATE 之前必须先清洗 pending → submitted，
-- 并把列默认值从 `pending` 改为 `submitted`。

ALTER TABLE finance.expenses
  ADD CONSTRAINT ck_expenses_status_standard
  CHECK (status IS NULL OR status IN ('draft', 'submitted', 'approved', 'rejected', 'paid'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE finance.expenses DROP CONSTRAINT IF EXISTS ck_expenses_status_standard;
