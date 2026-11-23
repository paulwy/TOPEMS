-- B232 · pm.project_phases.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/pm/src/modules/project_phase_status.rs
--     ProjectPhaseStatus::DB_VALUES = pending / active / completed
--   默认 pending（列默认值）；前端 PmProjectDetailPage 只认 completed / active，其余按 pending 展示。
--
-- 历史别名：upcoming/not_started → pending、in_progress/running → active、
--   complete/done/finished → completed（仅读取侧兼容）。
--
-- 本地 topems 已应用（0 行存量；事务内取父项目 + 阶段，bogus 被拒）。
-- 无迁移，已登记 prod-only 待回迁清单（total 399→400）。

ALTER TABLE pm.project_phases
  ADD CONSTRAINT ck_project_phases_status_standard
  CHECK (status IN ('pending', 'active', 'completed'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE pm.project_phases DROP CONSTRAINT IF EXISTS ck_project_phases_status_standard;
