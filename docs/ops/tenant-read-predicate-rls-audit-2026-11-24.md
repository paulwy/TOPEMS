# 读侧可选租户谓词 × 表级 RLS 覆盖对照清单

- 生成日期：2026-11-24
- 范围：`svc/`、`lib/` 源码（排除 tests/examples/benches）；静态扫描 + 测试库 RLS 快照关联
- 关联任务：TOPEMS 读侧可选租户谓词向作用域 + RLS 收敛专项

## 1. 结论汇总

| 判定桶 | 含义 | SELECT 可选谓词 | 变更守卫 |
|---|---|---:|---:|
| A 可剥除候选 | RLS 已开启 **且** 策略 qual 为租户隔离口径（已抽样核验） | 67 | 9 |
| B 待迁移生效后剥除 | 已在迁移 20261118093000 RLS 收紧清单，测试库当前仍 OFF | 21 | 12 |
| C 须保留 | 表级 RLS 未开启且无迁移覆盖 | 10 | 0 |
| E 策略非隔离（allow-all）须保留 | RLS 虽 ON，但策略 qual 为 `true` 全放行，不具备隔离语义 | 7 | 0 |
| D 变更行级守卫保留 | UPDATE/DELETE 纵深防御，不随读谓词剥除 | 0 | 38 |
| **合计** | | **105** | **59** |

> 表内计数为审计当日静态扫描的**原始基线**；各表最终处置以 §3.1 归档台账与 §7.1 队列为准。截至 2026-11-24，已剥离 31 处 A 桶 SELECT 旁路并推送 main，其余按桶保留。

## 2. 判定规则

- **A 可剥除候选**：测试库 `relrowsecurity=on`，且至少一条策略 qual 为租户隔离口径（`rls_system='on' OR tenant_id=GUC`）。SELECT 列表/计数中的 `($N::uuid IS NULL OR tenant_id=$N)` 属 RLS 之上的冗余旁路，可连同对应 `.bind(tenant_scope.tenant_id())` 移除。
- **硬规则**：**RLS=ON 不等于可剥除**。必须同时核验策略 qual 确为租户隔离；若策略为 `true`（allow-all）或仅系统通道放行，应用谓词仍是唯一业务过滤，不得剥除（见 E 桶）。
- **B 待迁移生效后剥除**：迁移 `20261118093000_bi_core_tables_rls_strict.sql` 已为这 8 张 BI 核心表 `ENABLE + FORCE ROW LEVEL SECURITY` 并建 `rls_tenant_isolation` 策略；测试库迁移表为空、快照仍显示 OFF，须待迁移在目标环境生效后再剥除。
- **C 须保留**：无表级 RLS 策略覆盖，应用层可选租户谓词是当前唯一租户过滤，剥除会造成跨租户泄漏，**禁止**移除。
- **E 须保留（非隔离策略）**：表上 RLS 虽开启，但现存策略为全放行（qual=`true`）或仅系统通道，不能替代租户过滤，应用谓词保留。
- **D 变更守卫保留**：UPDATE/DELETE 的 `WHERE ... AND ($N IS NULL OR tenant_id=$N)` 作为纵深防御保留，不纳入读谓词收敛。

## 3. A 桶：可剥除候选（RLS 已开启，剥除前复核策略口径）

