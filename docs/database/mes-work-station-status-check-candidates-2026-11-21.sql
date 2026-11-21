-- B36 · mes.work_stations.status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/mes/src/modules/work_station_status.rs（available/active/inactive）
-- 写入方：work_station.rs（创建 active、编辑、激活、停用）。
-- 预检（本地 79 行）：active 69 / available 10，集合外 0；生产快照 0 行。
-- 语义提醒：DB 默认值是 'available'，代码创建写 'active'。本批统一以 'active' 为创建默认，
-- 并在窗口内把列默认改为 'active'（否则任何绕过应用的 INSERT 会落 available）。

ALTER TABLE mes.work_stations
  ADD CONSTRAINT work_stations_status_check
  CHECK (status = ANY (ARRAY['available','active','inactive']))
  NOT VALID;

ALTER TABLE mes.work_stations
  ALTER COLUMN status SET DEFAULT 'active';

-- 窗口内（存量 available 清理确认后）：
-- ALTER TABLE mes.work_stations VALIDATE CONSTRAINT work_stations_status_check;
-- 回滚：
-- ALTER TABLE mes.work_stations DROP CONSTRAINT IF EXISTS work_stations_status_check;
-- ALTER TABLE mes.work_stations ALTER COLUMN status SET DEFAULT 'available';

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   active→inactive（谓词 active）→ UPDATE 1
--   inactive→active → UPDATE 1
--   active→'bogus' → 23514

-- available 清理候选（需业务确认 available 与 active 是否等价）：
-- UPDATE mes.work_stations SET status='active', updated_at=NOW() WHERE status='available';
