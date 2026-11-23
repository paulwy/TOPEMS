-- B226 · pm.pm_tasks.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/task_status.rs
--     TaskStatus::DB_VALUES = todo / in_progress / review / done / blocked
--   与 svc/pm/src/modules/task.rs::task_status_transition_valid 的状态机 5 态一致；
--   默认 todo（列默认值）。
--
-- 历史别名：pending → todo、completed/complete → done、inprogress/in-progress → in_progress、
--           reviewing → review（仅读取侧兼容，新写入统一落规范值）。
--
-- 本地 topems 已应用（2 行存量：todo 1 / in_progress 1；bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 393→394）。

ALTER TABLE pm.pm_tasks
  ADD CONSTRAINT ck_pm_tasks_status_standard
  CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.pm_tasks DROP CONSTRAINT IF EXISTS ck_pm_tasks_status_standard;
