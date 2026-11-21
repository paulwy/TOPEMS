# portal 状态归因：进程内状态与 schema-only 表（W5-B / B23）

- 日期：2026-11-21
- 范围：`svc/portal/src/modules/*` 的 25 个状态枚举、`portal` schema 31 个 `status` 列
- 结论：portal 的 25 个状态枚举全部是进程内状态或 GraphQL 投影，**当前不应加 DB CHECK**；同时发现 `portal` schema 有 **29/31 个 status 表在 Rust 代码里零引用**，属于 schema-only（建了表但服务未读写），需要产品口径决定“接线”还是“删表”。

## 1. 枚举归因（25 个）

| 类别 | 枚举 | 依据 |
| --- | --- | --- |
| 进程内状态 | `HealthStatus`（3 处）、`HealingStatus`、`DeploymentStatus`、`RollbackActionStatus`、`AuthStatus`、`CheckStatus`、`ConflictStatus`、`StitchStatus`、`QueryStatus`（2 处）、`SyncStatus`、`ApprovalStatus`、`SubscriptionStatus`、`VersionStatus`、`APIVersionStatus`、`CanaryStatus` | 模块结构体持有 `HashMap` + `tokio::sync::Mutex` / `OnceLock<Mutex<…>>`，CRUD 走内存，无 `PgPool` 写入 |
| GraphQL/API 投影 | `DeploymentStatusGql`、`EdgeExecutionStatusGql`、`ClusterStatusV4`、`SchemaVersionStatusGql`、`MutationStatusGql`、`DiscoveryStatus` | `*Gql` 命名或 `graphql_*.rs`，只做响应模型 |

`svc/portal` 全仓 `sqlx` 引用仅 13 处，主要集中在 help/faq、todos、graphql 装配层；上述 25 个枚举所在模块均不在其中。

## 2. schema-only 表（关键发现）

`portal` schema 中带 `status` 列的表共 31 张，按表名在 `svc`/`lib` 的 Rust 代码中检索：

- **有代码引用：2 张**（`portal_announcements`、`portal_todos`，属 help/todos 模块）。
- **零引用：29 张**，包括 `portal_deployments`、`portal_deployment_steps`、`portal_healing_actions`、`portal_rollback_actions`、`portal_consistency_checks`、`portal_service_heartbeats`、`portal_persisted_queries`、`portal_persisted_query_versions`、`portal_subscription_records`、`portal_api_versions`、`portal_canary_configs`、`portal_streams`、`portal_subscribers`、`portal_replay_requests`、`portal_replay_results`、`portal_dead_letter_queue`、`intelligent_gw_conflicts`、`intelligent_gw_stitch_logs`、`intelligent_gw_stitch_plans`、`federation_compensation_logs` 等。
- 这些表只在 `database/migrations/`（如 `20261120180000_portal_schema_canonical.sql`、`20261007000009_align_orphan_tables_selfheal3.sql`）和 `fixtures/full_schema_contract.sql`、`scripts/ci/data/prod_cols.psv` 中出现，服务代码不读写。
- 本地这些表全部 0 行。

含义：portal 现在是“内存态实现 + 预留 schema”。此时加 CHECK 是给没有写入方的列立规矩，一旦未来接线换了值域就会返工；正确顺序是先定“接线还是删表”，再谈约束。

## 3. 对队列的影响

- `docs/database/status-db-check-mappings.json` 新增 25 条 portal 映射，全部 `persisted: false`，并写明原因（进程内 / 投影 / schema-only）。
- 队列 `resolved_enums`：13 → 38；未解析 61 个，集中在 `lib/shared-*`、`ai`、`analytics`、`erp`、`rd`、`plugin-registry`、`communication` 等。
- portal 的 `persisted_unmapped` 正式归零（此前是通用词 `healthy`/`expired`/`passed` 被值级聚合误拉进来的假阳性）。

## 4. 验证

- `node scripts/ci/status-db-check-queue.mjs --check`：PASS。
- 表引用统计用 `rg <table_name> svc lib --glob '*.rs'` 逐表核对，29 张零引用已逐条列出。
- 未执行任何 DDL。

## 5. 遗留

- 29 张 schema-only 表需要决策：接线（则同步补 Rust 模型 + 状态枚举 + CHECK）或按死表治理删除。建议单独立项，不混在 W5-B。
- `lib/shared-*` 的 61 个未解析枚举中有一批是跨服务共享类型（租户、备份、事件、SLO），落库位置可能在各服务自己的表里，需按服务逐个核对。
- portal 内存态状态在重启后丢失；是否要持久化是产品问题，不是状态枚举问题。
