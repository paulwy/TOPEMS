-- V68.2-3: Unify soft-delete strategy to deleted_at (timestamp-based)
--
-- Background: V67.1 data-layer audit (P1-4) found 3 soft-delete modes coexisting:
--   1. deleted_at: Option<NaiveDateTime>  (target pattern, majority)
--   2. is_deleted: bool                     (legacy, 4 active tables)
--   3. direct DELETE FROM                   (legitimate for cascade/cleanup)
--
-- The 4 tables below already dual-write `is_deleted = TRUE, deleted_at = NOW()`,
-- so `deleted_at IS NOT NULL` is a drop-in replacement for `is_deleted = TRUE`.
-- This migration drops the redundant `is_deleted` column and its index.
--
-- Tables affected (all already have deleted_at TIMESTAMP):
--   - core_emails              (communication)
--   - core_email_templates     (communication)
--   - core_notification_templates (communication)
--   - core_files               (unified-core, public schema)
--
-- Also drops is_deleted from the dead unified_core.documents table (no Rust
-- module references it, but keeping a redundant column would be inconsistent).
--
-- Acceptance: V68.2-3 criterion 3 — "91 张表不再出现 is_deleted 列".

-- 1. Backfill deleted_at for any row where is_deleted=TRUE but deleted_at IS NULL
--    (defensive — the Rust code dual-wrote, but guard against manual edits or
--    rows written by older code versions. Must run BEFORE dropping is_deleted.)
--    NOTE: unified_core.documents has no deleted_at column and no live Rust
--    module — skip backfill for it; just drop the column in step 3.
UPDATE core_emails                 SET deleted_at = NOW() WHERE is_deleted = TRUE  AND deleted_at IS NULL;
UPDATE core_email_templates        SET deleted_at = NOW() WHERE is_deleted = TRUE  AND deleted_at IS NULL;
UPDATE core_notification_templates SET deleted_at = NOW() WHERE is_deleted = TRUE  AND deleted_at IS NULL;
UPDATE core_files                  SET deleted_at = NOW() WHERE is_deleted = TRUE  AND deleted_at IS NULL;

-- 2. Drop indexes on is_deleted (IF EXISTS — index may not exist on fresh installs)
DROP INDEX IF EXISTS idx_core_files_is_deleted;

-- 3. Drop is_deleted columns (IF EXISTS for idempotency)
ALTER TABLE core_emails                 DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE core_email_templates        DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE core_notification_templates DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE core_files                  DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE unified_core.documents      DROP COLUMN IF EXISTS is_deleted;

-- 4. Add index on deleted_at (replaces idx_core_files_is_deleted)
CREATE INDEX IF NOT EXISTS idx_core_emails_deleted_at                 ON core_emails(deleted_at);
CREATE INDEX IF NOT EXISTS idx_core_email_templates_deleted_at        ON core_email_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_core_notification_templates_deleted_at ON core_notification_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_core_files_deleted_at                  ON core_files(deleted_at);
