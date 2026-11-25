-- 20261120180000: portal 112 张运行期表收口（W2-D2 第七个模块）
--
-- 背景：svc/portal/src/models/schema_defense.rs 的 TABLE_DEFS（去重后 112 表 / 728 列）
-- 在启动时为这些 portal 表建骨架并逐列补列；modules/gateway_security.rs 还有
-- 少量启动期 DDL。本迁移以 baseline+forward 库
-- 真实形状固化，删除运行期 DDL 后由迁移链唯一维护。
--
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS portal.core_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    views bigint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.core_guide_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    duration character varying(50) DEFAULT '5min'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    guide_id uuid
);

CREATE TABLE IF NOT EXISTS portal.core_guide_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    completed_lessons uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.core_guides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying NOT NULL,
    duration character varying(50) DEFAULT '10min'::character varying NOT NULL,
    lessons_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.federation_compensation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying(64) NOT NULL,
    step_id character varying(64) NOT NULL,
    compensation_action character varying(32) NOT NULL,
    status character varying(32) NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.federation_execution_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_id character varying(64) NOT NULL,
    subgraph_id character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    duration_ms integer DEFAULT 0 NOT NULL,
    result jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.federation_query_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operations jsonb DEFAULT '[]'::jsonb NOT NULL,
    merge_strategy character varying(64) NOT NULL,
    estimated_total_cost double precision DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.federation_subgraphs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    url character varying(512) NOT NULL,
    types jsonb DEFAULT '[]'::jsonb NOT NULL,
    entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    health_status character varying(32) DEFAULT 'unknown'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.federation_transaction_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying(64) NOT NULL,
    action character varying(32) NOT NULL,
    target_service character varying(128) NOT NULL,
    payload jsonb,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.federation_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participants jsonb DEFAULT '[]'::jsonb NOT NULL,
    state character varying(32) DEFAULT 'init'::character varying NOT NULL,
    timeout_ms integer DEFAULT 30000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.gateway_degradation_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level character varying(32) NOT NULL,
    latency_threshold_ms bigint DEFAULT 1000 NOT NULL,
    error_rate_threshold double precision DEFAULT 0.1 NOT NULL,
    cpu_threshold double precision DEFAULT 0.85 NOT NULL,
    fallback_strategy character varying(64) DEFAULT 'cache'::character varying NOT NULL,
    notification_channels jsonb DEFAULT '["alert"]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.gateway_health_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_name character varying(256) NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    error_rate double precision DEFAULT 0.0 NOT NULL,
    cpu_usage double precision DEFAULT 0.0 NOT NULL,
    memory_usage double precision DEFAULT 0.0 NOT NULL,
    request_count bigint DEFAULT 0 NOT NULL,
    success_count bigint DEFAULT 0 NOT NULL,
    failure_count bigint DEFAULT 0 NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.gateway_protocols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    max_connections integer DEFAULT 1000 NOT NULL,
    timeout_ms bigint DEFAULT 30000 NOT NULL,
    rate_limit_per_sec integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.gateway_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(256) NOT NULL,
    protocol character varying(32) NOT NULL,
    path_pattern character varying(512) NOT NULL,
    target_service character varying(256) NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    load_balancing_strategy character varying(32) DEFAULT 'round_robin'::character varying NOT NULL,
    circuit_breaker_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS portal.graphql_breaking_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_type character varying(64) NOT NULL,
    path character varying(512) NOT NULL,
    description text NOT NULL,
    affected_queries jsonb DEFAULT '[]'::jsonb NOT NULL,
    severity character varying(16) NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    version_id character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.graphql_execution_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    total_queries bigint DEFAULT 0 NOT NULL,
    successful_queries bigint DEFAULT 0 NOT NULL,
    failed_queries bigint DEFAULT 0 NOT NULL,
    avg_complexity double precision DEFAULT 0 NOT NULL,
    avg_timeout_ms double precision DEFAULT 0 NOT NULL,
    avg_parallelism double precision DEFAULT 0 NOT NULL,
    degraded_queries bigint DEFAULT 0 NOT NULL,
    total_execution_time_ms bigint DEFAULT 0 NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_execution_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    complexity_score double precision DEFAULT 0 NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    timeout_ms bigint DEFAULT 5000 NOT NULL,
    parallelism_level integer DEFAULT 1 NOT NULL,
    degradation_applied boolean DEFAULT false NOT NULL,
    strategy character varying(32) DEFAULT 'balanced'::character varying NOT NULL,
    field_count integer DEFAULT 0 NOT NULL,
    query_depth integer DEFAULT 0 NOT NULL,
    connection_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    query_hash character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.graphql_optimization_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_query text NOT NULL,
    optimized_query text NOT NULL,
    original_cost double precision DEFAULT 0 NOT NULL,
    optimized_cost double precision DEFAULT 0 NOT NULL,
    estimated_savings double precision DEFAULT 0 NOT NULL,
    cache_key character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_schema_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(32) NOT NULL,
    schema_definition text NOT NULL,
    change_type character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    change_description text,
    approved_by character varying(128),
    is_current boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_stream_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(128) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    sequence bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    stream_id character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.graphql_stream_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscriber_id character varying(128) NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    stream_id character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.graphql_streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(256) NOT NULL,
    topic character varying(256) NOT NULL,
    state character varying(32) DEFAULT 'active'::character varying NOT NULL,
    buffer_size integer DEFAULT 1000 NOT NULL,
    batch_interval_ms bigint DEFAULT 100 NOT NULL,
    max_subscribers integer DEFAULT 100 NOT NULL,
    filter_expression text,
    heartbeat_interval_ms bigint DEFAULT 30000 NOT NULL,
    reconnect_max_attempts integer DEFAULT 5 NOT NULL,
    subscriber_count integer DEFAULT 0 NOT NULL,
    event_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_event_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    optimization_id character varying(128) NOT NULL,
    suggestion_type character varying(64) NOT NULL,
    description text NOT NULL,
    current_cost double precision DEFAULT 0 NOT NULL,
    suggested_cost double precision DEFAULT 0 NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    applicable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.graphql_version_negotiations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requested_version character varying(32) NOT NULL,
    matched_version character varying(32),
    fallback_used boolean DEFAULT false NOT NULL,
    strategy_used character varying(64) NOT NULL,
    negotiated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_affinities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(128) NOT NULL,
    entity_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_name character varying(128) NOT NULL,
    conflicting_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    resolution character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_routing_table (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(128) NOT NULL,
    intent character varying(32) NOT NULL,
    target_service character varying(128) NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    reason text,
    alternatives jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_stitch_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id character varying(64) NOT NULL,
    action character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.intelligent_gw_stitch_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subgraphs jsonb DEFAULT '[]'::jsonb NOT NULL,
    merged_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    conflicts jsonb DEFAULT '[]'::jsonb NOT NULL,
    resolution_strategy character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_accel_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    locations jsonb DEFAULT '[]'::jsonb NOT NULL,
    routing_strategy character varying(32) DEFAULT 'nearest'::character varying NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    compression_enabled boolean DEFAULT true NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_acceleration_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    strategy character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_acceleration_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    strategy character varying(64) NOT NULL,
    original_time_ms bigint DEFAULT 0 NOT NULL,
    optimized_time_ms bigint DEFAULT 0 NOT NULL,
    speedup_factor double precision DEFAULT 1.0 NOT NULL,
    steps_saved integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_access_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(128),
    actor_id character varying(128),
    resource character varying(256),
    action character varying(128),
    decision character varying(16) DEFAULT 'allow'::character varying NOT NULL,
    reason text,
    matched_policy_id character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_access_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type character varying(128) NOT NULL,
    resource_pattern character varying(256) NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    effect character varying(16) DEFAULT 'allow'::character varying NOT NULL,
    conditions jsonb,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_aggregation_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic character varying(128) NOT NULL,
    window_size_ms bigint DEFAULT 60000 NOT NULL,
    aggregation_type character varying(32) DEFAULT 'count'::character varying NOT NULL,
    group_by jsonb,
    filter_expr text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_aggregation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id character varying(64) NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    groups jsonb DEFAULT '[]'::jsonb NOT NULL,
    values jsonb DEFAULT '{}'::jsonb NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_alert_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name character varying(128) NOT NULL,
    warning_threshold double precision NOT NULL,
    critical_threshold double precision NOT NULL,
    comparison_operator character varying(16) DEFAULT 'gt'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_anomalies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    anomaly_type character varying(32) NOT NULL,
    severity character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    metric_name character varying(128) NOT NULL,
    expected_value double precision DEFAULT 0 NOT NULL,
    actual_value double precision DEFAULT 0 NOT NULL,
    deviation double precision DEFAULT 0 NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_api_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    released_at timestamp with time zone DEFAULT now() NOT NULL,
    deprecated_at timestamp with time zone,
    sunset_at timestamp with time zone,
    changelog text,
    breaking_changes jsonb DEFAULT '[]'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    version character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_audit_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id character varying(128),
    actor_type character varying(32) DEFAULT 'user'::character varying NOT NULL,
    action character varying(128) NOT NULL,
    resource_type character varying(128) NOT NULL,
    resource_id character varying(128),
    old_value jsonb,
    new_value jsonb,
    ip_address character varying(64),
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id character varying(128),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_audit_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    format character varying(16) DEFAULT 'json'::character varying NOT NULL,
    filter jsonb,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_auth_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    federation_id character varying(64) NOT NULL,
    required_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    token_issuer character varying(256) NOT NULL,
    audience character varying(256) NOT NULL,
    token_validity bigint DEFAULT 3600 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_backpressure_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    max_queue_size integer DEFAULT 10000 NOT NULL,
    high_watermark double precision DEFAULT 0.8 NOT NULL,
    low_watermark double precision DEFAULT 0.2 NOT NULL,
    overflow_strategy character varying(32) DEFAULT 'drop'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_backpressure_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    queue_depth integer DEFAULT 0 NOT NULL,
    utilization double precision DEFAULT 0 NOT NULL,
    dropped_count bigint DEFAULT 0 NOT NULL,
    last_drop_reason character varying(128),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_cache_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    value jsonb NOT NULL,
    ttl bigint DEFAULT 3600000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT now() NOT NULL,
    access_count bigint DEFAULT 0 NOT NULL,
    last_accessed timestamp with time zone,
    cache_value jsonb NOT NULL,
    version_id character varying(64) NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    tags jsonb,
    deleted_at timestamp with time zone,
    cache_key character varying(512),
    checksum character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_cache_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    scope character varying(32) DEFAULT 'query'::character varying NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    invalidation_strategy character varying(32) DEFAULT 'time_based'::character varying NOT NULL,
    max_size bigint DEFAULT 10000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_cache_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description character varying(256),
    entry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    version_id character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_canary_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(64) NOT NULL,
    percentage integer DEFAULT 0 NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_canary_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id character varying(64) NOT NULL,
    total_requests bigint DEFAULT 0 NOT NULL,
    canary_requests bigint DEFAULT 0 NOT NULL,
    baseline_requests bigint DEFAULT 0 NOT NULL,
    error_rate_canary double precision DEFAULT 0 NOT NULL,
    error_rate_baseline double precision DEFAULT 0 NOT NULL,
    winner character varying(32),
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_compatibility_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    min_compatibility_level character varying(32) DEFAULT 'partial'::character varying NOT NULL,
    require_migration_path boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_compatibility_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_version character varying(64) NOT NULL,
    to_version character varying(64) NOT NULL,
    breaking_changes jsonb DEFAULT '[]'::jsonb NOT NULL,
    deprecated_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    compatible boolean DEFAULT true NOT NULL,
    migration_path jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_compilation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_type character varying(64) NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_compiled_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_query text NOT NULL,
    optimized_query text NOT NULL,
    complexity_score double precision DEFAULT 0 NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    optimizations_applied jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    hash character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_config_diffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id character varying(64) NOT NULL,
    old_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by character varying(128),
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_config_environments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(32) NOT NULL,
    base_url character varying(512),
    variables jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_protected boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_consistency_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    model character varying(32) NOT NULL,
    violations jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'passed'::character varying NOT NULL,
    deleted_at timestamp with time zone,
    checked_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_dead_letter_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_message_id character varying(64) NOT NULL,
    topic character varying(128) NOT NULL,
    message_value jsonb NOT NULL,
    error_reason text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    last_retry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_dedup_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id character varying(64) NOT NULL,
    original_id character varying(64) NOT NULL,
    duplicate_of character varying(64),
    action character varying(32) DEFAULT 'pass'::character varying NOT NULL,
    merged_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_dedup_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    dedup_key character varying(256) NOT NULL,
    window_ms bigint DEFAULT 5000 NOT NULL,
    strategy character varying(32) DEFAULT 'first_writer'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_deployment_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deployment_id character varying(64) NOT NULL,
    step_type character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    message text,
    duration_ms bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(64) NOT NULL,
    environment character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    strategy character varying(32) DEFAULT 'rolling'::character varying NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_detection_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name character varying(128) NOT NULL,
    algorithm character varying(32) NOT NULL,
    threshold double precision DEFAULT 0 NOT NULL,
    sensitivity double precision DEFAULT 0.05 NOT NULL,
    trained_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_distributed_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_plan jsonb DEFAULT '{}'::jsonb NOT NULL,
    routing_map jsonb DEFAULT '{}'::jsonb NOT NULL,
    consistency_requirement character varying(32) DEFAULT 'eventual'::character varying NOT NULL,
    timeout_ms bigint DEFAULT 30000 NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data jsonb NOT NULL,
    location character varying(64) NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    cache_key character varying(512)
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_id character varying(64) NOT NULL,
    location character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'deploying'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    deployed_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key character varying(512) NOT NULL,
    cache_value jsonb NOT NULL,
    location character varying(32) NOT NULL,
    ttl_ms bigint DEFAULT 3600000 NOT NULL,
    replicated_at timestamp with time zone DEFAULT now() NOT NULL,
    sync_status character varying(32) DEFAULT 'synced'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_functions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    location character varying(64) DEFAULT 'apac'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    timeout_ms integer DEFAULT 5000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_edge_replication (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_location character varying(32) NOT NULL,
    target_location character varying(32) NOT NULL,
    cache_key character varying(512) NOT NULL,
    replicated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'success'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_execution_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    parallelism integer DEFAULT 1 NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_execution_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id character varying(64) NOT NULL,
    service character varying(128) NOT NULL,
    operation character varying(128) NOT NULL,
    depends_on jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    result jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_federated_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(32) NOT NULL,
    claims jsonb DEFAULT '{}'::jsonb NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    authenticated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_gateway_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    version character varying(64) NOT NULL,
    environment character varying(32) NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_healing_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger character varying(32) NOT NULL,
    action_type character varying(32) NOT NULL,
    target character varying(256) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    executed_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_health_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(128) NOT NULL,
    interval_ms bigint DEFAULT 10000 NOT NULL,
    timeout_ms bigint DEFAULT 5000 NOT NULL,
    healthy_threshold integer DEFAULT 2 NOT NULL,
    unhealthy_threshold integer DEFAULT 3 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    check_type character varying(32)
);

CREATE TABLE IF NOT EXISTS portal.portal_identity_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text,
    risk_threshold double precision DEFAULT 0.7 NOT NULL,
    require_mfa boolean DEFAULT false NOT NULL,
    allowed_locations jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_devices jsonb DEFAULT '[]'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_invalidation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key character varying(512) NOT NULL,
    reason character varying(256),
    triggered_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_latency_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(64),
    total_ms integer DEFAULT 0 NOT NULL,
    render_ms integer DEFAULT 0 NOT NULL,
    network_ms integer DEFAULT 0 NOT NULL,
    processing_ms integer DEFAULT 0 NOT NULL,
    location character varying(64),
    cache_hit boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_masking_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_path character varying(256) NOT NULL,
    mask_type character varying(32) NOT NULL,
    pattern character varying(256),
    applied_to jsonb DEFAULT '[]'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    metric_type character varying(32) NOT NULL,
    value double precision DEFAULT 0 NOT NULL,
    labels jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    checked_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_orchestration_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_id character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    estimated_cost double precision DEFAULT 0 NOT NULL,
    timeout_ms bigint DEFAULT 30000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_persisted_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_name character varying(128),
    query_text text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    access_count bigint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    query_hash character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_persisted_query_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(64) NOT NULL,
    version integer NOT NULL,
    query_text text NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_plan_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id character varying(64) NOT NULL,
    service character varying(128) NOT NULL,
    field_path text NOT NULL,
    depends_on jsonb,
    estimated_time_ms bigint DEFAULT 0 NOT NULL,
    strategy character varying(64) DEFAULT 'sequential'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_push_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_window_ms integer DEFAULT 100 NOT NULL,
    total_pushes bigint DEFAULT 0 NOT NULL,
    batched_pushes bigint DEFAULT 0 NOT NULL,
    messages_pushed bigint DEFAULT 0 NOT NULL,
    avg_batch_size double precision DEFAULT 0 NOT NULL,
    backpressure_events bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_queue_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(32) DEFAULT 'memory'::character varying NOT NULL,
    max_size integer DEFAULT 10000 NOT NULL,
    batch_size integer DEFAULT 100 NOT NULL,
    dead_letter_queue character varying(128),
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_queue_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic character varying(128) NOT NULL,
    message_key character varying(256),
    message_value jsonb NOT NULL,
    headers jsonb,
    provider character varying(32) DEFAULT 'memory'::character varying NOT NULL,
    consumed boolean DEFAULT false NOT NULL,
    consumed_at timestamp with time zone,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_recovery_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(128) NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    estimated_duration_ms bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_replay_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id character varying(64) NOT NULL,
    from_sequence bigint DEFAULT 0 NOT NULL,
    to_sequence bigint,
    batch_size integer DEFAULT 100 NOT NULL,
    replay_type character varying(32) DEFAULT 'full'::character varying NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_replay_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(64) NOT NULL,
    events_replayed bigint DEFAULT 0 NOT NULL,
    events_skipped bigint DEFAULT 0 NOT NULL,
    duration_ms bigint DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_resolver_timings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trace_id character varying(64) NOT NULL,
    path character varying(256) NOT NULL,
    duration_ms bigint DEFAULT 0 NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_rollback_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_id character varying(64) NOT NULL,
    action character varying(32) NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    executed_at timestamp with time zone,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_rollback_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    trigger character varying(32) DEFAULT 'manual'::character varying NOT NULL,
    condition jsonb,
    rollback_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_rollbacks integer DEFAULT 5 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_route_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern character varying(256) NOT NULL,
    target_service character varying(128) NOT NULL,
    condition jsonb,
    priority integer DEFAULT 0 NOT NULL,
    weight integer DEFAULT 100 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_routing_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(128),
    matched_rule_id character varying(64),
    target_service character varying(128) NOT NULL,
    reason character varying(256),
    confidence double precision DEFAULT 0 NOT NULL,
    routed_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id character varying(64) NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_routing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(128) NOT NULL,
    condition jsonb DEFAULT '{}'::jsonb NOT NULL,
    target_service character varying(128) NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    weight integer DEFAULT 100 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(32) NOT NULL,
    client_ip character varying(64),
    query_hash character varying(128),
    action character varying(64),
    details jsonb,
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_security_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_type character varying(32) NOT NULL,
    severity character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    source_ip character varying(64),
    user_agent text,
    payload jsonb,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_security_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    authentication_type character varying(32) DEFAULT 'jwt'::character varying NOT NULL,
    token_validity_sec integer DEFAULT 3600 NOT NULL,
    rate_limit_per_min integer DEFAULT 100 NOT NULL,
    ip_whitelist jsonb DEFAULT '[]'::jsonb NOT NULL,
    require_https boolean DEFAULT true NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rate_limit_per_sec integer DEFAULT 100 NOT NULL,
    max_query_depth integer DEFAULT 10 NOT NULL,
    max_complexity integer DEFAULT 1000 NOT NULL,
    require_auth boolean DEFAULT true NOT NULL,
    allowed_operations jsonb DEFAULT '["query", "mutation", "subscription"]'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_service_descriptors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version character varying(64) NOT NULL,
    endpoint character varying(512) NOT NULL,
    capabilities jsonb DEFAULT '[]'::jsonb NOT NULL,
    health_status character varying(32) DEFAULT 'healthy'::character varying NOT NULL,
    last_heartbeat timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_service_heartbeats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    checked_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_service_loads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cpu_usage double precision DEFAULT 0 NOT NULL,
    memory_usage double precision DEFAULT 0 NOT NULL,
    latency_ms bigint DEFAULT 0 NOT NULL,
    active_queries integer DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    service_id character varying(128)
);

