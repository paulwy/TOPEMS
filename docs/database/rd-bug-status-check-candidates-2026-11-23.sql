-- B236 · `rd.bugs.status` 状态约束候选 DDL
-- 值集唯一来源：`svc/rd/src/modules/bug_status.rs::BugStatus`
--   open / in_progress / resolved / closed；默认 open
-- 本地 `topems` 已以 NOT VALID 真实应用，重建库待回迁。

ALTER TABLE rd.bugs
  ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE rd.bugs
  ALTER COLUMN status SET NOT NULL;
ALTER TABLE rd.bugs
  DROP CONSTRAINT IF EXISTS ck_rd_bugs_status_standard;
ALTER TABLE rd.bugs
  ADD CONSTRAINT ck_rd_bugs_status_standard
  CHECK (status = ANY (ARRAY['open','in_progress','resolved','closed']))
  NOT VALID;

COMMENT ON COLUMN rd.bugs.status IS '缺陷状态：open, in_progress, resolved, closed';

-- 窗口内逐条 VALIDATE；当前 rd.bugs 在本地为 0 行。