| 表 | 谓词总数 | SELECT | 变更守卫 | 测试库 RLS | 策略数 | 涉及文件 |
|---|---:|---:|---:|:--:|---:|---|
| bi.analytics_dashboards | 1 | 1 | 0 | ON | 1 | svc/analytics/src/modules/bi/dashboard/share.rs |
| bi.analytics_datasources | 1 | 1 | 0 | ON | 1 | svc/analytics/src/modules/bi/sync_records.rs |
| public.core_files | 1 | 1 | 0 | ON | 1 | svc/search/src/handlers.rs |
| public.core_login_logs | 5 | 3 | 2 | ON | 2 | svc/unified-core/src/modules/audit/login_log_handlers.rs |
| public.core_menu_groups | 4 | 2 | 2 | ON | 2 | svc/unified-core/src/modules/menu/handlers.rs |
| public.core_menus | 4 | 2 | 2 | ON | 2 | svc/unified-core/src/modules/menu/handlers.rs |
| public.core_roles | 2 | 2 | 0 | ON | 2 | svc/unified-core/src/modules/iam/role.rs |
| public.core_tenant_modules | 1 | 1 | 0 | ON | 1 | svc/unified-core/src/modules/tenant/handlers.rs |
| public.core_tenant_settings | 4 | 4 | 0 | ON | 1 | svc/unified-core/src/modules/settings/api_keys.rs；svc/unified-core/src/modules/settings/smtp.rs |
| public.core_tenant_usage | 5 | 5 | 0 | ON | 1 | svc/unified-core/src/modules/tenant/handlers.rs |
| public.core_tenant_users | 13 | 13 | 0 | ON | 1 | svc/unified-core/src/modules/tenant/handlers.rs |
| public.monitor_settings | 1 | 1 | 0 | ON | 1 | svc/monitor/src/modules/monitor/settings.rs |
| public.search_entity_projections | 1 | 1 | 0 | ON | 1 | svc/search/src/handlers.rs |
| public.system_settings | 1 | 1 | 0 | ON | 1 | svc/erp/src/modules/settings.rs |
| qms.qa_corrective_actions | 1 | 1 | 0 | ON | 1 | svc/qms/src/modules/quality_dashboard.rs |
| qms.qa_eightd_reports | 1 | 1 | 0 | ON | 1 | svc/qms/src/modules/quality_dashboard.rs |
| qms.qa_inspection_results | 4 | 4 | 0 | ON | 1 | svc/qms/src/modules/quality_dashboard.rs；svc/qms/src/modules/quality_task.rs |
| qms.qa_quality_inspections | 8 | 6 | 0 | ON | 1 | svc/qms/src/modules/quality_dashboard.rs；svc/qms/src/modules/quality_task.rs |
| qms.qa_quality_issues | 3 | 3 | 0 | ON | 1 | svc/qms/src/modules/quality_dashboard.rs |
| qms.qa_spc_charts | 1 | 1 | 0 | ON | 1 | svc/qms/src/modules/spc.rs |
| rs.module_settings | 1 | 1 | 0 | ON | 1 | svc/rd/src/modules/settings.rs ✅ 已剥离（提交 250bf2e7f） |
| wms.sync_record_details | 3 | 2 | 1 | ON | 1 | svc/wms/src/modules/sync_records.rs |
| wms.sync_records | 12 | 10 | 2 | ON | 1 | svc/wms/src/modules/sync_records.rs |

## 3.1 A 桶原始候选归档处置台账（2026-11-24 终态）

| 原始 A 桶表 | 最终处置 | 依据 / 提交 |
|---|---|---|
| rs.module_settings | ✅ 已剥除 1 处 | `250bf2e7f` |
| qms.qa_corrective_actions / qa_eightd_reports / qa_inspection_results / qa_quality_inspections / qa_quality_issues / qa_spc_charts | ✅ 已剥除（qms 读侧清零，18 处） | `603828c4a`、`aaa53fe5f`、`6d99065f4` |
| public.core_tenant_settings | ✅ 已剥除 4 处 | `c97eb5874` |
| public.core_login_logs | ✅ 读 3 处已剥除；2 处 UPDATE 软删守卫保留 | `b52cac713` |
| public.core_menu_groups / core_menus | ✅ 读 5 处已剥除（分组/菜单计数列表 + 菜单树）；4 处变更守卫保留 | `40b7fa0e5` |
| public.core_files / search_entity_projections | ✅ 已剥除（早期批次 `c4f0b28ae`） | 现源码无旁路谓词 |
| public.core_roles | 🔁 改判灰色保留 | 谓词含显式 nil 腿，RLS 仅放行 NULL 不放行 nil，待共享角色口径定论 |
| public.core_tenant_modules / core_tenant_usage / core_tenant_users | 🔁 改判保留 | 路径 `Path(tenant_id)` 或 `scope_with_system` 下的目标租户实过滤，非冗余旁路 |
| public.monitor_settings / erp.system_settings | 🔁 改判保留 | `tenant_id IS NULL` 共享默认行腿，RLS 无共享腿，剥除隐藏全局默认配置 |
| wms.sync_records / sync_record_details | 🔁 改判保留 | 零 uuid 腿，RLS 无 nil 放行 |
| bi.analytics_dashboards / analytics_datasources（share.rs、sync_records.rs） | 🔁 并入 B/C 桶口径 | 受 `20261118093000` 前置条件约束，见 §4 / §5 |

