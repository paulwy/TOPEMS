-- B227 · pm.project_approvals.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/project_approval_status.rs
--     ProjectApprovalStatus::DB_VALUES = pending / approved / rejected / cancelled
--   pending 为提交/多级审批中途态，approved/rejected/cancelled 为终止态；默认 pending（列默认值）。
--
-- 历史别名：canceled → cancelled、pass/passed → approved、reject/deny → rejected（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内造父项目 + 审批行，bogus 被拒，approved 正常写入回滚）。
-- 无迁移，已登记 prod-only 待回迁清单（total 394→395）。

ALTER TABLE pm.project_approvals
  ADD CONSTRAINT ck_project_approvals_status_standard
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.project_approvals DROP CONSTRAINT IF EXISTS ck_project_approvals_status_standard;
