-- B231 · pm.project_expenses.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/project_expense_status.rs
--     ProjectExpenseStatus::DB_VALUES = pending / approved / rejected
--   默认 pending（列默认值）；同文件 should_approve_expense() 只是自动通过判定，
--   并未写入状态，本批把落库/流转统一到三值。
--
-- 历史别名：submitted/pending_approval → pending、approve/passed → approved、
--   reject/denied → rejected（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内取父项目 + 费用，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 398→399）。

ALTER TABLE pm.project_expenses
  ADD CONSTRAINT ck_project_expenses_status_standard
  CHECK (status IN ('pending', 'approved', 'rejected'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.project_expenses DROP CONSTRAINT IF EXISTS ck_project_expenses_status_standard;