CREATE TABLE IF NOT EXISTS portal.portal_stream_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id character varying(64) NOT NULL,
    event_type character varying(64) NOT NULL,
    payload jsonb NOT NULL,
    sequence bigint NOT NULL,
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic character varying(128) NOT NULL,
    stream_type character varying(32) DEFAULT 'event_stream'::character varying NOT NULL,
    filter jsonb,
    batch_size integer DEFAULT 100 NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_sub_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_id character varying(64) NOT NULL,
    service character varying(128) NOT NULL,
    query text NOT NULL,
    variables jsonb,
    depends_on jsonb DEFAULT '[]'::jsonb NOT NULL,
    result jsonb,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying(128) NOT NULL,
    channels jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'connected'::character varying NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_subscription_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    subscriber_count integer DEFAULT 0 NOT NULL,
    message_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    channel character varying(64)
);

CREATE TABLE IF NOT EXISTS portal.portal_subscription_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id character varying(64) NOT NULL,
    event_type character varying(64) NOT NULL,
    payload jsonb NOT NULL,
    sequence bigint NOT NULL,
    delivered_at timestamp with time zone,
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_subscription_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscriber_id character varying(128) NOT NULL,
    topic character varying(128) NOT NULL,
    filter jsonb,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity timestamp with time zone DEFAULT now() NOT NULL,
    delivered_count bigint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_traces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_hash character varying(128),
    duration_ms bigint DEFAULT 0 NOT NULL,
    cache_hits integer DEFAULT 0 NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    traced_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_trust_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identity character varying(128) NOT NULL,
    decision character varying(32) NOT NULL,
    risk_score double precision DEFAULT 0 NOT NULL,
    reason text,
    context jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_version_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_version character varying(64) NOT NULL,
    server_version character varying(64) NOT NULL,
    compatibility character varying(32) DEFAULT 'full'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS portal.portal_version_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    versions jsonb DEFAULT '{}'::jsonb NOT NULL,
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    entity_id character varying(128)
);

