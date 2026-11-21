-- B35 · mes.production_schedules.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/production_schedule_status.rs
-- pending（手工新建）/ scheduled（APS 排程，本地 9678 行）/ released / running / completed / cancelled
-- 历史 in_progress 仅出现在旧删除/调整谓词，无写入方、无存量，已收敛为 running。
-- 写入方：production_scheduling.rs（创建 pending、六个动作端点、编辑、软删、调整）、aps_scheduling.rs（APS 写 scheduled）。
-- 回滚：文件末尾。

ALTER TABLE mes.production_schedules
  ADD CONSTRAINT production_schedules_status_check
  CHECK (status = ANY (ARRAY['pending','scheduled','released','running','completed','cancelled']))
  NOT VALID;

-- 窗口内（存量清理后）：
-- ALTER TABLE mes.production_schedules VALIDATE CONSTRAINT production_schedules_status_check;
-- 回滚：
-- ALTER TABLE mes.production_schedules DROP CONSTRAINT IF EXISTS production_schedules_status_check;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   scheduled→released→running→completed 链 → 每条 UPDATE 1
--   completed→cancelled → UPDATE 0（终态守卫）
--   scheduled→'bogus' → 23514

-- B58：aps_scheduling.rs 的 INSERT 状态由字面量 scheduled 改绑 APS_DEFAULT；
-- 工位负载/瓶颈分析由 `IN (scheduled,in_progress)` 改绑 active_from（scheduled/released/running）。

-- 语义提醒：B35 前删除/调整谓词只认 pending/in_progress，9678 条 APS scheduled 行既不能删也不能调整；
-- 本批已把软删扩到 pending/scheduled/cancelled、调整扩到 pending/scheduled/released/running。
