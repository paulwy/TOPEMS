-- AI Service Idempotency Protection
-- Adds unique indexes to support ON CONFLICT idempotency in AI event handlers.
--
-- The ai_training_samples table stores training samples derived from upstream
-- events (QMS quality issues, LIMS inspection abnormals, EHS hazard reports).
-- Each sample is uniquely identified by (source_type, source_id), so a
-- redelivered event can be safely deduped via ON CONFLICT DO NOTHING.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_training_samples_source_unique
ON ai_training_samples(source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
