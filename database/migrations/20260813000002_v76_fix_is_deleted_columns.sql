-- V68.1-3 Phase 1: Remove is_deleted columns, unify to deleted_at timestamp-based soft delete
-- Affected tables: core_notification_templates, core_emails, core_email_templates, unified_core.documents, core_files

-- 1. Communication tables: drop is_deleted (deleted_at already exists)
ALTER TABLE core_notification_templates DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE core_emails DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE core_email_templates DROP COLUMN IF EXISTS is_deleted;

-- 2. Unified-core documents: add deleted_at, then drop is_deleted
ALTER TABLE unified_core.documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE unified_core.documents DROP COLUMN IF EXISTS is_deleted;

-- 3. Core files: drop is_deleted (deleted_at already exists)
ALTER TABLE core_files DROP COLUMN IF EXISTS is_deleted;

-- 4. Replace old is_deleted index with deleted_at partial index
DROP INDEX IF EXISTS idx_core_files_is_deleted;
CREATE INDEX IF NOT EXISTS idx_core_files_deleted_at ON core_files(deleted_at) WHERE deleted_at IS NULL;
