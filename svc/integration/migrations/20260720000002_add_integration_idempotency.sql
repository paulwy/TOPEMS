-- Integration Service Idempotency Protection
-- Adds source_type/source_id columns and unique indexes to support
-- ON CONFLICT idempotency in Integration event handlers.
--
-- integration_sync_logs: sync log entries created from event handlers are
-- uniquely identified by (source_type, source_id, tenant_id). The
-- record_sync_log function uses ON CONFLICT DO NOTHING to ensure each
-- event triggers at most one sync log entry.

-- Add source_type and source_id columns if they don't exist
ALTER TABLE integration_sync_logs ADD COLUMN IF NOT EXISTS source_type VARCHAR(100);
ALTER TABLE integration_sync_logs ADD COLUMN IF NOT EXISTS source_id UUID;

-- Create partial unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_sync_logs_source_unique
ON integration_sync_logs(source_type, source_id, tenant_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
