-- GIS Service Idempotency Protection
-- Adds unique indexes to support ON CONFLICT idempotency in GIS event handlers.
--
-- gis_map_markers: map markers created from event handlers are uniquely
-- identified by (source_type, source_id, tenant_id). The update_map_marker
-- function uses ON CONFLICT DO UPDATE (UPSERT pattern), which is naturally
-- idempotent. This index enables the conflict detection.

CREATE UNIQUE INDEX IF NOT EXISTS idx_gis_map_markers_source_unique
ON gis_map_markers(source_type, source_id, tenant_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
