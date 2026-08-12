pub const SERVICE_SCHEMA: &str = "portal";

pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "graphql_execution_profiles",
        &[
            ("complexity_score", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("estimated_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("timeout_ms", "BIGINT NOT NULL DEFAULT 5000"),
            ("parallelism_level", "INT NOT NULL DEFAULT 1"),
            ("degradation_applied", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("strategy", "VARCHAR(32) NOT NULL DEFAULT 'balanced'"),
            ("field_count", "INT NOT NULL DEFAULT 0"),
            ("query_depth", "INT NOT NULL DEFAULT 0"),
            ("connection_count", "INT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "graphql_execution_metrics",
        &[
            ("total_queries", "BIGINT NOT NULL DEFAULT 0"),
            ("successful_queries", "BIGINT NOT NULL DEFAULT 0"),
            ("failed_queries", "BIGINT NOT NULL DEFAULT 0"),
            ("avg_complexity", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("avg_timeout_ms", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("avg_parallelism", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("degraded_queries", "BIGINT NOT NULL DEFAULT 0"),
            ("total_execution_time_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("recorded_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "graphql_optimization_history",
        &[
            ("original_query", "TEXT NOT NULL"),
            ("optimized_query", "TEXT NOT NULL"),
            ("original_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("optimized_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("estimated_savings", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("cache_key", "VARCHAR(128) NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "graphql_suggestions",
        &[
            ("optimization_id", "VARCHAR(128) NOT NULL"),
            ("suggestion_type", "VARCHAR(64) NOT NULL"),
            ("description", "TEXT NOT NULL"),
            ("current_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("suggested_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("applicable", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "graphql_streams",
        &[
            ("name", "VARCHAR(256) NOT NULL"),
            ("topic", "VARCHAR(256) NOT NULL"),
            ("state", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("buffer_size", "INT NOT NULL DEFAULT 1000"),
            ("batch_interval_ms", "BIGINT NOT NULL DEFAULT 100"),
            ("max_subscribers", "INT NOT NULL DEFAULT 100"),
            ("filter_expression", "TEXT"),
            ("heartbeat_interval_ms", "BIGINT NOT NULL DEFAULT 30000"),
            ("reconnect_max_attempts", "INT NOT NULL DEFAULT 5"),
            ("subscriber_count", "INT NOT NULL DEFAULT 0"),
            ("event_count", "BIGINT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("last_event_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "graphql_stream_events",
        &[
            ("event_type", "VARCHAR(128) NOT NULL"),
            ("payload", "JSONB NOT NULL DEFAULT '{}'"),
            ("sequence", "BIGINT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "graphql_stream_subscribers",
        &[
            ("subscriber_id", "VARCHAR(128) NOT NULL"),
            ("subscribed_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_routing_rules",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("condition", "JSONB NOT NULL DEFAULT '{}'"),
            ("target_service", "VARCHAR(128) NOT NULL"),
            ("priority", "INT NOT NULL DEFAULT 0"),
            ("weight", "INT NOT NULL DEFAULT 100"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_routing_decisions",
        &[
            ("query_hash", "VARCHAR(128)"),
            ("matched_rule_id", "VARCHAR(64)"),
            ("target_service", "VARCHAR(128) NOT NULL"),
            ("reason", "VARCHAR(256)"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("routed_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_service_loads",
        &[
            ("cpu_usage", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("memory_usage", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("latency_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("active_queries", "INT NOT NULL DEFAULT 0"),
            ("last_updated", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_cache_policies",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("scope", "VARCHAR(32) NOT NULL DEFAULT 'query'"),
            ("ttl_ms", "BIGINT NOT NULL DEFAULT 3600000"),
            (
                "invalidation_strategy",
                "VARCHAR(32) NOT NULL DEFAULT 'time_based'",
            ),
            ("max_size", "BIGINT NOT NULL DEFAULT 10000"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_cache_entries",
        &[
            ("value", "JSONB NOT NULL"),
            ("ttl", "BIGINT NOT NULL DEFAULT 3600000"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("expires_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("access_count", "BIGINT NOT NULL DEFAULT 0"),
            ("last_accessed", "TIMESTAMPTZ"),
        ],
    ),
    (
        "portal_invalidation_events",
        &[
            ("cache_key", "VARCHAR(512) NOT NULL"),
            ("reason", "VARCHAR(256)"),
            ("triggered_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_health_checks",
        &[
            ("service_id", "VARCHAR(128) NOT NULL"),
            ("interval_ms", "BIGINT NOT NULL DEFAULT 10000"),
            ("timeout_ms", "BIGINT NOT NULL DEFAULT 5000"),
            ("healthy_threshold", "INT NOT NULL DEFAULT 2"),
            ("unhealthy_threshold", "INT NOT NULL DEFAULT 3"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_healing_actions",
        &[
            ("trigger", "VARCHAR(32) NOT NULL"),
            ("action_type", "VARCHAR(32) NOT NULL"),
            ("target", "VARCHAR(256) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("executed_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "portal_recovery_plans",
        &[
            ("service_id", "VARCHAR(128) NOT NULL"),
            ("steps", "JSONB NOT NULL DEFAULT '[]'"),
            ("estimated_duration_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
        ],
    ),
    (
        "portal_consistency_checks",
        &[
            ("entity_ids", "JSONB NOT NULL DEFAULT '[]'"),
            ("model", "VARCHAR(32) NOT NULL"),
            ("violations", "JSONB NOT NULL DEFAULT '[]'"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'passed'"),
        ],
    ),
    (
        "portal_version_vectors",
        &[
            ("versions", "JSONB NOT NULL DEFAULT '{}'"),
            ("timestamp", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_distributed_queries",
        &[
            ("query_plan", "JSONB NOT NULL DEFAULT '{}'"),
            ("routing_map", "JSONB NOT NULL DEFAULT '{}'"),
            (
                "consistency_requirement",
                "VARCHAR(32) NOT NULL DEFAULT 'eventual'",
            ),
            ("timeout_ms", "BIGINT NOT NULL DEFAULT 30000"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_sub_queries",
        &[
            ("query_id", "VARCHAR(64) NOT NULL"),
            ("service", "VARCHAR(128) NOT NULL"),
            ("query", "TEXT NOT NULL"),
            ("variables", "JSONB"),
            ("depends_on", "JSONB NOT NULL DEFAULT '[]'"),
            ("result", "JSONB"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
        ],
    ),
    (
        "portal_federated_identities",
        &[
            ("provider", "VARCHAR(32) NOT NULL"),
            ("claims", "JSONB NOT NULL DEFAULT '{}'"),
            ("scopes", "JSONB NOT NULL DEFAULT '[]'"),
            ("authenticated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_auth_policies",
        &[
            ("federation_id", "VARCHAR(64) NOT NULL"),
            ("required_roles", "JSONB NOT NULL DEFAULT '[]'"),
            ("token_issuer", "VARCHAR(256) NOT NULL"),
            ("audience", "VARCHAR(256) NOT NULL"),
            ("token_validity", "BIGINT NOT NULL DEFAULT 3600"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_deployments",
        &[
            ("version", "VARCHAR(64) NOT NULL"),
            ("environment", "VARCHAR(32) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("strategy", "VARCHAR(32) NOT NULL DEFAULT 'rolling'"),
            ("started_at", "TIMESTAMPTZ"),
            ("completed_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_deployment_steps",
        &[
            ("deployment_id", "VARCHAR(64) NOT NULL"),
            ("step_type", "VARCHAR(32) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("message", "TEXT"),
            ("duration_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_gateway_configs",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("version", "VARCHAR(64) NOT NULL"),
            ("environment", "VARCHAR(32) NOT NULL"),
            ("settings", "JSONB NOT NULL DEFAULT '{}'"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_config_diffs",
        &[
            ("config_id", "VARCHAR(64) NOT NULL"),
            ("old_config", "JSONB NOT NULL DEFAULT '{}'"),
            ("new_config", "JSONB NOT NULL DEFAULT '{}'"),
            ("changed_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("changed_by", "VARCHAR(128)"),
        ],
    ),
    (
        "portal_config_environments",
        &[
            ("type", "VARCHAR(32) NOT NULL"),
            ("base_url", "VARCHAR(512)"),
            ("variables", "JSONB NOT NULL DEFAULT '{}'"),
            ("is_protected", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_rollback_policies",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("trigger", "VARCHAR(32) NOT NULL DEFAULT 'manual'"),
            ("condition", "JSONB"),
            ("rollback_steps", "JSONB NOT NULL DEFAULT '[]'"),
            ("max_rollbacks", "INT NOT NULL DEFAULT 5"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_rollback_actions",
        &[
            ("policy_id", "VARCHAR(64) NOT NULL"),
            ("action", "VARCHAR(32) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("executed_at", "TIMESTAMPTZ"),
            ("reason", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_edge_functions",
        &[
            ("code", "TEXT NOT NULL"),
            ("location", "VARCHAR(64) NOT NULL DEFAULT 'apac'"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("timeout_ms", "INT NOT NULL DEFAULT 5000"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_edge_cache",
        &[
            ("data", "JSONB NOT NULL"),
            ("location", "VARCHAR(64) NOT NULL"),
            ("ttl_ms", "BIGINT NOT NULL DEFAULT 3600000"),
            ("expires_at", "TIMESTAMPTZ NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_accel_configs",
        &[
            ("locations", "JSONB NOT NULL DEFAULT '[]'"),
            ("routing_strategy", "VARCHAR(32) NOT NULL DEFAULT 'nearest'"),
            ("ttl_ms", "BIGINT NOT NULL DEFAULT 3600000"),
            ("compression_enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_edge_deployments",
        &[
            ("function_id", "VARCHAR(64) NOT NULL"),
            ("location", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'deploying'"),
            ("version", "INT NOT NULL DEFAULT 1"),
            ("deployed_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_latency_stats",
        &[
            ("request_id", "VARCHAR(64)"),
            ("total_ms", "INT NOT NULL DEFAULT 0"),
            ("render_ms", "INT NOT NULL DEFAULT 0"),
            ("network_ms", "INT NOT NULL DEFAULT 0"),
            ("processing_ms", "INT NOT NULL DEFAULT 0"),
            ("location", "VARCHAR(64)"),
            ("cache_hit", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "federation_subgraphs",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("url", "VARCHAR(512) NOT NULL"),
            ("types", "JSONB NOT NULL DEFAULT '[]'"),
            ("entities", "JSONB NOT NULL DEFAULT '[]'"),
            ("version", "INTEGER NOT NULL DEFAULT 1"),
            ("health_status", "VARCHAR(32) NOT NULL DEFAULT 'unknown'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "federation_query_plans",
        &[
            ("operations", "JSONB NOT NULL DEFAULT '[]'"),
            ("merge_strategy", "VARCHAR(64) NOT NULL"),
            (
                "estimated_total_cost",
                "DOUBLE PRECISION NOT NULL DEFAULT 0",
            ),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "federation_execution_logs",
        &[
            ("query_id", "VARCHAR(64) NOT NULL"),
            ("subgraph_id", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL"),
            ("duration_ms", "INTEGER NOT NULL DEFAULT 0"),
            ("result", "JSONB"),
            ("error_message", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "federation_transactions",
        &[
            ("participants", "JSONB NOT NULL DEFAULT '[]'"),
            ("state", "VARCHAR(32) NOT NULL DEFAULT 'init'"),
            ("timeout_ms", "INTEGER NOT NULL DEFAULT 30000"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "federation_transaction_steps",
        &[
            ("transaction_id", "VARCHAR(64) NOT NULL"),
            ("action", "VARCHAR(32) NOT NULL"),
            ("target_service", "VARCHAR(128) NOT NULL"),
            ("payload", "JSONB"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "federation_compensation_logs",
        &[
            ("transaction_id", "VARCHAR(64) NOT NULL"),
            ("step_id", "VARCHAR(64) NOT NULL"),
            ("compensation_action", "VARCHAR(32) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL"),
            ("error_message", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_metrics",
        &[
            ("name", "VARCHAR(128) NOT NULL"),
            ("metric_type", "VARCHAR(32) NOT NULL"),
            ("value", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("labels", "JSONB NOT NULL DEFAULT '{}'"),
        ],
    ),
    (
        "portal_alert_thresholds",
        &[
            ("metric_name", "VARCHAR(128) NOT NULL"),
            ("warning_threshold", "DOUBLE PRECISION NOT NULL"),
            ("critical_threshold", "DOUBLE PRECISION NOT NULL"),
            ("comparison_operator", "VARCHAR(16) NOT NULL DEFAULT 'gt'"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_traces",
        &[
            ("query_hash", "VARCHAR(128)"),
            ("duration_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("cache_hits", "INT NOT NULL DEFAULT 0"),
            ("errors", "JSONB NOT NULL DEFAULT '[]'"),
            ("traced_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_resolver_timings",
        &[
            ("trace_id", "VARCHAR(64) NOT NULL"),
            ("path", "VARCHAR(256) NOT NULL"),
            ("duration_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("start_time", "TIMESTAMPTZ"),
            ("end_time", "TIMESTAMPTZ"),
        ],
    ),
    (
        "portal_anomalies",
        &[
            ("anomaly_type", "VARCHAR(32) NOT NULL"),
            ("severity", "VARCHAR(16) NOT NULL DEFAULT 'medium'"),
            ("metric_name", "VARCHAR(128) NOT NULL"),
            ("expected_value", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("actual_value", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("deviation", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("detected_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_detection_models",
        &[
            ("metric_name", "VARCHAR(128) NOT NULL"),
            ("algorithm", "VARCHAR(32) NOT NULL"),
            ("threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("sensitivity", "DOUBLE PRECISION NOT NULL DEFAULT 0.05"),
            ("trained_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "portal_security_policies",
        &[
            ("authentication_type", "VARCHAR(32) NOT NULL DEFAULT 'jwt'"),
            ("token_validity_sec", "INT NOT NULL DEFAULT 3600"),
            ("rate_limit_per_min", "INT NOT NULL DEFAULT 100"),
            ("ip_whitelist", "JSONB NOT NULL DEFAULT '[]'"),
            ("require_https", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_security_incidents",
        &[
            ("incident_type", "VARCHAR(32) NOT NULL"),
            ("severity", "VARCHAR(16) NOT NULL DEFAULT 'medium'"),
            ("source_ip", "VARCHAR(64)"),
            ("user_agent", "TEXT"),
            ("payload", "JSONB"),
            ("detected_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_audit_entries",
        &[
            ("actor_id", "VARCHAR(128)"),
            ("actor_type", "VARCHAR(32) NOT NULL DEFAULT 'user'"),
            ("action", "VARCHAR(128) NOT NULL"),
            ("resource_type", "VARCHAR(128) NOT NULL"),
            ("resource_id", "VARCHAR(128)"),
            ("old_value", "JSONB"),
            ("new_value", "JSONB"),
            ("ip_address", "VARCHAR(64)"),
            ("timestamp", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("correlation_id", "VARCHAR(128)"),
        ],
    ),
    (
        "portal_audit_exports",
        &[
            ("format", "VARCHAR(16) NOT NULL DEFAULT 'json'"),
            ("filter", "JSONB"),
            ("created_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("expires_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "portal_access_policies",
        &[
            ("resource_type", "VARCHAR(128) NOT NULL"),
            ("resource_pattern", "VARCHAR(256) NOT NULL"),
            ("actions", "JSONB NOT NULL DEFAULT '[]'"),
            ("effect", "VARCHAR(16) NOT NULL DEFAULT 'allow'"),
            ("conditions", "JSONB"),
            ("priority", "INT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_access_decisions",
        &[
            ("request_id", "VARCHAR(128)"),
            ("actor_id", "VARCHAR(128)"),
            ("resource", "VARCHAR(256)"),
            ("action", "VARCHAR(128)"),
            ("decision", "VARCHAR(16) NOT NULL DEFAULT 'allow'"),
            ("reason", "TEXT"),
            ("matched_policy_id", "VARCHAR(64)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "intelligent_gw_routing_table",
        &[
            ("query_hash", "VARCHAR(128) NOT NULL"),
            ("intent", "VARCHAR(32) NOT NULL"),
            ("target_service", "VARCHAR(128) NOT NULL"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("reason", "TEXT"),
            ("alternatives", "JSONB NOT NULL DEFAULT '[]'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "intelligent_gw_affinities",
        &[
            ("service_id", "VARCHAR(128) NOT NULL"),
            ("entity_types", "JSONB NOT NULL DEFAULT '[]'"),
            ("score", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("last_updated", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "intelligent_gw_stitch_plans",
        &[
            ("subgraphs", "JSONB NOT NULL DEFAULT '[]'"),
            ("merged_types", "JSONB NOT NULL DEFAULT '[]'"),
            ("conflicts", "JSONB NOT NULL DEFAULT '[]'"),
            ("resolution_strategy", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "intelligent_gw_stitch_logs",
        &[
            ("plan_id", "VARCHAR(64) NOT NULL"),
            ("action", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL"),
            ("details", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "intelligent_gw_conflicts",
        &[
            ("type_name", "VARCHAR(128) NOT NULL"),
            ("conflicting_fields", "JSONB NOT NULL DEFAULT '[]'"),
            ("resolution", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_orchestration_plans",
        &[
            ("query_id", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("estimated_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("timeout_ms", "BIGINT NOT NULL DEFAULT 30000"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_execution_steps",
        &[
            ("plan_id", "VARCHAR(64) NOT NULL"),
            ("service", "VARCHAR(128) NOT NULL"),
            ("operation", "VARCHAR(128) NOT NULL"),
            ("depends_on", "JSONB NOT NULL DEFAULT '[]'"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("result", "JSONB"),
            ("started_at", "TIMESTAMPTZ"),
            ("completed_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "portal_service_descriptors",
        &[
            ("version", "VARCHAR(64) NOT NULL"),
            ("endpoint", "VARCHAR(512) NOT NULL"),
            ("capabilities", "JSONB NOT NULL DEFAULT '[]'"),
            ("health_status", "VARCHAR(32) NOT NULL DEFAULT 'healthy'"),
            ("last_heartbeat", "TIMESTAMPTZ"),
            ("metadata", "JSONB NOT NULL DEFAULT '{}'"),
        ],
    ),
    (
        "portal_service_heartbeats",
        &[
            ("service_id", "VARCHAR(64) NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL"),
            ("latency_ms", "BIGINT NOT NULL DEFAULT 0"),
        ],
    ),
    (
        "portal_route_rules",
        &[
            ("pattern", "VARCHAR(256) NOT NULL"),
            ("target_service", "VARCHAR(128) NOT NULL"),
            ("condition", "JSONB"),
            ("priority", "INT NOT NULL DEFAULT 0"),
            ("weight", "INT NOT NULL DEFAULT 100"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_routing_decisions",
        &[
            ("request_id", "VARCHAR(64) NOT NULL"),
            ("matched_rule_id", "VARCHAR(64)"),
            ("target_service", "VARCHAR(128) NOT NULL"),
            ("confidence", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("latency_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_persisted_queries",
        &[
            ("operation_name", "VARCHAR(128)"),
            ("query_text", "TEXT NOT NULL"),
            ("version", "INT NOT NULL DEFAULT 1"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("created_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("access_count", "BIGINT NOT NULL DEFAULT 0"),
        ],
    ),
    (
        "portal_persisted_query_versions",
        &[
            ("query_hash", "VARCHAR(64) NOT NULL"),
            ("version", "INT NOT NULL"),
            ("query_text", "TEXT NOT NULL"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("created_by", "VARCHAR(128)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_cache_versions",
        &[
            ("description", "VARCHAR(256)"),
            ("entry_count", "INT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("active", "BOOLEAN NOT NULL DEFAULT TRUE"),
        ],
    ),
    (
        "portal_cache_entries",
        &[
            ("cache_value", "JSONB NOT NULL"),
            ("version_id", "VARCHAR(64) NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("expires_at", "TIMESTAMPTZ"),
            ("size_bytes", "BIGINT NOT NULL DEFAULT 0"),
            ("tags", "JSONB"),
        ],
    ),
    (
        "portal_edge_entries",
        &[
            ("cache_key", "VARCHAR(512) NOT NULL"),
            ("cache_value", "JSONB NOT NULL"),
            ("location", "VARCHAR(32) NOT NULL"),
            ("ttl_ms", "BIGINT NOT NULL DEFAULT 3600000"),
            ("replicated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("sync_status", "VARCHAR(32) NOT NULL DEFAULT 'synced'"),
        ],
    ),
    (
        "portal_edge_replication",
        &[
            ("source_location", "VARCHAR(32) NOT NULL"),
            ("target_location", "VARCHAR(32) NOT NULL"),
            ("cache_key", "VARCHAR(512) NOT NULL"),
            ("replicated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'success'"),
        ],
    ),
    (
        "portal_compiled_queries",
        &[
            ("original_query", "TEXT NOT NULL"),
            ("optimized_query", "TEXT NOT NULL"),
            ("complexity_score", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("estimated_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("optimizations_applied", "JSONB NOT NULL DEFAULT '[]'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_compilation_rules",
        &[
            ("rule_type", "VARCHAR(64) NOT NULL"),
            ("description", "TEXT"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_execution_plans",
        &[
            ("query_hash", "VARCHAR(64) NOT NULL"),
            ("estimated_cost", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("parallelism", "INT NOT NULL DEFAULT 1"),
            ("score", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_plan_steps",
        &[
            ("plan_id", "VARCHAR(64) NOT NULL"),
            ("service", "VARCHAR(128) NOT NULL"),
            ("field_path", "TEXT NOT NULL"),
            ("depends_on", "JSONB"),
            ("estimated_time_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("strategy", "VARCHAR(64) NOT NULL DEFAULT 'sequential'"),
        ],
    ),
    (
        "portal_acceleration_results",
        &[
            ("strategy", "VARCHAR(64) NOT NULL"),
            ("original_time_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("optimized_time_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("speedup_factor", "DOUBLE PRECISION NOT NULL DEFAULT 1.0"),
            ("steps_saved", "INT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_acceleration_configs",
        &[
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("parameters", "JSONB NOT NULL DEFAULT '{}'"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_subscription_records",
        &[
            ("subscriber_id", "VARCHAR(128) NOT NULL"),
            ("topic", "VARCHAR(128) NOT NULL"),
            ("filter", "JSONB"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("last_activity", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("delivered_count", "BIGINT NOT NULL DEFAULT 0"),
        ],
    ),
    (
        "portal_subscription_events",
        &[
            ("subscription_id", "VARCHAR(64) NOT NULL"),
            ("event_type", "VARCHAR(64) NOT NULL"),
            ("payload", "JSONB NOT NULL"),
            ("sequence", "BIGINT NOT NULL"),
            ("delivered_at", "TIMESTAMPTZ"),
            ("expires_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "portal_replay_requests",
        &[
            ("subscription_id", "VARCHAR(64) NOT NULL"),
            ("from_sequence", "BIGINT NOT NULL DEFAULT 0"),
            ("to_sequence", "BIGINT"),
            ("batch_size", "INT NOT NULL DEFAULT 100"),
            ("replay_type", "VARCHAR(32) NOT NULL DEFAULT 'full'"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_replay_results",
        &[
            ("request_id", "VARCHAR(64) NOT NULL"),
            ("events_replayed", "BIGINT NOT NULL DEFAULT 0"),
            ("events_skipped", "BIGINT NOT NULL DEFAULT 0"),
            ("duration_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'completed'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_aggregation_configs",
        &[
            ("topic", "VARCHAR(128) NOT NULL"),
            ("window_size_ms", "BIGINT NOT NULL DEFAULT 60000"),
            ("aggregation_type", "VARCHAR(32) NOT NULL DEFAULT 'count'"),
            ("group_by", "JSONB"),
            ("filter_expr", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("active", "BOOLEAN NOT NULL DEFAULT TRUE"),
        ],
    ),
    (
        "portal_aggregation_results",
        &[
            ("config_id", "VARCHAR(64) NOT NULL"),
            ("window_start", "TIMESTAMPTZ NOT NULL"),
            ("window_end", "TIMESTAMPTZ NOT NULL"),
            ("groups", "JSONB NOT NULL DEFAULT '[]'"),
            ("values", "JSONB NOT NULL DEFAULT '{}'"),
            ("computed_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_security_policies",
        &[
            ("rate_limit_per_sec", "INT NOT NULL DEFAULT 100"),
            ("max_query_depth", "INT NOT NULL DEFAULT 10"),
            ("max_complexity", "INT NOT NULL DEFAULT 1000"),
            ("require_auth", "BOOLEAN NOT NULL DEFAULT TRUE"),
            (
                "allowed_operations",
                "JSONB NOT NULL DEFAULT '[\"query\", \"mutation\", \"subscription\"]'",
            ),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_security_events",
        &[
            ("event_type", "VARCHAR(32) NOT NULL"),
            ("client_ip", "VARCHAR(64)"),
            ("query_hash", "VARCHAR(128)"),
            ("action", "VARCHAR(64)"),
            ("details", "JSONB"),
            ("timestamp", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_trust_decisions",
        &[
            ("identity", "VARCHAR(128) NOT NULL"),
            ("decision", "VARCHAR(32) NOT NULL"),
            ("risk_score", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("reason", "TEXT"),
            ("context", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_identity_policies",
        &[
            ("description", "TEXT"),
            ("risk_threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0.7"),
            ("require_mfa", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("allowed_locations", "JSONB NOT NULL DEFAULT '[]'"),
            ("allowed_devices", "JSONB NOT NULL DEFAULT '[]'"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_masking_rules",
        &[
            ("field_path", "VARCHAR(256) NOT NULL"),
            ("mask_type", "VARCHAR(32) NOT NULL"),
            ("pattern", "VARCHAR(256)"),
            ("applied_to", "JSONB NOT NULL DEFAULT '[]'"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "gateway_routes",
        &[
            ("name", "VARCHAR(256) NOT NULL"),
            ("protocol", "VARCHAR(32) NOT NULL"),
            ("path_pattern", "VARCHAR(512) NOT NULL"),
            ("target_service", "VARCHAR(256) NOT NULL"),
            ("priority", "INT NOT NULL DEFAULT 100"),
            ("conditions", "JSONB NOT NULL DEFAULT '[]'"),
            (
                "load_balancing_strategy",
                "VARCHAR(32) NOT NULL DEFAULT 'round_robin'",
            ),
            ("circuit_breaker_config", "JSONB NOT NULL DEFAULT '{}'"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "gateway_protocols",
        &[
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("max_connections", "INT NOT NULL DEFAULT 1000"),
            ("timeout_ms", "BIGINT NOT NULL DEFAULT 30000"),
            ("rate_limit_per_sec", "INT NOT NULL DEFAULT 100"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "gateway_degradation_policies",
        &[
            ("level", "VARCHAR(32) NOT NULL"),
            ("latency_threshold_ms", "BIGINT NOT NULL DEFAULT 1000"),
            (
                "error_rate_threshold",
                "DOUBLE PRECISION NOT NULL DEFAULT 0.1",
            ),
            ("cpu_threshold", "DOUBLE PRECISION NOT NULL DEFAULT 0.85"),
            ("fallback_strategy", "VARCHAR(64) NOT NULL DEFAULT 'cache'"),
            (
                "notification_channels",
                "JSONB NOT NULL DEFAULT '[\"alert\"]'",
            ),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "gateway_health_metrics",
        &[
            ("service_name", "VARCHAR(256) NOT NULL"),
            ("latency_ms", "BIGINT NOT NULL DEFAULT 0"),
            ("error_rate", "DOUBLE PRECISION NOT NULL DEFAULT 0.0"),
            ("cpu_usage", "DOUBLE PRECISION NOT NULL DEFAULT 0.0"),
            ("memory_usage", "DOUBLE PRECISION NOT NULL DEFAULT 0.0"),
            ("request_count", "BIGINT NOT NULL DEFAULT 0"),
            ("success_count", "BIGINT NOT NULL DEFAULT 0"),
            ("failure_count", "BIGINT NOT NULL DEFAULT 0"),
            ("recorded_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_streams",
        &[
            ("topic", "VARCHAR(128) NOT NULL"),
            ("stream_type", "VARCHAR(32) NOT NULL DEFAULT 'event_stream'"),
            ("filter", "JSONB"),
            ("batch_size", "INT NOT NULL DEFAULT 100"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_stream_events",
        &[
            ("stream_id", "VARCHAR(64) NOT NULL"),
            ("event_type", "VARCHAR(64) NOT NULL"),
            ("payload", "JSONB NOT NULL"),
            ("sequence", "BIGINT NOT NULL"),
            ("timestamp", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_dedup_rules",
        &[
            ("stream_id", "VARCHAR(64) NOT NULL"),
            ("dedup_key", "VARCHAR(256) NOT NULL"),
            ("window_ms", "BIGINT NOT NULL DEFAULT 5000"),
            ("strategy", "VARCHAR(32) NOT NULL DEFAULT 'first_writer'"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_dedup_results",
        &[
            ("rule_id", "VARCHAR(64) NOT NULL"),
            ("original_id", "VARCHAR(64) NOT NULL"),
            ("duplicate_of", "VARCHAR(64)"),
            ("action", "VARCHAR(32) NOT NULL DEFAULT 'pass'"),
            ("merged_payload", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_backpressure_configs",
        &[
            ("stream_id", "VARCHAR(64) NOT NULL"),
            ("max_queue_size", "INT NOT NULL DEFAULT 10000"),
            ("high_watermark", "DOUBLE PRECISION NOT NULL DEFAULT 0.8"),
            ("low_watermark", "DOUBLE PRECISION NOT NULL DEFAULT 0.2"),
            ("overflow_strategy", "VARCHAR(32) NOT NULL DEFAULT 'drop'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_backpressure_states",
        &[
            ("stream_id", "VARCHAR(64) NOT NULL"),
            ("queue_depth", "INT NOT NULL DEFAULT 0"),
            ("utilization", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("dropped_count", "BIGINT NOT NULL DEFAULT 0"),
            ("last_drop_reason", "VARCHAR(128)"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_subscription_channels",
        &[
            ("description", "TEXT"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("subscriber_count", "INT NOT NULL DEFAULT 0"),
            ("message_count", "BIGINT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_subscribers",
        &[
            ("client_id", "VARCHAR(128) NOT NULL"),
            ("channels", "JSONB NOT NULL DEFAULT '[]'"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'connected'"),
            ("connected_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("last_seen", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_queue_configs",
        &[
            ("provider", "VARCHAR(32) NOT NULL DEFAULT 'memory'"),
            ("max_size", "INT NOT NULL DEFAULT 10000"),
            ("batch_size", "INT NOT NULL DEFAULT 100"),
            ("dead_letter_queue", "VARCHAR(128)"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_queue_messages",
        &[
            ("topic", "VARCHAR(128) NOT NULL"),
            ("message_key", "VARCHAR(256)"),
            ("message_value", "JSONB NOT NULL"),
            ("headers", "JSONB"),
            ("provider", "VARCHAR(32) NOT NULL DEFAULT 'memory'"),
            ("consumed", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("consumed_at", "TIMESTAMPTZ"),
            ("published_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_dead_letter_queue",
        &[
            ("original_message_id", "VARCHAR(64) NOT NULL"),
            ("topic", "VARCHAR(128) NOT NULL"),
            ("message_value", "JSONB NOT NULL"),
            ("error_reason", "TEXT"),
            ("retry_count", "INT NOT NULL DEFAULT 0"),
            ("max_retries", "INT NOT NULL DEFAULT 3"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("last_retry_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_push_stats",
        &[
            ("batch_window_ms", "INT NOT NULL DEFAULT 100"),
            ("total_pushes", "BIGINT NOT NULL DEFAULT 0"),
            ("batched_pushes", "BIGINT NOT NULL DEFAULT 0"),
            ("messages_pushed", "BIGINT NOT NULL DEFAULT 0"),
            ("avg_batch_size", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("backpressure_events", "BIGINT NOT NULL DEFAULT 0"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_api_versions",
        &[
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("released_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deprecated_at", "TIMESTAMPTZ"),
            ("sunset_at", "TIMESTAMPTZ"),
            ("changelog", "TEXT"),
            ("breaking_changes", "JSONB NOT NULL DEFAULT '[]'"),
        ],
    ),
    (
        "portal_version_mappings",
        &[
            ("client_version", "VARCHAR(64) NOT NULL"),
            ("server_version", "VARCHAR(64) NOT NULL"),
            ("compatibility", "VARCHAR(32) NOT NULL DEFAULT 'full'"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_canary_configs",
        &[
            ("version", "VARCHAR(64) NOT NULL"),
            ("percentage", "INT NOT NULL DEFAULT 0"),
            ("conditions", "JSONB NOT NULL DEFAULT '{}'"),
            ("start_time", "TIMESTAMPTZ"),
            ("end_time", "TIMESTAMPTZ"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'draft'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_canary_results",
        &[
            ("config_id", "VARCHAR(64) NOT NULL"),
            ("total_requests", "BIGINT NOT NULL DEFAULT 0"),
            ("canary_requests", "BIGINT NOT NULL DEFAULT 0"),
            ("baseline_requests", "BIGINT NOT NULL DEFAULT 0"),
            ("error_rate_canary", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("error_rate_baseline", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("winner", "VARCHAR(32)"),
            ("recorded_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_compatibility_reports",
        &[
            ("from_version", "VARCHAR(64) NOT NULL"),
            ("to_version", "VARCHAR(64) NOT NULL"),
            ("breaking_changes", "JSONB NOT NULL DEFAULT '[]'"),
            ("deprecated_fields", "JSONB NOT NULL DEFAULT '[]'"),
            ("compatible", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("migration_path", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "portal_compatibility_policies",
        &[
            (
                "min_compatibility_level",
                "VARCHAR(32) NOT NULL DEFAULT 'partial'",
            ),
            ("require_migration_path", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("enabled", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_faqs",
        &[
            ("question", "TEXT NOT NULL"),
            ("answer", "TEXT NOT NULL"),
            ("category", "VARCHAR(100) NOT NULL DEFAULT 'general'"),
            ("views", "BIGINT NOT NULL DEFAULT 0"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("sort_order", "INT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_guides",
        &[
            ("title", "TEXT NOT NULL"),
            ("description", "TEXT NOT NULL DEFAULT ''"),
            ("category", "VARCHAR(100) NOT NULL DEFAULT 'general'"),
            ("duration", "VARCHAR(50) NOT NULL DEFAULT '10min'"),
            ("lessons_count", "INT NOT NULL DEFAULT 0"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("sort_order", "INT NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_guide_lessons",
        &[
            ("title", "TEXT NOT NULL"),
            ("content", "TEXT NOT NULL DEFAULT ''"),
            ("duration", "VARCHAR(50) NOT NULL DEFAULT '5min'"),
            ("sort_order", "INT NOT NULL DEFAULT 0"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT true"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "core_guide_progress",
        &[
            ("user_id", "VARCHAR(255) NOT NULL"),
            ("completed_lessons", "UUID[] NOT NULL DEFAULT '{}'"),
            ("progress", "INT NOT NULL DEFAULT 0"),
            ("completed_at", "TIMESTAMPTZ"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "graphql_schema_versions",
        &[
            ("version", "VARCHAR(32) NOT NULL"),
            ("schema_definition", "TEXT NOT NULL"),
            ("change_type", "VARCHAR(64) NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("change_description", "TEXT"),
            ("approved_by", "VARCHAR(128)"),
            ("is_current", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ],
    ),
    (
        "graphql_breaking_changes",
        &[
            ("change_type", "VARCHAR(64) NOT NULL"),
            ("path", "VARCHAR(512) NOT NULL"),
            ("description", "TEXT NOT NULL"),
            ("affected_queries", "JSONB NOT NULL DEFAULT '[]'"),
            ("severity", "VARCHAR(16) NOT NULL"),
            ("detected_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "graphql_version_negotiations",
        &[
            ("requested_version", "VARCHAR(32) NOT NULL"),
            ("matched_version", "VARCHAR(32)"),
            ("fallback_used", "BOOLEAN NOT NULL DEFAULT FALSE"),
            ("strategy_used", "VARCHAR(64) NOT NULL"),
            ("negotiated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
];

use sqlx::PgPool;
use std::collections::BTreeSet;

async fn add_column_if_missing(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), sqlx::Error> {
    let qualified = match schema {
        Some(s) => format!(r#""{}"."{}""#, s, table),
        None => format!(r#""{}""#, table),
    };
    let ddl = format!(
        r#"ALTER TABLE {} ADD COLUMN IF NOT EXISTS "{}" {}"#,
        qualified, column, definition
    );
    sqlx::query(&ddl).execute(pool).await?;
    Ok(())
}

async fn ensure_table_columns(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    columns: &[(&str, &str)],
) -> Result<usize, sqlx::Error> {
    let mut n = 0usize;
    for (col, def) in columns {
        add_column_if_missing(pool, schema, table, col, def).await?;
        n += 1;
    }
    Ok(n)
}

async fn verify_table_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
    expected: &[&str],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(String,)> = sqlx::query_as(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        "#,
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await?;
    let actual: BTreeSet<&str> = rows.iter().map(|(c,)| c.as_str()).collect();
    let mut missing = Vec::new();
    for col in expected {
        if !actual.contains(col) {
            missing.push(*col);
        }
    }
    if !missing.is_empty() {
        tracing::warn!(
            "[portal schema 自检] {}.{} 仍缺失 {} 列: {:?}",
            schema,
            table,
            missing.len(),
            missing
        );
    }
    Ok(())
}

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 TABLE_DEFS 中所有表的"骨架"都存在（空表仅含 id PK）。
    // 新增的表如果老环境从未 CREATE 过，后续 ensure_table_columns(ALTER TABLE …)
    // 会因为 relation does not exist 直接报错。用 IF NOT EXISTS 建最小骨架即可，
    // 后续阶段 1 再补齐所有非 PK 列，老库已存在的表完全不受影响。
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (\
                id UUID PRIMARY KEY DEFAULT gen_random_uuid()\
            )",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }

    let mut tables_done = 0usize;
    let mut cols_added = 0usize;
    for (tbl, cols_arr) in TABLE_DEFS {
        let n = ensure_table_columns(pool, Some(SERVICE_SCHEMA), tbl, cols_arr).await?;
        tables_done += 1;
        cols_added += n;
    }
    tracing::info!(
        "[portal 增量迁移] 完成 {} 张表 / {} 列 ADD COLUMN IF NOT EXISTS 检查",
        tables_done,
        cols_added
    );
    let mut verified = 0usize;
    for (tbl, cols_arr) in TABLE_DEFS {
        let mut expected = vec!["id"];
        expected.extend(cols_arr.iter().map(|(c, _)| *c));
        verify_table_columns(pool, SERVICE_SCHEMA, tbl, &expected).await?;
        verified += 1;
    }
    tracing::info!(
        "[portal schema 自检] 完成 {} 张表结构一致性校验（缺失列会单独 WARN）",
        verified
    );
    Ok(())
}
