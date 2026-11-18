# TOPEMS 无代码引用表处置登记（清单 3）

- 日期：2026-11-19
- 审计基线：HEAD `831d60b75` 之后的收口提交；生产元数据沿用 2026-11-18 只读采集（`default_transaction_read_only=on`）
- 范围：生产 `relkind in ('r','p')`，全仓 Rust 源码零 SQL 引用（读/写/DDL/测试均无）
- 共 **477** 张：保留 131 / 归档候选 139 / 删除候选 207

> 本登记只给出处置建议，不生成 DROP 迁移、不改生产。删除候选在真正执行前需 DBA 复核无外部消费（报表、BI、外部系统直连）。

## 处置口径

| 处置 | 判定 |
|---|---|
| 保留 | portal 预留未启用；或迁移链有 INSERT/COPY 种子；或被外键引用 |
| 归档候选 | 历史 schema 副本（同名权威表已迁移/改名废弃），代码零引用、生产 0 行 |
| 删除候选 | 活跃 schema、生产 0 行、`n_tup_ins=0`、代码零引用、无触发器、无种子、无外键引用 |

## 逐表登记

| # | 表 | 处置 | 依据 | n_tup_ins | n_live_tup | 触发器 |
|---:|---|---|---|---:|---:|---|
| 1 | `core.core_tenant_plugins` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 2 | `finance.accounting_subjects` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 3 | `finance.core_finance_currencies` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 4 | `master_data.mdm_critical_functions` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 5 | `master_data.mdm_fix_strategies` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 6 | `master_data.mdm_quality_loop_configs` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 7 | `mes.tenant_backfill_quarantine` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 8 | `portal.core_guide_progress` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 9 | `portal.federation_compensation_logs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 10 | `portal.federation_execution_logs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 11 | `portal.federation_query_plans` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 12 | `portal.federation_subgraphs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 13 | `portal.federation_transaction_steps` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 14 | `portal.federation_transactions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 15 | `portal.gateway_degradation_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 16 | `portal.gateway_health_metrics` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 17 | `portal.gateway_protocols` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 18 | `portal.gateway_routes` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 19 | `portal.graphql_breaking_changes` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 20 | `portal.graphql_execution_metrics` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 21 | `portal.graphql_execution_profiles` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 22 | `portal.graphql_optimization_history` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 23 | `portal.graphql_schema_versions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 24 | `portal.graphql_stream_events` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 25 | `portal.graphql_stream_subscribers` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 26 | `portal.graphql_streams` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 27 | `portal.graphql_suggestions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 28 | `portal.graphql_version_negotiations` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 29 | `portal.intelligent_gw_affinities` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 30 | `portal.intelligent_gw_conflicts` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 31 | `portal.intelligent_gw_routing_table` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 32 | `portal.intelligent_gw_stitch_logs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 33 | `portal.intelligent_gw_stitch_plans` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 34 | `portal.portal_accel_configs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 35 | `portal.portal_acceleration_configs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 36 | `portal.portal_acceleration_results` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 37 | `portal.portal_access_decisions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 38 | `portal.portal_access_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 39 | `portal.portal_aggregation_configs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 40 | `portal.portal_aggregation_results` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 41 | `portal.portal_alert_thresholds` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 42 | `portal.portal_announcements` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 43 | `portal.portal_anomalies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 44 | `portal.portal_api_versions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 45 | `portal.portal_audit_entries` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 46 | `portal.portal_audit_exports` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 47 | `portal.portal_auth_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 48 | `portal.portal_backpressure_configs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 49 | `portal.portal_backpressure_states` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 50 | `portal.portal_cache_entries` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 51 | `portal.portal_cache_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 52 | `portal.portal_cache_versions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 53 | `portal.portal_canary_configs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 54 | `portal.portal_canary_results` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 55 | `portal.portal_compatibility_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 56 | `portal.portal_compatibility_reports` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 57 | `portal.portal_compilation_rules` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 58 | `portal.portal_compiled_queries` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 59 | `portal.portal_config_diffs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 60 | `portal.portal_config_environments` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 61 | `portal.portal_consistency_checks` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 62 | `portal.portal_dead_letter_queue` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 63 | `portal.portal_dedup_results` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 64 | `portal.portal_dedup_rules` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 65 | `portal.portal_deployment_steps` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 66 | `portal.portal_deployments` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 67 | `portal.portal_detection_models` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 68 | `portal.portal_distributed_queries` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 69 | `portal.portal_edge_cache` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 70 | `portal.portal_edge_deployments` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 71 | `portal.portal_edge_entries` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 72 | `portal.portal_edge_functions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 73 | `portal.portal_edge_replication` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 74 | `portal.portal_execution_plans` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 75 | `portal.portal_execution_steps` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 76 | `portal.portal_federated_identities` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 77 | `portal.portal_gateway_configs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 78 | `portal.portal_healing_actions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 79 | `portal.portal_health_checks` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 80 | `portal.portal_identity_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 81 | `portal.portal_invalidation_events` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 82 | `portal.portal_latency_stats` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 83 | `portal.portal_masking_rules` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 84 | `portal.portal_metrics` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 85 | `portal.portal_orchestration_plans` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 86 | `portal.portal_persisted_queries` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 87 | `portal.portal_persisted_query_versions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 88 | `portal.portal_plan_steps` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 89 | `portal.portal_push_stats` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 90 | `portal.portal_queue_configs` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 91 | `portal.portal_queue_messages` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 92 | `portal.portal_recovery_plans` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 93 | `portal.portal_replay_requests` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 94 | `portal.portal_replay_results` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 95 | `portal.portal_resolver_timings` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 96 | `portal.portal_rollback_actions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 97 | `portal.portal_rollback_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 98 | `portal.portal_route_rules` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 99 | `portal.portal_routing_decisions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 100 | `portal.portal_routing_rules` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 101 | `portal.portal_security_events` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 102 | `portal.portal_security_incidents` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 103 | `portal.portal_security_policies` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 104 | `portal.portal_service_descriptors` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 105 | `portal.portal_service_heartbeats` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 106 | `portal.portal_service_loads` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 107 | `portal.portal_stream_events` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 108 | `portal.portal_streams` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 109 | `portal.portal_sub_queries` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 110 | `portal.portal_subscribers` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 111 | `portal.portal_subscription_channels` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 112 | `portal.portal_subscription_events` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 113 | `portal.portal_subscription_records` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 114 | `portal.portal_traces` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 115 | `portal.portal_trust_decisions` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 116 | `portal.portal_version_mappings` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 117 | `portal.portal_version_vectors` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 118 | `portal.user_preferences` | 保留 | portal 预留未启用（已有既有登记，不重复判定） | 0 | 0 | 无 |
| 119 | `public.announcements` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 120 | `public.core_file_permissions` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 121 | `public.core_finance_accounts` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 122 | `public.core_finance_periods` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 123 | `public.core_tenant_plugins` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 124 | `public.core_ticket_activities` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 125 | `public.core_ticket_comments` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 126 | `public.core_tickets` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 127 | `public.core_users` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 128 | `public.qa_ehs_hazards` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 129 | `public.qa_qms_sync_records` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 130 | `qms.qa_ehs_hazards` | 保留 | 迁移链存在 INSERT/COPY 种子，属只读字典/初始数据 | 0 | 0 | 无 |
| 131 | `qms.quality_standards` | 保留 | 被其它表外键引用（FK parent），删除需先解依赖 | 0 | 0 | 无 |
| 132 | `analytics.analytics_comparison_analyses` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 133 | `analytics.analytics_comparison_results` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 134 | `analytics.analytics_dashboard_shares` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 135 | `analytics.analytics_dashboard_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 136 | `analytics.analytics_dashboards` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 137 | `analytics.analytics_datasets` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 138 | `analytics.analytics_datasources` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 139 | `analytics.analytics_drilldown_history` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 140 | `analytics.analytics_drilldown_paths` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 141 | `analytics.analytics_row_level_permissions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 142 | `analytics.analytics_self_service_reports` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 143 | `analytics.analytics_sync_records` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 144 | `analytics.analytics_widgets` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 145 | `analytics.report_schedules` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 146 | `analytics.report_subscriptions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 147 | `analytics.report_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 148 | `analytics.reports` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 149 | `communication.core_email_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 150 | `doc.document_versions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 151 | `doc.documents` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 152 | `doc.folders` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 153 | `doc.templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 154 | `doc_service.archives` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 155 | `doc_service.core_doc_documents` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 156 | `doc_service.core_doc_folders` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 157 | `doc_service.core_doc_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 158 | `doc_service.files` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 159 | `doc_service.folders` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 160 | `doc_service.templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 161 | `flow.approval_records` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 162 | `flow.approvals` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 163 | `flow.audit_logs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 164 | `flow.core_doc_document_versions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 165 | `flow.core_doc_documents` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 166 | `flow.core_doc_folders` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 167 | `flow.core_doc_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 168 | `flow.core_file_folders` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 169 | `flow.core_file_permissions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 170 | `flow.core_files` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 171 | `flow.core_flow_categories` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 172 | `flow.core_flow_delegates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 173 | `flow.core_flow_rules` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 174 | `flow.core_flow_variable_history` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 175 | `flow.core_flow_variables` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 176 | `flow.core_master_data_change_log` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 177 | `flow.core_master_data_refs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 178 | `flow.core_mdm_approvals` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 179 | `flow.core_mdm_reconciliation_log` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 180 | `flow.core_migration_history` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 181 | `flow.core_operation_logs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 182 | `flow.core_tenant_modules` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 183 | `flow.core_tenant_settings` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 184 | `flow.core_tenant_usage` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 185 | `flow.core_tenant_users` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 186 | `flow.core_tenants` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 187 | `flow.core_workflow_instances` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 188 | `flow.core_workflow_tasks` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 189 | `flow.core_workflow_versions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 190 | `flow.core_workflows` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 191 | `flow.notifications` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 192 | `flow.workflows` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 193 | `iam.audit_logs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 194 | `iam.auth_sessions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 195 | `iam.core_billing_invoices` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 196 | `iam.core_billing_plans` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 197 | `iam.core_chat_members` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 198 | `iam.core_chat_messages` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 199 | `iam.core_chat_rooms` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 200 | `iam.core_dashboard_refresh_log` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 201 | `iam.core_dict_items` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 202 | `iam.core_dict_types` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 203 | `iam.core_email_queue` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 204 | `iam.core_email_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 205 | `iam.core_emails` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 206 | `iam.core_faqs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 207 | `iam.core_file_folders` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 208 | `iam.core_files` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 209 | `iam.core_guide_lessons` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 210 | `iam.core_guide_progress` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 211 | `iam.core_guides` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 212 | `iam.core_inter_module_sync` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 213 | `iam.core_login_logs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 214 | `iam.core_menu_groups` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 215 | `iam.core_menus` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 216 | `iam.core_migration_history` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 217 | `iam.core_mobile_offline_records` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 218 | `iam.core_notification_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 219 | `iam.core_notifications` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 220 | `iam.core_plugin_categories` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 221 | `iam.core_plugin_instances` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 222 | `iam.core_plugin_permissions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 223 | `iam.core_plugin_pricing` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 224 | `iam.core_plugin_reviews` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 225 | `iam.core_plugin_versions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 226 | `iam.core_plugins` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 227 | `iam.core_subscriptions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 228 | `iam.core_tenant_modules` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 229 | `iam.core_tenant_settings` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 230 | `iam.core_tenant_usage` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 231 | `iam.core_tenant_users` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 232 | `iam.core_tenants` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 233 | `iam.core_usage_records` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 234 | `iam.core_users` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 235 | `iam.core_workflow_instances` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 236 | `iam.core_workflow_tasks` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 237 | `iam.core_workflows` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 238 | `iam.crm_dashboard_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 239 | `iam.data_permissions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 240 | `iam.dynamic_data` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 241 | `iam.ehs_dashboard_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 242 | `iam.hrm_dashboard_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 243 | `iam.lims_dashboard_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 244 | `iam.password_reset_tokens` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 245 | `iam.pdm_dashboard_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 246 | `iam.permission_audit_logs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 247 | `iam.permission_templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 248 | `iam.permissions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 249 | `iam.refresh_tokens` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 250 | `iam.schema_registry` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 251 | `iam.sessions` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 252 | `iam.tenant_users` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 253 | `iam.user_access_logs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 254 | `iam.user_roles` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 255 | `iam.wms_dashboard_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 256 | `mail.emails` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 257 | `mail.templates` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 258 | `notification.notifications` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 259 | `plugin_erp.accounting_subjects` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 260 | `plugin_finance.difference_adjustments` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 261 | `plugin_finance.reconciliation_item_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 262 | `plugin_finance.reconciliation_settlement_links` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 263 | `plugin_finance.reconciliation_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 264 | `plugin_finance.settlement_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 265 | `plugin_finance.source_amount_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 266 | `plugin_mes.audit_logs` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 267 | `plugin_wms.purchase_order_snapshots` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 268 | `report.reports` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 269 | `storage.files` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 270 | `unified_core.documents` | 归档候选 | 历史 schema 副本；同名权威表已迁至 public/业务 schema，或迁移已改名废弃 | 0 | 0 | 无 |
| 271 | `bi.audit_logs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 272 | `bi.report_execution_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 273 | `crm.crm_master_data_refs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 274 | `ehs.audit_logs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 275 | `ehs.drill_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 276 | `ehs.emergency_plans` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 277 | `ehs.environmental_alerts` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 278 | `ehs.environmental_data` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 279 | `ehs.health_checkups` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 280 | `ehs.monitoring_points` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 281 | `ehs.qa_ehs_accident_investigations` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 282 | `ehs.qa_ehs_accident_reviews` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 283 | `ehs.qa_ehs_accident_treatments` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 284 | `ehs.qa_ehs_compliance_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 285 | `ehs.qa_ehs_detection_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 286 | `ehs.qa_ehs_environment` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 287 | `ehs.qa_ehs_health_abnormalities` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 288 | `ehs.qa_ehs_health_trainings` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 289 | `ehs.qa_ehs_material_stocks` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 290 | `ehs.qa_ehs_protection_measures` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 291 | `ehs.risk_assessments` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 292 | `ehs.risk_controls` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 293 | `ehs.safety_incidents` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 294 | `ehs.vaccination_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 295 | `erp.expenses` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 296 | `erp.voucher_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 297 | `erp.vouchers` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 298 | `finance.core_finance_approval_workflows` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 299 | `finance.reconciliation_orders` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 300 | `finance.settlement_center_dashboards` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 301 | `gis.audit_log` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 302 | `gis.audit_logs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 303 | `gis.geofence_alerts` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 304 | `hrm.hrm_master_data_refs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 305 | `hrm.payroll_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 306 | `hrm.performance_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 307 | `hrm.recruitment_applications` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 308 | `hrm.recruitment_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 309 | `hrm.training_participants` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 310 | `lims.ai_analyses` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 311 | `lims.audit_logs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 312 | `lims.document_relations` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 313 | `lims.lab_ledger` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 314 | `lims.qa_lab_inspection_reports` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 315 | `lims.qa_lab_reagent_alerts` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 316 | `lims.qa_lab_reagent_history` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 317 | `lims.qa_lab_sample_lifecycle` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 318 | `lims.reagent_usages` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 319 | `lims.reagents` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 320 | `master_data.core_master_data_change_log` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 321 | `master_data.core_master_data_event_outbox` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 322 | `master_data.core_master_data_refs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 323 | `master_data.core_mdm_approvals` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 324 | `master_data.core_mdm_reconciliation_log` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 325 | `master_data.dynamic_data` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | trigger_dynamic_data_updated_at |
| 326 | `master_data.schema_registry` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | trigger_schema_registry_updated_at |
| 327 | `mes.dashboard_stats` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 328 | `mes.financial_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 329 | `mes.material_requirement_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 330 | `mes.supply_chain_orders` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 331 | `mobile.mobile_leave_applications` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 332 | `pm.acceptances` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 333 | `pm.documents` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 334 | `pm.pm_master_data_refs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 335 | `pm.service_integrations` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 336 | `public.alert_rules` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 337 | `public.alerts` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 338 | `public.analytics_sync_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 339 | `public.conversion_executions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 340 | `public.conversion_rules` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 341 | `public.core_faqs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 342 | `public.core_file_folders` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 343 | `public.core_finance_account_opening_balances` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 344 | `public.core_finance_approval_workflows` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 345 | `public.core_finance_aux_accounts` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 346 | `public.core_finance_aux_balances` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 347 | `public.core_finance_ledger` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 348 | `public.core_finance_reconciliation_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 349 | `public.core_finance_reconciliation_sessions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 350 | `public.core_finance_voucher_entries` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 351 | `public.core_finance_voucher_lines` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 352 | `public.core_finance_voucher_templates` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 353 | `public.core_finance_vouchers` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 354 | `public.core_guide_lessons` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 355 | `public.core_guide_progress` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 356 | `public.core_guides` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 357 | `public.core_inter_module_sync` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 358 | `public.core_master_data_event_outbox` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 359 | `public.core_mdm_reconciliation_log` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 360 | `public.core_plugin_categories` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 361 | `public.core_plugin_instances` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 362 | `public.core_plugin_navigation` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 363 | `public.core_plugin_permissions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 364 | `public.core_plugin_reviews` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 365 | `public.core_plugin_versions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 366 | `public.core_plugins` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 367 | `public.core_ticket_sla_escalations` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 368 | `public.core_ticket_sla_policies` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 369 | `public.cqrs_events` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 370 | `public.crm_dashboard_snapshots` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 371 | `public.ehs_dashboard_snapshots` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 372 | `public.equipment` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 373 | `public.equipment_inspections` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 374 | `public.equipment_maintenance_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 375 | `public.finance_voucher_templates` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 376 | `public.financial_reports` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 377 | `public.hrm_dashboard_snapshots` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 378 | `public.lims_dashboard_snapshots` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 379 | `public.material_boms` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 380 | `public.material_categories` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 381 | `public.material_issue_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 382 | `public.material_issues` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 383 | `public.material_requirement_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 384 | `public.material_requirements` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 385 | `public.material_return_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 386 | `public.material_returns` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 387 | `public.meeting_bookings` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 388 | `public.meeting_rooms` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 389 | `public.navigation_menu` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 390 | `public.pdm_change_notices` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 391 | `public.pdm_dashboard_snapshots` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 392 | `public.pdm_materials` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 393 | `public.pdm_products` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 394 | `public.pinned_apps` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 395 | `public.pm_master_data_refs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 396 | `public.process_flow_steps` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 397 | `public.process_flows` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 398 | `public.qa_ehs_accident_investigations` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 399 | `public.qa_ehs_accident_reviews` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 400 | `public.qa_ehs_accident_treatments` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 401 | `public.qa_ehs_accidents` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 402 | `public.qa_ehs_compliance_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 403 | `public.qa_ehs_contraindications` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 404 | `public.qa_ehs_detection_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 405 | `public.qa_ehs_emergency_plans` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 406 | `public.qa_ehs_environment` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 407 | `public.qa_ehs_hazard_rectifications` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 408 | `public.qa_ehs_hazard_verifications` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 409 | `public.qa_ehs_hazardous_materials` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 410 | `public.qa_ehs_health_abnormalities` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 411 | `public.qa_ehs_health_exam_plans` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 412 | `public.qa_ehs_health_exam_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 413 | `public.qa_ehs_health_trainings` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 414 | `public.qa_ehs_inspection_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 415 | `public.qa_ehs_inspection_plans` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 416 | `public.qa_ehs_material_stocks` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 417 | `public.qa_ehs_protection_measures` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 418 | `public.qa_ehs_risks` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 419 | `public.qa_ehs_stock_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 420 | `public.qa_ehs_sync_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 421 | `public.qa_ehs_trainings` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 422 | `public.qa_lab_calibration_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 423 | `public.qa_lab_reagent_alerts` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 424 | `public.qa_lab_reagent_history` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 425 | `public.qa_lab_reagents` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 426 | `public.qa_lims_audit_logs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 427 | `public.qa_lims_barcode_scan_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 428 | `public.qa_lims_collection_tasks` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 429 | `public.qa_lims_instrument_data` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 430 | `public.qa_lims_method_categories` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 431 | `public.qa_lims_method_validations` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 432 | `public.qa_lims_method_versions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 433 | `public.qa_lims_parse_rules` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 434 | `public.qa_lims_pt_corrective_actions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 435 | `public.qa_lims_pt_evaluations` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 436 | `public.qa_lims_pt_plans` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 437 | `public.qa_lims_pt_results` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 438 | `public.qa_lims_pt_samples` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 439 | `public.qa_lims_rfid_tags` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 440 | `public.qa_lims_sample_barcodes` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 441 | `public.qa_lims_sync_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 442 | `public.qa_lims_test_methods` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 443 | `public.qa_lims_uncertainty_components` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 444 | `public.qa_lims_uncertainty_projects` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 445 | `public.qa_lims_uncertainty_sources` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 446 | `public.quality_inspections` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 447 | `public.quality_patrol_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 448 | `public.quality_patrols` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 449 | `public.quality_standard_values` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 450 | `public.quality_standards` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 451 | `public.refresh_tokens` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 452 | `public.tenant_permissions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | update_tenant_permissions_updated_at |
| 453 | `public.tenants` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 454 | `public.ticket_automation_rules` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 455 | `public.ticket_knowledge_articles` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 456 | `public.todos` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 457 | `public.user_settings` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 458 | `public.vehicle_requests` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 459 | `public.vehicles` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 460 | `public.wms_dashboard_snapshots` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 461 | `qms.audit_logs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 462 | `qms.corrective_actions` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 463 | `qms.dashboard_metrics` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 464 | `qms.inspection_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 465 | `qms.quality_inspections` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 466 | `qms.quality_issues` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 467 | `rs.equipment` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 468 | `rs.equipment_inspections` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 469 | `rs.equipment_maintenance_records` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 470 | `scm.materials` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 471 | `scm.scm_master_data_refs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 472 | `shared.audit_logs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 473 | `tms.carriers` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 474 | `tms.drivers` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 475 | `wms.transfer_items` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 476 | `wms.transfers` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |
| 477 | `wms.wms_master_data_refs` | 删除候选 | 生产 0 行、n_tup_ins=0、全仓代码零 SQL 引用、无触发器 | 0 | 0 | 无 |

## 汇总

- 保留：131（portal 预留 111、迁移种子 19、外键依赖 1）
- 归档候选：139
- 删除候选：207
