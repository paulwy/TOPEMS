-- B230 · pm.project_milestones.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/milestone_status.rs
--     MilestoneStatus::DB_VALUES = pending / in_progress / completed / overdue
--   默认 pending（列默认值）；同文件 milestone_status() 推导函数历史上返回 upcoming，
--   已收敛为 pending（读取侧保留 upcoming 作为历史别名）。
--
-- 历史别名：upcoming → pending、inprogress/in-progress/active → in_progress、
--   complete/done/finished → completed、late → overdue（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内取父项目 + 里程碑，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 397→398）。

ALTER TABLE pm.project_milestones
  ADD CONSTRAINT ck_project_milestones_status_standard
  CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.project_milestones DROP CONSTRAINT IF EXISTS ck_project_milestones_status_standard;
