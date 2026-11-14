# portal 预留未启用表登记清单（115 张）

- 日期：2026-11-14
- 基线：`origin/main` = `1975be1bd`（本文件单独提交，不改任何表结构）
- 生产库：`topems_prod` @ 192.168.110.115（ssh `xingzhai`，psql 走 loopback，`default_transaction_read_only=on`），PostgreSQL 18.4
- 对照库：`topems` @ 127.0.0.1（dev）
- 依据清单：`topems-table-inventory-2026-11-14.md`（同仓外交付）
- 结论：**115 张全部登记为「预留未启用」，不写任何 DROP、不改任何表结构、不投生产。**

## 0. 范围与计数口径

- 范围：`portal` schema 下**没有 `tenant_id` 列**的全部表。prod 实测 118 张，其中 3 张已有 `tenant_id`（`portal_announcements`、`portal_quick_actions`、`user_preferences`），其余 **115 张**即本清单。
- 行数：`SELECT count(*)` 于 prod 与 dev 分别执行；prod 115/115 = 0 行，dev 109/115 = 0 行，另 6 张见 §4。
- 引用处数：口径与盘点清单一致——在 `svc/` 下按 SQL 关键字行（`SELECT/INSERT INTO/UPDATE/DELETE FROM/FROM/JOIN/INTO/TABLE/TRUNCATE/MERGE`）匹配裸表名，另加任意行 `portal.<table>` 限定名匹配；合并为「文件数/处数」。**该口径只统计静态 SQL 字面量**，不覆盖动态拼接表名、配置驱动、`schema_defense` 注册表。
- RLS：`relrowsecurity`/`relforcerowsecurity`/`pg_policy` 策略数，取 prod 值；`dev 已有` 指该表在 dev 已补 `tenant_id`。

## 1. 判断依据：当前零引用 ≠ 废弃

这 115 张里有 **110 张静态引用为 0/0**，仍全部登记为「预留未启用」，理由如下：

1. **运行期自愈注册**：`svc/portal/src/models/schema_defense.rs` 注册了 83 张 `portal_*` 表名（去重计数），服务启动时会 `CREATE TABLE IF NOT EXISTS` 自愈。删表不会减少对象，只会让它在下次启动被重建，且绕开迁移账本，制造新的漂移。
2. **静态引用口径天然漏计**：本清单 110 张为 0 引用，是因为 SQL 以动态表名/配置/后端编排方式使用；例如 `portal.portal_quick_actions` 在 `svc/portal/src/modules/quick_actions.rs` 有引用（盘点口径 1 文件/2 处），`portal.user_preferences` 盘点口径 1 文件/2 处、被判为字典表，均非「无用」。
3. **同名跨 schema 副本**：`portal.core_faqs`、`portal.core_guides`、`portal.core_guide_lessons`、`portal.core_guide_progress` 各在 `iam` / `mes` / `public` 有同名表（实测 4 个 schema 同名），属于分域演进中的副本，权威表尚未定；删副本等于替业务做归属决策。
4. **历史迁移从未删过它们**：这些表自建库起只增不删，多数是 `id`/`deleted_at` 的壳形状，符合「先建表占位、后按模块启用」的预留节奏。
5. **prod 全空 ≠ 未使用**：prod 115 张全部 0 行，说明功能尚未放量，而不是功能已废弃；dev 的 `portal_quick_actions`（5 行）、`user_preferences`（3 行）已有人在用。

因此本任务的处置是**登记**：留痕、标注缺口、给出启用前置条件，把「删不删」留给业务口径，而不是用零引用直接推定为死表。

## 2. 总表（115 张，按表名排序）

图例：
- `tenant_id`：`N` = 无该列；`N（dev 已有）` = prod 无、dev 已补。
- `RLS on/force/策略`：`f/f/0` = 未启用、未强制、0 条策略。
- `启用前需补`：`T` = 补 `tenant_id` 并回填；`R` = 补 RLS（ENABLE+FORCE + fail-closed 策略）；`R*` = 已有策略但 fail-open，需收紧；`P` = 权限矩阵登记权限码；`C` = 契约/OpenAPI/菜单/前端路由登记。

