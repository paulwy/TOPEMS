-- Monitor Service Idempotency Protection
-- Adds unique indexes to support ON CONFLICT idempotency in Monitor event handlers.
--
-- monitor_system_activities: each activity is uniquely identified by
-- (source_type, source_id, activity_name). For workflow events, source_id is
-- the workflow instance_id and activity_name differs per event type
-- (started/approved/rejected), so the same instance can have multiple
-- distinct activity rows while redelivered events are deduped.
--
-- monitor_audit_logs: audit entries from event handlers are uniquely
-- identified by (action, resource_type, resource_id, detail). The detail
-- field is deterministic from the event payload (e.g. added/removed
-- permissions), so redelivered events produce the same detail and are
-- deduped, while distinct events for the same user produce different
-- detail and are allowed.

CREATE UNIQUE INDEX IF NOT EXISTS idx_monitor_system_activities_natural_key
ON monitor_system_activities(source_type, source_id, activity_name)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND activity_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monitor_audit_logs_natural_key
ON monitor_audit_logs(action, resource_type, resource_id, detail)
WHERE resource_id IS NOT NULL AND detail IS NOT NULL;
