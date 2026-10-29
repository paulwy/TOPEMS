-- schema_defense 服务级补列批次 [portal]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- portal.graphql_breaking_changes: +1 列
ALTER TABLE IF EXISTS "portal"."graphql_breaking_changes" ADD COLUMN IF NOT EXISTS "version_id" VARCHAR(64);

-- portal.graphql_execution_profiles: +1 列
ALTER TABLE IF EXISTS "portal"."graphql_execution_profiles" ADD COLUMN IF NOT EXISTS "query_hash" VARCHAR(128);

-- portal.graphql_stream_events: +1 列
ALTER TABLE IF EXISTS "portal"."graphql_stream_events" ADD COLUMN IF NOT EXISTS "stream_id" VARCHAR(128);

-- portal.graphql_stream_subscribers: +1 列
ALTER TABLE IF EXISTS "portal"."graphql_stream_subscribers" ADD COLUMN IF NOT EXISTS "stream_id" VARCHAR(128);

-- portal.portal_accel_configs: +1 列
ALTER TABLE IF EXISTS "portal"."portal_accel_configs" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);

-- portal.portal_acceleration_configs: +1 列
ALTER TABLE IF EXISTS "portal"."portal_acceleration_configs" ADD COLUMN IF NOT EXISTS "strategy" VARCHAR(64);

-- portal.portal_api_versions: +1 列
ALTER TABLE IF EXISTS "portal"."portal_api_versions" ADD COLUMN IF NOT EXISTS "version" VARCHAR(64);

-- portal.portal_cache_entries: +2 列
ALTER TABLE IF EXISTS "portal"."portal_cache_entries" ADD COLUMN IF NOT EXISTS "cache_key" VARCHAR(512);
ALTER TABLE IF EXISTS "portal"."portal_cache_entries" ADD COLUMN IF NOT EXISTS "checksum" VARCHAR(64);

-- portal.portal_cache_versions: +1 列
ALTER TABLE IF EXISTS "portal"."portal_cache_versions" ADD COLUMN IF NOT EXISTS "version_id" VARCHAR(64);

-- portal.portal_compatibility_policies: +1 列
ALTER TABLE IF EXISTS "portal"."portal_compatibility_policies" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);

-- portal.portal_compiled_queries: +1 列
ALTER TABLE IF EXISTS "portal"."portal_compiled_queries" ADD COLUMN IF NOT EXISTS "hash" VARCHAR(64);

-- portal.portal_config_environments: +1 列
ALTER TABLE IF EXISTS "portal"."portal_config_environments" ADD COLUMN IF NOT EXISTS "name" VARCHAR(64);

-- portal.portal_consistency_checks: +1 列
ALTER TABLE IF EXISTS "portal"."portal_consistency_checks" ADD COLUMN IF NOT EXISTS "checked_at" TIMESTAMPTZ;

-- portal.portal_edge_cache: +1 列
ALTER TABLE IF EXISTS "portal"."portal_edge_cache" ADD COLUMN IF NOT EXISTS "cache_key" VARCHAR(512);

-- portal.portal_edge_functions: +1 列
ALTER TABLE IF EXISTS "portal"."portal_edge_functions" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);

-- portal.portal_health_checks: +1 列
ALTER TABLE IF EXISTS "portal"."portal_health_checks" ADD COLUMN IF NOT EXISTS "check_type" VARCHAR(32);

-- portal.portal_identity_policies: +1 列
ALTER TABLE IF EXISTS "portal"."portal_identity_policies" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);

-- portal.portal_metrics: +1 列
ALTER TABLE IF EXISTS "portal"."portal_metrics" ADD COLUMN IF NOT EXISTS "checked_at" TIMESTAMPTZ;

-- portal.portal_persisted_queries: +1 列
ALTER TABLE IF EXISTS "portal"."portal_persisted_queries" ADD COLUMN IF NOT EXISTS "query_hash" VARCHAR(64);

-- portal.portal_queue_configs: +1 列
ALTER TABLE IF EXISTS "portal"."portal_queue_configs" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);

-- portal.portal_security_policies: +1 列
ALTER TABLE IF EXISTS "portal"."portal_security_policies" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);

-- portal.portal_service_descriptors: +1 列
ALTER TABLE IF EXISTS "portal"."portal_service_descriptors" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);

-- portal.portal_service_heartbeats: +1 列
ALTER TABLE IF EXISTS "portal"."portal_service_heartbeats" ADD COLUMN IF NOT EXISTS "checked_at" TIMESTAMPTZ;

-- portal.portal_service_loads: +1 列
ALTER TABLE IF EXISTS "portal"."portal_service_loads" ADD COLUMN IF NOT EXISTS "service_id" VARCHAR(128);

-- portal.portal_subscription_channels: +1 列
ALTER TABLE IF EXISTS "portal"."portal_subscription_channels" ADD COLUMN IF NOT EXISTS "channel" VARCHAR(64);

-- portal.portal_version_vectors: +1 列
ALTER TABLE IF EXISTS "portal"."portal_version_vectors" ADD COLUMN IF NOT EXISTS "entity_id" VARCHAR(128);