| # | schema.table | prod 行 | dev 行 | tenant_id | tenant_uid | RLS on/force/策略 | 引用(文件/处) | 盘点原判 | 判定 | 启用前需补 |
|---:|---|---:|---:|---|---|---|---|---|---|---|
| 1 | `portal.core_faqs` | 0 | 0 | N（dev 已有） | N | f/f/0 | 2/11 | 空壳 | 预留未启用 | T·R·P·C |
| 2 | `portal.core_guide_lessons` | 0 | 0 | N（dev 已有） | N | f/f/0 | 1/2 | 空壳 | 预留未启用 | T·R·P·C |
| 3 | `portal.core_guide_progress` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 4 | `portal.core_guides` | 0 | 0 | N（dev 已有） | N | f/f/0 | 2/7 | 空壳 | 预留未启用 | T·R·P·C |
| 5 | `portal.federation_compensation_logs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 6 | `portal.federation_execution_logs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 7 | `portal.federation_query_plans` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 8 | `portal.federation_subgraphs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 9 | `portal.federation_transaction_steps` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 10 | `portal.federation_transactions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 11 | `portal.gateway_degradation_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 12 | `portal.gateway_health_metrics` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 13 | `portal.gateway_protocols` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 14 | `portal.gateway_routes` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 15 | `portal.graphql_breaking_changes` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 16 | `portal.graphql_execution_metrics` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 17 | `portal.graphql_execution_profiles` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 18 | `portal.graphql_optimization_history` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 19 | `portal.graphql_schema_versions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 20 | `portal.graphql_stream_events` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 21 | `portal.graphql_stream_subscribers` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 22 | `portal.graphql_streams` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 23 | `portal.graphql_suggestions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 24 | `portal.graphql_version_negotiations` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 25 | `portal.intelligent_gw_affinities` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 26 | `portal.intelligent_gw_conflicts` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 27 | `portal.intelligent_gw_routing_table` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 28 | `portal.intelligent_gw_stitch_logs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 29 | `portal.intelligent_gw_stitch_plans` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 30 | `portal.portal_accel_configs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 31 | `portal.portal_acceleration_configs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 32 | `portal.portal_acceleration_results` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 33 | `portal.portal_access_decisions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 34 | `portal.portal_access_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 35 | `portal.portal_aggregation_configs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 36 | `portal.portal_aggregation_results` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 37 | `portal.portal_alert_thresholds` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 38 | `portal.portal_announcements` | 0 | 0 | N（dev 已有） | N | t/t/1 | 0/0 | 空壳 | 预留未启用 | T·R*·P·C |
| 39 | `portal.portal_anomalies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 40 | `portal.portal_api_versions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 41 | `portal.portal_audit_entries` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 42 | `portal.portal_audit_exports` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 43 | `portal.portal_auth_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 44 | `portal.portal_backpressure_configs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 45 | `portal.portal_backpressure_states` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 46 | `portal.portal_cache_entries` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 47 | `portal.portal_cache_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 48 | `portal.portal_cache_versions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 49 | `portal.portal_canary_configs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 50 | `portal.portal_canary_results` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 51 | `portal.portal_compatibility_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 52 | `portal.portal_compatibility_reports` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 53 | `portal.portal_compilation_rules` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 54 | `portal.portal_compiled_queries` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 55 | `portal.portal_config_diffs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 56 | `portal.portal_config_environments` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 57 | `portal.portal_consistency_checks` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 58 | `portal.portal_dead_letter_queue` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 59 | `portal.portal_dedup_results` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 60 | `portal.portal_dedup_rules` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 61 | `portal.portal_deployment_steps` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 62 | `portal.portal_deployments` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 63 | `portal.portal_detection_models` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 64 | `portal.portal_distributed_queries` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 65 | `portal.portal_edge_cache` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 66 | `portal.portal_edge_deployments` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 67 | `portal.portal_edge_entries` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 68 | `portal.portal_edge_functions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 69 | `portal.portal_edge_replication` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 70 | `portal.portal_execution_plans` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 71 | `portal.portal_execution_steps` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 72 | `portal.portal_federated_identities` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 73 | `portal.portal_gateway_configs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 74 | `portal.portal_healing_actions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 75 | `portal.portal_health_checks` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 76 | `portal.portal_identity_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 77 | `portal.portal_invalidation_events` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 78 | `portal.portal_latency_stats` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 79 | `portal.portal_masking_rules` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 80 | `portal.portal_metrics` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 81 | `portal.portal_orchestration_plans` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 82 | `portal.portal_persisted_queries` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 83 | `portal.portal_persisted_query_versions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 84 | `portal.portal_plan_steps` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 85 | `portal.portal_push_stats` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 86 | `portal.portal_queue_configs` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 87 | `portal.portal_queue_messages` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 88 | `portal.portal_quick_actions` | 0 | 5 | N（dev 已有） | N | t/t/1 | 1/2 | 空壳 | 预留未启用 | T·R*·P·C |
| 89 | `portal.portal_recovery_plans` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 90 | `portal.portal_replay_requests` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 91 | `portal.portal_replay_results` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 92 | `portal.portal_resolver_timings` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 93 | `portal.portal_rollback_actions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 94 | `portal.portal_rollback_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 95 | `portal.portal_route_rules` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 96 | `portal.portal_routing_decisions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 97 | `portal.portal_routing_rules` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 98 | `portal.portal_security_events` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 99 | `portal.portal_security_incidents` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 100 | `portal.portal_security_policies` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 101 | `portal.portal_service_descriptors` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 102 | `portal.portal_service_heartbeats` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 103 | `portal.portal_service_loads` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 104 | `portal.portal_stream_events` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 105 | `portal.portal_streams` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 106 | `portal.portal_sub_queries` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 107 | `portal.portal_subscribers` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 108 | `portal.portal_subscription_channels` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 109 | `portal.portal_subscription_events` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 110 | `portal.portal_subscription_records` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 111 | `portal.portal_traces` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 112 | `portal.portal_trust_decisions` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 113 | `portal.portal_version_mappings` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 114 | `portal.portal_version_vectors` | 0 | 0 | N | N | f/f/0 | 0/0 | 死表 | 预留未启用 | T·R·P·C |
| 115 | `portal.user_preferences` | 0 | 3 | N（dev 已有） | N | t/t/1 | 1/2 | 字典表 | 预留未启用 | T·R*·P·C |

