-- B29 · erp.announcements / erp.assets status 唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/erp/src/modules/content_status.rs，与前端
--   apps/web/src/api/erp/core/announcement.ts（draft|published|expired|archived）
--   apps/web/src/api/erp/core/asset.ts（in_stock|in_use|maintenance|scrapped|transferred）
-- 一致。

-- ── 预检 ──────────────────────────────────────────────
-- announcements：本地 4 行全为 published，集合外 0。
-- assets：本地 1 行 status='active'（旧默认残留，集合外），VALIDATE 前需修订为 in_use。

ALTER TABLE erp.announcements
  ADD CONSTRAINT announcements_status_check
  CHECK (status = ANY (ARRAY['draft','published','expired','archived']))
  NOT VALID;

ALTER TABLE erp.assets
  ADD CONSTRAINT assets_status_check
  CHECK (status = ANY (ARRAY['in_stock','in_use','maintenance','scrapped','transferred']))
  NOT VALID;

-- 窗口内（存量清理后）：
-- UPDATE erp.assets SET status = 'in_use' WHERE status = 'active';
-- ALTER TABLE erp.announcements VALIDATE CONSTRAINT announcements_status_check;
-- ALTER TABLE erp.assets VALIDATE CONSTRAINT assets_status_check;

-- 回滚：
-- ALTER TABLE erp.announcements DROP CONSTRAINT IF EXISTS announcements_status_check;
-- ALTER TABLE erp.assets DROP CONSTRAINT IF EXISTS assets_status_check;

-- 本地演练（事务内 ROLLBACK，残留 0）：
--   announcements UPDATE published→'bogus' → 23514
--   announcements UPDATE published→expired  → UPDATE 1
--   assets INSERT 'in_stock'                → INSERT 0 1
--   assets UPDATE 存量 'active' 行           → 23514（NOT VALID 放过存量行本身，但不放对其 UPDATE）