> 台账说明：§3 表为审计当日静态快照；最终处置以本表为准。已剥除合计 **31 处** SELECT 旁路，全部连库 `cargo check` 绿、写源门禁 strict PASS 后推送。

## 4. B 桶：待迁移 20261118093000 生效后剥除

| 表 | 谓词总数 | SELECT | 变更守卫 | 测试库 RLS | 策略数 | 涉及文件 |
|---|---:|---:|---:|:--:|---:|---|
| bi.analytics_comparison_analyses | 11 | 6 | 5 | OFF | 0 | svc/analytics/src/modules/bi/comparison_analysis.rs |
| bi.analytics_comparison_results | 1 | 1 | 0 | OFF | 0 | svc/analytics/src/modules/bi/comparison_analysis.rs |
| bi.analytics_dashboard_shares | 2 | 1 | 1 | OFF | 0 | svc/analytics/src/modules/bi/dashboard/share.rs |
| bi.analytics_drilldown_history | 1 | 1 | 0 | OFF | 0 | svc/analytics/src/modules/bi/data_drilldown.rs |
| bi.analytics_drilldown_paths | 6 | 4 | 2 | OFF | 0 | svc/analytics/src/modules/bi/data_drilldown.rs |
| bi.analytics_row_level_permissions | 6 | 4 | 2 | OFF | 0 | svc/analytics/src/modules/bi/row_level_permission.rs |
| bi.analytics_self_service_reports | 6 | 4 | 2 | OFF | 0 | svc/analytics/src/modules/bi/self_service_report.rs |

## 5. C 桶：须保留应用谓词（无 RLS 覆盖）

| 表 | 谓词总数 | SELECT | 变更守卫 | 测试库 RLS | 策略数 | 涉及文件 |
|---|---:|---:|---:|:--:|---:|---|
| bi.analytics_data | 10 | 10 | 0 | 未建表 | - | svc/analytics/src/modules/bi/multidimensional_analysis.rs；svc/analytics/src/modules/bi/predictive_analysis.rs；svc/analytics/src/modules/bi/self_service_report.rs |

## 5.1 E 桶：策略非隔离（allow-all），应用谓词保留

| 表 | 谓词总数 | SELECT | 变更守卫 | 测试库 RLS | 现存策略 | 涉及文件 |
|---|---:|---:|---:|:--:|---:|---|
| public.core_operation_logs | 7 | 7 | 0 | ON | `public_allow_all_core_operation_logs` qual=`true` | svc/unified-core/src/modules/audit/handlers.rs；svc/unified-core/src/modules/audit/service.rs |

> 该表 RLS 虽开启，但唯一策略全放行，不具备租户隔离语义；应用谓词是当前唯一业务过滤。待补隔离策略后再评估剥除。

## 6. D 桶：变更行级守卫（保留，不动）