## 3. 将来启用需要补什么

对任一张表从「预留」转为「启用」，至少补齐以下四项，缺一不可：

1. **租户列 `T`**：加 `tenant_id uuid`（默认 nil 哨兵 `00000000-0000-0000-0000-000000000001`，与其它租户表一致），并对存量回填。回填口径需业务确认：按创建人所属租户、按所属模块、还是保留 nil 走系统通道。
2. **RLS `R`**：`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + `FORCE ROW LEVEL SECURITY;`，策略采用 fail-closed 模板（`tenant_id = current_setting('app.tenant_id')::uuid`，系统通道显式走 `app.rls_system`），**不要**沿用现有 3 张表的 `tenant_id IS NULL OR ...` fail-open 写法（见 `R*`）。
3. **权限码 `P`**：在权限矩阵登记 `<域>:read` / `<域>:write`（如 `portal:read`、`portal:write`），并挂到角色；否则 RLS 之外没有应用层闸门。
4. **契约与入口 `C`**：OpenAPI/前端路由/菜单/`openapi-gate` 契约登记；若表要进 `schema_defense`，注册需与迁移同步，避免「迁移删、运行期建」的两套真相。

配套动作：启用前先跑一次 `scripts/ci/check-destructive-sql.mjs` 与 `scripts/migration/validate.sh`，新增迁移必须带 rollback 与幂等写法。

## 4. 与盘点清单的差异

- **dev 已有 `tenant_id` 的 6 张**（prod 仍无）：`portal.core_faqs`、`portal.core_guide_lessons`、`portal.core_guides`、`portal.portal_announcements`、`portal.portal_quick_actions`、`portal.user_preferences`。因此 dev 的「无 tenant_id」集合是 109 张，prod 是 115 张。
- **dev 非空 2 张**：`portal.portal_quick_actions` 5 行、`portal.user_preferences` 3 行（prod 均为 0）；其余 prod/dev 均 0。
- **RLS 现状**：仅 `portal.portal_announcements`、`portal.portal_quick_actions`、`portal.user_preferences` 在 prod 启用 RLS，各 1 条 `FOR ALL` 策略且 `qual`/`with_check` 均为 `true`（fail-open）：`portal_allow_all_portal_announcements`、`portal_allow_all_portal_quick_actions`、`portal_allow_all_user_preferences`；其余 112 张无 RLS。
- `portal` schema 总表数 prod/dev 均为 118（115 + 3 张已有 `tenant_id`）。
- **与盘点清单的口径差异**：`topems-table-inventory-2026-11-14.md` 对 portal 逐行给的是「需业务口径：确认后删冗余副本」或「保持不动」；本登记把处置统一收敛为**不删**——盘点原判仅作为形状分类（空壳/死表/字典表）保留在「盘点原判」列，不再作为删表依据。

## 5. 复核 SQL（原文）

```sql
-- 1) 115 张名单 + RLS 三指标 + tenant_uid
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies,
       EXISTS (SELECT 1 FROM pg_attribute a
                WHERE a.attrelid = c.oid AND a.attname = 'tenant_uid'
                  AND a.attnum > 0 AND NOT a.attisdropped) AS has_tenant_uid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'portal' AND c.relkind = 'r'
   AND NOT EXISTS (SELECT 1 FROM pg_attribute a
                    WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
                      AND a.attnum > 0 AND NOT a.attisdropped)
 ORDER BY c.relname;

-- 2) 逐表行数（psql \gexec，避免对不存在的表报错）
SELECT format('SELECT %L, count(*) FROM portal.%I;', c.relname, c.relname)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'portal' AND c.relkind = 'r'
   AND NOT EXISTS (SELECT 1 FROM pg_attribute a
                    WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
                      AND a.attnum > 0 AND NOT a.attisdropped)
 ORDER BY c.relname \gexec;

-- 3) portal 表总数
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'portal' AND c.relkind = 'r';
```

执行方式（两个库都设只读）：

```bash
PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=60s" \
  psql -X -d topems_prod -f portal_meta.sql     # 生产经 ssh xingzhai 走 loopback psql
PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=60s" \
  psql -X -d topems -f portal_meta.sql          # dev
```

## 6. 边界声明

- 本文件**不包含任何 `DROP`/`ALTER`/`TRUNCATE`**，不执行任何 DDL，不投生产。
- 不动 `portal` 表结构；不新建迁移；不改 `migration_manifest.yaml`。
- 若后续决定删表，须另立任务：逐表补齐「零引用 + prod/dev 0 行 + 无外键 + 无视图依赖」四项核实，并先移除 `schema_defense` 注册。