CREATE INDEX IF NOT EXISTS idx_core_faqs_active ON portal.core_faqs USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_core_faqs_category ON portal.core_faqs USING btree (category);
CREATE INDEX IF NOT EXISTS idx_core_faqs_sort ON portal.core_faqs USING btree (sort_order);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_active ON portal.core_guide_lessons USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_guide_id ON portal.core_guide_lessons USING btree (guide_id);
CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_sort ON portal.core_guide_lessons USING btree (sort_order);
CREATE INDEX IF NOT EXISTS idx_core_guide_progress_user ON portal.core_guide_progress USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_core_guides_active ON portal.core_guides USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_core_guides_category ON portal.core_guides USING btree (category);
CREATE INDEX IF NOT EXISTS idx_core_guides_sort ON portal.core_guides USING btree (sort_order);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.core_faqs'::regclass AND conname='core_faqs_pkey') THEN
        ALTER TABLE portal.core_faqs ADD CONSTRAINT "core_faqs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.core_guide_lessons'::regclass AND conname='core_guide_lessons_pkey') THEN
        ALTER TABLE portal.core_guide_lessons ADD CONSTRAINT "core_guide_lessons_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.core_guide_progress'::regclass AND conname='core_guide_progress_pkey') THEN
        ALTER TABLE portal.core_guide_progress ADD CONSTRAINT "core_guide_progress_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.core_guides'::regclass AND conname='core_guides_pkey') THEN
        ALTER TABLE portal.core_guides ADD CONSTRAINT "core_guides_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.federation_compensation_logs'::regclass AND conname='federation_compensation_logs_pkey') THEN
        ALTER TABLE portal.federation_compensation_logs ADD CONSTRAINT "federation_compensation_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.federation_execution_logs'::regclass AND conname='federation_execution_logs_pkey') THEN
        ALTER TABLE portal.federation_execution_logs ADD CONSTRAINT "federation_execution_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.federation_query_plans'::regclass AND conname='federation_query_plans_pkey') THEN
        ALTER TABLE portal.federation_query_plans ADD CONSTRAINT "federation_query_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.federation_subgraphs'::regclass AND conname='federation_subgraphs_pkey') THEN
        ALTER TABLE portal.federation_subgraphs ADD CONSTRAINT "federation_subgraphs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.federation_transaction_steps'::regclass AND conname='federation_transaction_steps_pkey') THEN
        ALTER TABLE portal.federation_transaction_steps ADD CONSTRAINT "federation_transaction_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.federation_transactions'::regclass AND conname='federation_transactions_pkey') THEN
        ALTER TABLE portal.federation_transactions ADD CONSTRAINT "federation_transactions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.gateway_degradation_policies'::regclass AND conname='gateway_degradation_policies_pkey') THEN
        ALTER TABLE portal.gateway_degradation_policies ADD CONSTRAINT "gateway_degradation_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.gateway_health_metrics'::regclass AND conname='gateway_health_metrics_pkey') THEN
        ALTER TABLE portal.gateway_health_metrics ADD CONSTRAINT "gateway_health_metrics_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.gateway_protocols'::regclass AND conname='gateway_protocols_pkey') THEN
        ALTER TABLE portal.gateway_protocols ADD CONSTRAINT "gateway_protocols_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.gateway_routes'::regclass AND conname='gateway_routes_pkey') THEN
        ALTER TABLE portal.gateway_routes ADD CONSTRAINT "gateway_routes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_breaking_changes'::regclass AND conname='graphql_breaking_changes_pkey') THEN
        ALTER TABLE portal.graphql_breaking_changes ADD CONSTRAINT "graphql_breaking_changes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_execution_metrics'::regclass AND conname='graphql_execution_metrics_pkey') THEN
        ALTER TABLE portal.graphql_execution_metrics ADD CONSTRAINT "graphql_execution_metrics_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_execution_profiles'::regclass AND conname='graphql_execution_profiles_pkey') THEN
        ALTER TABLE portal.graphql_execution_profiles ADD CONSTRAINT "graphql_execution_profiles_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_optimization_history'::regclass AND conname='graphql_optimization_history_pkey') THEN
        ALTER TABLE portal.graphql_optimization_history ADD CONSTRAINT "graphql_optimization_history_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_schema_versions'::regclass AND conname='graphql_schema_versions_pkey') THEN
        ALTER TABLE portal.graphql_schema_versions ADD CONSTRAINT "graphql_schema_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_stream_events'::regclass AND conname='graphql_stream_events_pkey') THEN
        ALTER TABLE portal.graphql_stream_events ADD CONSTRAINT "graphql_stream_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_stream_subscribers'::regclass AND conname='graphql_stream_subscribers_pkey') THEN
        ALTER TABLE portal.graphql_stream_subscribers ADD CONSTRAINT "graphql_stream_subscribers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_streams'::regclass AND conname='graphql_streams_pkey') THEN
        ALTER TABLE portal.graphql_streams ADD CONSTRAINT "graphql_streams_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_suggestions'::regclass AND conname='graphql_suggestions_pkey') THEN
        ALTER TABLE portal.graphql_suggestions ADD CONSTRAINT "graphql_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.graphql_version_negotiations'::regclass AND conname='graphql_version_negotiations_pkey') THEN
        ALTER TABLE portal.graphql_version_negotiations ADD CONSTRAINT "graphql_version_negotiations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.intelligent_gw_affinities'::regclass AND conname='intelligent_gw_affinities_pkey') THEN
        ALTER TABLE portal.intelligent_gw_affinities ADD CONSTRAINT "intelligent_gw_affinities_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.intelligent_gw_conflicts'::regclass AND conname='intelligent_gw_conflicts_pkey') THEN
        ALTER TABLE portal.intelligent_gw_conflicts ADD CONSTRAINT "intelligent_gw_conflicts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.intelligent_gw_routing_table'::regclass AND conname='intelligent_gw_routing_table_pkey') THEN
        ALTER TABLE portal.intelligent_gw_routing_table ADD CONSTRAINT "intelligent_gw_routing_table_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.intelligent_gw_stitch_logs'::regclass AND conname='intelligent_gw_stitch_logs_pkey') THEN
        ALTER TABLE portal.intelligent_gw_stitch_logs ADD CONSTRAINT "intelligent_gw_stitch_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.intelligent_gw_stitch_plans'::regclass AND conname='intelligent_gw_stitch_plans_pkey') THEN
        ALTER TABLE portal.intelligent_gw_stitch_plans ADD CONSTRAINT "intelligent_gw_stitch_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_accel_configs'::regclass AND conname='portal_accel_configs_pkey') THEN
        ALTER TABLE portal.portal_accel_configs ADD CONSTRAINT "portal_accel_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_acceleration_configs'::regclass AND conname='portal_acceleration_configs_pkey') THEN
        ALTER TABLE portal.portal_acceleration_configs ADD CONSTRAINT "portal_acceleration_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_acceleration_results'::regclass AND conname='portal_acceleration_results_pkey') THEN
        ALTER TABLE portal.portal_acceleration_results ADD CONSTRAINT "portal_acceleration_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_access_decisions'::regclass AND conname='portal_access_decisions_pkey') THEN
        ALTER TABLE portal.portal_access_decisions ADD CONSTRAINT "portal_access_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_access_policies'::regclass AND conname='portal_access_policies_pkey') THEN
        ALTER TABLE portal.portal_access_policies ADD CONSTRAINT "portal_access_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_aggregation_configs'::regclass AND conname='portal_aggregation_configs_pkey') THEN
        ALTER TABLE portal.portal_aggregation_configs ADD CONSTRAINT "portal_aggregation_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_aggregation_results'::regclass AND conname='portal_aggregation_results_pkey') THEN
        ALTER TABLE portal.portal_aggregation_results ADD CONSTRAINT "portal_aggregation_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_alert_thresholds'::regclass AND conname='portal_alert_thresholds_pkey') THEN
        ALTER TABLE portal.portal_alert_thresholds ADD CONSTRAINT "portal_alert_thresholds_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_anomalies'::regclass AND conname='portal_anomalies_pkey') THEN
        ALTER TABLE portal.portal_anomalies ADD CONSTRAINT "portal_anomalies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_api_versions'::regclass AND conname='portal_api_versions_pkey') THEN
        ALTER TABLE portal.portal_api_versions ADD CONSTRAINT "portal_api_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_audit_entries'::regclass AND conname='portal_audit_entries_pkey') THEN
        ALTER TABLE portal.portal_audit_entries ADD CONSTRAINT "portal_audit_entries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_audit_exports'::regclass AND conname='portal_audit_exports_pkey') THEN
        ALTER TABLE portal.portal_audit_exports ADD CONSTRAINT "portal_audit_exports_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_auth_policies'::regclass AND conname='portal_auth_policies_pkey') THEN
        ALTER TABLE portal.portal_auth_policies ADD CONSTRAINT "portal_auth_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_backpressure_configs'::regclass AND conname='portal_backpressure_configs_pkey') THEN
        ALTER TABLE portal.portal_backpressure_configs ADD CONSTRAINT "portal_backpressure_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_backpressure_states'::regclass AND conname='portal_backpressure_states_pkey') THEN
        ALTER TABLE portal.portal_backpressure_states ADD CONSTRAINT "portal_backpressure_states_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_cache_entries'::regclass AND conname='portal_cache_entries_pkey') THEN
        ALTER TABLE portal.portal_cache_entries ADD CONSTRAINT "portal_cache_entries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_cache_policies'::regclass AND conname='portal_cache_policies_pkey') THEN
        ALTER TABLE portal.portal_cache_policies ADD CONSTRAINT "portal_cache_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_cache_versions'::regclass AND conname='portal_cache_versions_pkey') THEN
        ALTER TABLE portal.portal_cache_versions ADD CONSTRAINT "portal_cache_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_canary_configs'::regclass AND conname='portal_canary_configs_pkey') THEN
        ALTER TABLE portal.portal_canary_configs ADD CONSTRAINT "portal_canary_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_canary_results'::regclass AND conname='portal_canary_results_pkey') THEN
        ALTER TABLE portal.portal_canary_results ADD CONSTRAINT "portal_canary_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_compatibility_policies'::regclass AND conname='portal_compatibility_policies_pkey') THEN
        ALTER TABLE portal.portal_compatibility_policies ADD CONSTRAINT "portal_compatibility_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_compatibility_reports'::regclass AND conname='portal_compatibility_reports_pkey') THEN
        ALTER TABLE portal.portal_compatibility_reports ADD CONSTRAINT "portal_compatibility_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_compilation_rules'::regclass AND conname='portal_compilation_rules_pkey') THEN
        ALTER TABLE portal.portal_compilation_rules ADD CONSTRAINT "portal_compilation_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_compiled_queries'::regclass AND conname='portal_compiled_queries_pkey') THEN
        ALTER TABLE portal.portal_compiled_queries ADD CONSTRAINT "portal_compiled_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_config_diffs'::regclass AND conname='portal_config_diffs_pkey') THEN
        ALTER TABLE portal.portal_config_diffs ADD CONSTRAINT "portal_config_diffs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_config_environments'::regclass AND conname='portal_config_environments_pkey') THEN
        ALTER TABLE portal.portal_config_environments ADD CONSTRAINT "portal_config_environments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_consistency_checks'::regclass AND conname='portal_consistency_checks_pkey') THEN
        ALTER TABLE portal.portal_consistency_checks ADD CONSTRAINT "portal_consistency_checks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_dead_letter_queue'::regclass AND conname='portal_dead_letter_queue_pkey') THEN
        ALTER TABLE portal.portal_dead_letter_queue ADD CONSTRAINT "portal_dead_letter_queue_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_dedup_results'::regclass AND conname='portal_dedup_results_pkey') THEN
        ALTER TABLE portal.portal_dedup_results ADD CONSTRAINT "portal_dedup_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_dedup_rules'::regclass AND conname='portal_dedup_rules_pkey') THEN
        ALTER TABLE portal.portal_dedup_rules ADD CONSTRAINT "portal_dedup_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_deployment_steps'::regclass AND conname='portal_deployment_steps_pkey') THEN
        ALTER TABLE portal.portal_deployment_steps ADD CONSTRAINT "portal_deployment_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_deployments'::regclass AND conname='portal_deployments_pkey') THEN
        ALTER TABLE portal.portal_deployments ADD CONSTRAINT "portal_deployments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_detection_models'::regclass AND conname='portal_detection_models_pkey') THEN
        ALTER TABLE portal.portal_detection_models ADD CONSTRAINT "portal_detection_models_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_distributed_queries'::regclass AND conname='portal_distributed_queries_pkey') THEN
        ALTER TABLE portal.portal_distributed_queries ADD CONSTRAINT "portal_distributed_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_edge_cache'::regclass AND conname='portal_edge_cache_pkey') THEN
        ALTER TABLE portal.portal_edge_cache ADD CONSTRAINT "portal_edge_cache_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_edge_deployments'::regclass AND conname='portal_edge_deployments_pkey') THEN
        ALTER TABLE portal.portal_edge_deployments ADD CONSTRAINT "portal_edge_deployments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_edge_entries'::regclass AND conname='portal_edge_entries_pkey') THEN
        ALTER TABLE portal.portal_edge_entries ADD CONSTRAINT "portal_edge_entries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_edge_functions'::regclass AND conname='portal_edge_functions_pkey') THEN
        ALTER TABLE portal.portal_edge_functions ADD CONSTRAINT "portal_edge_functions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_edge_replication'::regclass AND conname='portal_edge_replication_pkey') THEN
        ALTER TABLE portal.portal_edge_replication ADD CONSTRAINT "portal_edge_replication_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_execution_plans'::regclass AND conname='portal_execution_plans_pkey') THEN
        ALTER TABLE portal.portal_execution_plans ADD CONSTRAINT "portal_execution_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_execution_steps'::regclass AND conname='portal_execution_steps_pkey') THEN
        ALTER TABLE portal.portal_execution_steps ADD CONSTRAINT "portal_execution_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_federated_identities'::regclass AND conname='portal_federated_identities_pkey') THEN
        ALTER TABLE portal.portal_federated_identities ADD CONSTRAINT "portal_federated_identities_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_gateway_configs'::regclass AND conname='portal_gateway_configs_pkey') THEN
        ALTER TABLE portal.portal_gateway_configs ADD CONSTRAINT "portal_gateway_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_healing_actions'::regclass AND conname='portal_healing_actions_pkey') THEN
        ALTER TABLE portal.portal_healing_actions ADD CONSTRAINT "portal_healing_actions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_health_checks'::regclass AND conname='portal_health_checks_pkey') THEN
        ALTER TABLE portal.portal_health_checks ADD CONSTRAINT "portal_health_checks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_identity_policies'::regclass AND conname='portal_identity_policies_pkey') THEN
        ALTER TABLE portal.portal_identity_policies ADD CONSTRAINT "portal_identity_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_invalidation_events'::regclass AND conname='portal_invalidation_events_pkey') THEN
        ALTER TABLE portal.portal_invalidation_events ADD CONSTRAINT "portal_invalidation_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_latency_stats'::regclass AND conname='portal_latency_stats_pkey') THEN
        ALTER TABLE portal.portal_latency_stats ADD CONSTRAINT "portal_latency_stats_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_masking_rules'::regclass AND conname='portal_masking_rules_pkey') THEN
        ALTER TABLE portal.portal_masking_rules ADD CONSTRAINT "portal_masking_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_metrics'::regclass AND conname='portal_metrics_pkey') THEN
        ALTER TABLE portal.portal_metrics ADD CONSTRAINT "portal_metrics_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_orchestration_plans'::regclass AND conname='portal_orchestration_plans_pkey') THEN
        ALTER TABLE portal.portal_orchestration_plans ADD CONSTRAINT "portal_orchestration_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_persisted_queries'::regclass AND conname='portal_persisted_queries_pkey') THEN
        ALTER TABLE portal.portal_persisted_queries ADD CONSTRAINT "portal_persisted_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_persisted_query_versions'::regclass AND conname='portal_persisted_query_versions_pkey') THEN
        ALTER TABLE portal.portal_persisted_query_versions ADD CONSTRAINT "portal_persisted_query_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_plan_steps'::regclass AND conname='portal_plan_steps_pkey') THEN
        ALTER TABLE portal.portal_plan_steps ADD CONSTRAINT "portal_plan_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_push_stats'::regclass AND conname='portal_push_stats_pkey') THEN
        ALTER TABLE portal.portal_push_stats ADD CONSTRAINT "portal_push_stats_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_queue_configs'::regclass AND conname='portal_queue_configs_pkey') THEN
        ALTER TABLE portal.portal_queue_configs ADD CONSTRAINT "portal_queue_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_queue_messages'::regclass AND conname='portal_queue_messages_pkey') THEN
        ALTER TABLE portal.portal_queue_messages ADD CONSTRAINT "portal_queue_messages_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_recovery_plans'::regclass AND conname='portal_recovery_plans_pkey') THEN
        ALTER TABLE portal.portal_recovery_plans ADD CONSTRAINT "portal_recovery_plans_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_replay_requests'::regclass AND conname='portal_replay_requests_pkey') THEN
        ALTER TABLE portal.portal_replay_requests ADD CONSTRAINT "portal_replay_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_replay_results'::regclass AND conname='portal_replay_results_pkey') THEN
        ALTER TABLE portal.portal_replay_results ADD CONSTRAINT "portal_replay_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_resolver_timings'::regclass AND conname='portal_resolver_timings_pkey') THEN
        ALTER TABLE portal.portal_resolver_timings ADD CONSTRAINT "portal_resolver_timings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_rollback_actions'::regclass AND conname='portal_rollback_actions_pkey') THEN
        ALTER TABLE portal.portal_rollback_actions ADD CONSTRAINT "portal_rollback_actions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_rollback_policies'::regclass AND conname='portal_rollback_policies_pkey') THEN
        ALTER TABLE portal.portal_rollback_policies ADD CONSTRAINT "portal_rollback_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_route_rules'::regclass AND conname='portal_route_rules_pkey') THEN
        ALTER TABLE portal.portal_route_rules ADD CONSTRAINT "portal_route_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_routing_decisions'::regclass AND conname='portal_routing_decisions_pkey') THEN
        ALTER TABLE portal.portal_routing_decisions ADD CONSTRAINT "portal_routing_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_routing_rules'::regclass AND conname='portal_routing_rules_pkey') THEN
        ALTER TABLE portal.portal_routing_rules ADD CONSTRAINT "portal_routing_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_security_events'::regclass AND conname='portal_security_events_pkey') THEN
        ALTER TABLE portal.portal_security_events ADD CONSTRAINT "portal_security_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_security_incidents'::regclass AND conname='portal_security_incidents_pkey') THEN
        ALTER TABLE portal.portal_security_incidents ADD CONSTRAINT "portal_security_incidents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_security_policies'::regclass AND conname='portal_security_policies_pkey') THEN
        ALTER TABLE portal.portal_security_policies ADD CONSTRAINT "portal_security_policies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_service_descriptors'::regclass AND conname='portal_service_descriptors_pkey') THEN
        ALTER TABLE portal.portal_service_descriptors ADD CONSTRAINT "portal_service_descriptors_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_service_heartbeats'::regclass AND conname='portal_service_heartbeats_pkey') THEN
        ALTER TABLE portal.portal_service_heartbeats ADD CONSTRAINT "portal_service_heartbeats_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_service_loads'::regclass AND conname='portal_service_loads_pkey') THEN
        ALTER TABLE portal.portal_service_loads ADD CONSTRAINT "portal_service_loads_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_stream_events'::regclass AND conname='portal_stream_events_pkey') THEN
        ALTER TABLE portal.portal_stream_events ADD CONSTRAINT "portal_stream_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_streams'::regclass AND conname='portal_streams_pkey') THEN
        ALTER TABLE portal.portal_streams ADD CONSTRAINT "portal_streams_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_sub_queries'::regclass AND conname='portal_sub_queries_pkey') THEN
        ALTER TABLE portal.portal_sub_queries ADD CONSTRAINT "portal_sub_queries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_subscribers'::regclass AND conname='portal_subscribers_pkey') THEN
        ALTER TABLE portal.portal_subscribers ADD CONSTRAINT "portal_subscribers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_subscription_channels'::regclass AND conname='portal_subscription_channels_pkey') THEN
        ALTER TABLE portal.portal_subscription_channels ADD CONSTRAINT "portal_subscription_channels_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_subscription_events'::regclass AND conname='portal_subscription_events_pkey') THEN
        ALTER TABLE portal.portal_subscription_events ADD CONSTRAINT "portal_subscription_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_subscription_records'::regclass AND conname='portal_subscription_records_pkey') THEN
        ALTER TABLE portal.portal_subscription_records ADD CONSTRAINT "portal_subscription_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_traces'::regclass AND conname='portal_traces_pkey') THEN
        ALTER TABLE portal.portal_traces ADD CONSTRAINT "portal_traces_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_trust_decisions'::regclass AND conname='portal_trust_decisions_pkey') THEN
        ALTER TABLE portal.portal_trust_decisions ADD CONSTRAINT "portal_trust_decisions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_version_mappings'::regclass AND conname='portal_version_mappings_pkey') THEN
        ALTER TABLE portal.portal_version_mappings ADD CONSTRAINT "portal_version_mappings_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='portal.portal_version_vectors'::regclass AND conname='portal_version_vectors_pkey') THEN
        ALTER TABLE portal.portal_version_vectors ADD CONSTRAINT "portal_version_vectors_pkey" PRIMARY KEY (id);
    END IF;
END $$;