| 表 | 谓词总数 | SELECT | 变更守卫 | 测试库 RLS | 策略数 | 涉及文件 |
|---|---:|---:|---:|:--:|---:|---|
| ? | 1 | 0 | 1 | 未建表 | - | lib/shared-db/src/approval.rs |
| bi.analytics_dashboard_templates | 2 | 0 | 2 | OFF | 0 | svc/analytics/src/modules/bi/dashboard/templates.rs |
| master_data.mdm_ai_models | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/ai_governance_v59.rs |
| master_data.mdm_ai_suggestions | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/ai_governance_v59.rs |
| master_data.mdm_assets | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/knowledge_v53.rs |
| master_data.mdm_auto_fix_actions | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/quality_v51.rs |
| master_data.mdm_billing_records | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/commercial_v55.rs |
| master_data.mdm_classification_results | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/ai_governance_v59.rs |
| master_data.mdm_continuity_plans | 2 | 0 | 2 | ON | 1 | svc/master-data/src/modules/disaster_v56.rs |
| master_data.mdm_data_permissions | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/versioning_v54.rs |
| master_data.mdm_data_products | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/governance_v58.rs |
| master_data.mdm_failover_records | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/disaster_v56.rs |
| master_data.mdm_governance_suggestions | 2 | 0 | 2 | ON | 1 | svc/master-data/src/modules/quality_v51.rs |
| master_data.mdm_lineage_edges | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/lineage_v52.rs |
| master_data.mdm_lineage_nodes | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/lineage_v52.rs |
| master_data.mdm_match_results | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/ai_governance_v59.rs |
| master_data.mdm_metadata_objects | 2 | 0 | 2 | ON | 1 | svc/master-data/src/modules/metadata_v60.rs |
| master_data.mdm_recovery_plans | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/disaster_v56.rs |
| master_data.mdm_region_configs | 4 | 0 | 4 | ON | 1 | svc/master-data/src/modules/disaster_v56.rs |
| master_data.mdm_replication_configs | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/disaster_v56.rs |
| master_data.mdm_subscriptions | 2 | 0 | 2 | ON | 1 | svc/master-data/src/modules/commercial_v55.rs |
| master_data.mdm_suppliers | 1 | 0 | 1 | ON | 1 | svc/scm/src/modules/supplier.rs |
| master_data.mdm_user_role_assignments | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/versioning_v54.rs |
| master_data.mdm_version_branches | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/versioning_v54.rs |
| master_data.mdm_workflows | 4 | 0 | 4 | ON | 1 | svc/master-data/src/modules/governance_v58.rs |
| scm.suppliers | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/supplier_sync.rs |
| srm.suppliers | 1 | 0 | 1 | ON | 1 | svc/master-data/src/modules/supplier_sync.rs |

## 7. 重点风险与后续建议

- **`bi.analytics_data`（10 处，C 桶）**：多维分析/预测分析/自助报表的动态数据集查询，测试库未建表、无 RLS 策略；这些读必须保留应用谓词，不得按 BI 核心表同口径处理。
- **`core_operation_logs`（7 处，E 桶）**：唯一策略为 `public_allow_all_core_operation_logs`（qual=`true`）全放行，应用谓词保留；须先在迁移侧补租户隔离策略，再评估剥除。
- **测试库 RLS 快照可能滞后**：测试库 `_sqlx_migrations` 为空，RLS ON/OFF 标记不能完全代表目标环境；A 桶在批量剥除前，应在已迁移的预发/生产只读库复核对应策略为租户隔离策略。
- **B 桶前置条件**：先确认 `20261118093000` 在目标环境已执行并生效，再剥除对应 BI 核心表的 SELECT 可选谓词；当前首批 `comparison_analysis.rs` 已入库的两处移除即属此桶，迁移生效后闭环。
- **门禁口径**：WRITE 写源仍为阻断口径；READ-GUARD / IMPLICIT-GLOBAL 永久 report-only，不转阻断。本清单可作为后续「只减不增」基线登记的输入。
- **本地空库迁移链阻塞（2026-11-24 核实）**：临时库全链跑到第 61 个迁移 `20260831190850_restore_legacy_vectors.sql` 失败，`public.vector` 类型缺失；根因是 `000_create_schemas.sql` 的 `CREATE EXTENSION vector` 被非致命 DO 块包裹，测试角色 `topems_test_runner` 非超户、建扩展被拒后错误被静默吞掉，后续迁移硬依赖 vector 类型即崩。本地无超户 peer/凭据通道；CI 容器以超户运行故链可过。结论：链有效性以 CI/超户环境为准，本地不以非超户角色强行补跑；本轮 A/E 分桶依据为测试库现存策略 qual 直查，不依赖空库全链重建。
- **analytics E0599 编译阻塞（2026-11-24 已解除）**：原 16 处对 `created_at/updated_at` 调 `unwrap_or_else`；经测试库与迁移核验两列均为 NOT NULL DEFAULT now()、响应字段为非 Option `DateTime<Utc>`，fallback 属无效调用（非可空合法兜底）。已改为直接赋值并推送 `3fe4c5b4e`，包 `--lib` 连库 check 转绿。BI 读谓词的剥除仍受 B 桶前置条件约束（见 7.1）。
- **剥除进度（2026-11-24）**：已落地并推送 ① `rd/settings.rs`（rs.module_settings，250bf2e7f）；② `qms/quality_dashboard.rs` 概览聚合 8 COUNT + 1 AVG（603828c4a）；③ `qms/quality_task.rs` 任务/详情/缺陷记录 5 处（aaa53fe5f）；④ `qms/quality_dashboard.rs` 趋势/缺陷分布 + `spc.rs` 控制限 4 处（6d99065f4）。**qms 包读侧可选旁路已清零**。另已落地：`unified-core/settings/api_keys.rs` 1 处 + `smtp.rs` 3 处（c97eb5874）；`audit/login_log_handlers.rs` 读 3 处（b52cac713）；`menu/handlers.rs` 分组/菜单/菜单树读 5 处（40b7fa0e5）。

