-- B229 · pm.budgets.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/budget_status.rs
--     BudgetStatus::DB_VALUES = draft / pending / approved
--   默认 draft（列默认值）；后端只有“提交→审批通过”两个动作，没有驳回态。
--
-- 历史别名：submitted/pending_approval → pending、approve → approved（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内造父项目 + 预算，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 396→397）。
-- 注意 finance.budgets 也有同名约束 ck_budgets_status_standard（schema 不同，互不影响）。

ALTER TABLE pm.budgets
  ADD CONSTRAINT ck_budgets_status_standard
  CHECK (status IN ('draft', 'pending', 'approved'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.budgets DROP CONSTRAINT IF EXISTS ck_budgets_status_standard;