## 7.1 剩余谓词分类与处置队列（2026-11-24 复核）

- **E 桶必须保留**：`public.core_operation_logs` 现存策略为 allow-all（qual=`true`），`audit/handlers.rs` 6 处、`audit/service.rs` 1 处应用谓词是唯一业务过滤，禁止剥除。
- **中央处理器，待专项评审后再剥**：`unified-core` 的 role 2 处（谓词含显式零 uuid 腿 `tenant_id='0000…000'`，而 RLS `rls_global_read` 仅放行 `tenant_id IS NULL`、不放行 nil，剥离会隐藏平台共享角色，保留待口径定论）。
- **系统/路径作用域实过滤，保留（2026-11-24 复核）**：`tenant/handlers.rs` 19 处谓词绑定的是路径 `Path(tenant_id)` 或在 `scope_with_system`（system 通道）下打开，谓词承担真实目标租户过滤；剥除后 RLS system 旁路隔离、且应用层不再按目标租户收敛，会跨租户泄漏行，**不是冗余旁路，禁止剥除**。menu 分组/菜单/菜单树 5 处读已剥除（40b7fa0e5）；login_logs 读 3 处已剥除（b52cac713）。grep 在 menu/login 残留命中均为保留的 UPDATE/软删守卫。
- **共享/零租户腿，待可见性评审**：wms `sync_records`/`sync_record_details` 谓词带零 uuid 腿（`'0000…000' OR tenant_id=`）；monitor、erp settings 谓词带 `tenant_id IS NULL` 共享行腿。剥除会改变平台共享角色/全局默认行对租户的可见性，不能按普通旁路批量处理。
- **阻塞（已解除编译阻塞）**：analytics 16 处 E0599 已修复（3fe4c5b4e）——`created_at/updated_at` 核验为 NOT NULL DEFAULT now()，移除无效 `unwrap_or_else` 改为直接赋值，包 `--lib` 连库 check 转绿。BI 读谓词仍按 B 桶口径：迁移 `20261118093000` 覆盖的 8 张表（comparison_analyses/comparison_results/dashboard_shares/dashboard_templates/drilldown_history/drilldown_paths/row_level_permissions/self_service_reports）在测试库 `bi` schema 复核仍为 RLS OFF、0 策略，本地链未生效，剥除会移除唯一租户过滤，**继续保留**；`bi.analytics_data`、`analytics_sync_records` 属 C 桶保留。
- **D 守卫保留**：master-data / scm / `lib/shared-db/approval.rs` 等 UPDATE/DELETE 行级守卫不纳入读谓词收敛。

## 8. 数据来源与局限

- 静态扫描：`scripts/ci/check-tenant-write-sources.cjs` 同口径正则（`$N::uuid IS NULL OR tenant_id`、`OR tenant_id IS NULL`、nil 字面量读守卫）。
- RLS 快照：测试库 `pg_class.relrowsecurity` + `pg_policies.qual` 关联，采集于 2026-11-24；A 桶已抽样核验策略 qual 为隔离口径，`core_operation_logs` 为 allow-all 已单列 E 桶。
- 表名关联为 SQL 上下文回溯启发式（最近 15 行内 FROM/JOIN/UPDATE/INTO），个别跨表 JOIN 行的归属可能需人工复核。
- 本地空库全链未跑通（pgvector 扩展需超户，见第 7 节）；B 桶与目标环境实际策略口径仍须在超户/CI 链或预发只读库复核。
