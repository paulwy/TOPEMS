# 全仓 RLS / 裸池收口文档（2026-11-18）

> 口径：同一把尺子量全仓，**不做代码改造**；已定位的真问题单列在第 2.4 节，不夹带本次改动。
> 代码读数基于工作树 `89cbf237f`（本轮无代码改动）；策略读数基于克隆库 `m2_dryrun_20261116`（2026-11-16 快照）。

## 0. 两个关键数字

| 指标 | 数值 | 口径 |
|---|---:|---|
| **全仓真实业务裸池总数** | **340 处** | 裸 `PgPool` 直连且既非权限检查、审计日志、健康探针、元数据校验，也非 `Db`/`scope_*`/`begin_tenant_txn` 等作用域通道；其中带显式租户谓词 120、无谓词 81、无租户上下文 132、后台内部 7 |
| **仍宽松策略表数** | **303 张** | fail-open 表达式 290 张（含 `IS NULL` / `=''` / 全零 UUID 分支）+ `allow_all=true` 13 张（`rs.formulas` 两类并存，按 fail-open 计入前者，不重复计） |

一句话结论：crm / srm / hrm / rd / wms / scm / erp 的请求主路径已收口（业务裸池为 0 或已逐条登记）；剩余真问题集中在 **analytics BI、qms 质量看板、mes 质量管理的列表/审批、以及 shared-db 审批链** 四处；策略侧严格 B 范式 573 张、宽松 290 张、`allow_all` 13 张、无策略未开 RLS 92 张。

---

## 1. 测量口径（可复现）

### 1.1 代码侧

固定检索：`svc/*/src/**/*.rs` 中匹配 `&state\.(db|pool)\b` 的行，共 **1922 处**。逐处按下列确定性规则归类（脚本见附录 A，可直接复跑）：

1. **字段类型**由各服务状态结构体的 `pub db: T` / `pub pool: T` 决定：`T` 含 `Db` 的是共享库作用域包装，命中直接记为「已作用域化」；`PgPool`/`sqlx::PgPool` 才是裸池；`state.pool` 恒为裸池。
2. **接收者**取命中行及其前 6 行最后一次 `NAME(`；`fetch_one/fetch_optional/fetch_all/execute/query` 视为直接执行，按所属 `fn` 归类。
3. 名单（前缀匹配）：
   - 权限：`check_permission / check_perm / check_tenant_permission / require_permission / verify_permission / resolve_permission_ids / check_role / check_user / resolve_user_grants / check_perm_or_internal`
   - 审计：`log_audit_event / log_audit_event_with_actor / log_audit / record_audit_log / record_sync_log / write_audit / log_operation`
   - 健康：`SELECT 1` / `build_detailed_health_response*` / `is_ok` / `health`
   - 元数据：`validate_columns / validate_prediction_fields`（BI schema 自省，不触达业务行）
   - 作用域：`Db::new / open_*_scope / open_rls_txn / begin_tenant_txn / read_scope_for_claims / wms_db / scope_with / scope_for_tenant / execute_bi_sql / state.db.clone`
4. 其余即业务裸池，再按所属函数签名是否含 `State(`（是否为 handler）与 `claims`、函数体是否出现 `tenant_id/tenant_uid`，分为带谓词 / 无谓词 / 无上下文 / 后台内部。

### 1.2 策略侧

目标表 = 非系统 schema 中**存在 `tenant_id` 或 `tenant_uid` 列**的表；策略、RLS、FORCE 全部取自 `pg_class` / `pg_policies` 目录（SQL 见附录 B）。宽松判定只看租户校验本身是否 fail-open：`current_setting(...) IS NULL`、`= ''`、`tenant_(id|uid) IS NULL`、全零 UUID，以及策略名含 `allow_all` 或表达式为 `true`。

### 1.3 环境

- 克隆库 `m2_dryrun_20261116`：2026-11-16 快照，**其中 `20261118090000` 已试跑**，故第 4 节 5 张目标表在克隆里显示为目标态；生产态以 `database/migration_manifest.yaml` 的 `to_apply` 为准。
- 策略扫描覆盖 990 张目标表、983 条策略，RLS 开启 898 张、FORCE 897 张（未 FORCE 的只有 `scm.schema_defense_ledger` 1 张）。

---

## 2. 代码侧读数

### 2.1 按服务分类（`&state.db` / `&state.pool`）

| 服务 | 合计 | 权限检查 | 审计日志 | 健康探针 | 元数据校验 | 已作用域化/下传 | 业务-带谓词 | 业务-无谓词 | 业务-无上下文 | 业务-后台内部 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ai | 17 | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 |
| analytics | 152 | 0 | 0 | 4 | 12 | 69 | 6 | 1 | 56 | 4 |
| crm | 152 | 116 | 36 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ehs | 123 | 0 | 0 | 0 | 0 | 123 | 0 | 0 | 0 | 0 |
| erp | 148 | 63 | 60 | 0 | 0 | 0 | 6 | 16 | 3 | 0 |
| finance | 137 | 0 | 0 | 0 | 0 | 137 | 0 | 0 | 0 | 0 |
| hrm | 48 | 23 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| integration | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| lims | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| master-data | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| mes | 287 | 215 | 0 | 1 | 0 | 3 | 52 | 16 | 0 | 0 |
| monitor | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| pdm | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| plugin-registry | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| portal | 7 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 |
| qms | 99 | 0 | 0 | 2 | 0 | 49 | 27 | 7 | 14 | 0 |
| rd | 27 | 0 | 24 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| scm | 144 | 109 | 33 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| srm | 94 | 84 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unified-core | 198 | 6 | 25 | 3 | 0 | 32 | 29 | 41 | 59 | 3 |
| wms | 282 | 198 | 64 | 0 | 0 | 20 | 0 | 0 | 0 | 0 |
| **合计** | 1922 | 814 | 277 | 18 | 12 | 461 | 120 | 81 | 132 | 7 |

说明：`已作用域化` 包含 `Db` 包装下传与裸池经 `Db::new/scope_*/begin_tenant_txn` 建作用域的调用；两类都不进裸池口径。`业务-带谓词` 是裸池但 SQL/参数显式绑租户，属既有「裸池 + 显式谓词」范式。

### 2.2 RlsTxnCell 提取点与 tenant_middleware 挂载

| 服务 | 请求事务提取点（`Extension(txn_arc)` / `Extension<RlsTxnCell>`） | tenant_middleware |
|---|---:|---|
| ai | 103 | tenant_middleware ×19 |
| analytics | 0 | 未挂载（仅 require_permission/module_access） |
| communication | 85 | ×1 |
| crm | 123 | ×1 |
| ehs | 0 | tenant_middleware_no_txn ×1（站级豁免） |
| erp | 225 | ×1 |
| finance | 464 | ×1 |
| gis | 86 | ×2 |
| hrm | 141 | ×1 |
| integration | 81 | ×1 |
| lims | 143 | ×1 |
| master-data | 270 | ×1 |
| mes | 213 | ×1 |
| mobile | 132 | ×1 |
| monitor | 12 | ×1 |
| pdm | 115 | ×1 |
| plugin-registry | 33 | ×1 |
| pm | 157 | ×1 |
| portal | 19 | ×4 |
| qms | 136 | ×1 |
| rd | 108 | ×2 |
| scm | 135 | ×1 |
| search | 5 | ×2 |
| server | 6 | ×23；另有 no_txn ×1（内部路由） |
| srm | 112 | ×2 |
| ticket | 67 | ×1 |
| tms | 53 | ×1 |
| unified-core | 335 | ×1 |
| wms | 220 | ×1 |

读法：crm / srm / hrm / rd / wms / scm / erp / mes / qms 的提取点与挂载匹配；**analytics 未挂载 `tenant_middleware`**，BI handler 也不提取 `claims`，与其 56 处「无租户上下文」互为印证（见 2.4-1）。

### 2.3 业务裸池明细（file:line）

全量明细见附录 C（340 行，按服务分组，含 `[类别] 文件:行 | fn`）。按服务汇总：

| 服务 | 业务裸池 | 其中带谓词 | 无谓词 | 无上下文 | 后台内部 |
|---|---:|---:|---:|---:|---:|
| analytics | 67 | 6 | 1 | 56 | 4 |
| erp | 25 | 6 | 16 | 3 | 0 |
| mes | 68 | 52 | 16 | 0 | 0 |
| qms | 48 | 27 | 7 | 14 | 0 |
| unified-core | 132 | 29 | 41 | 59 | 3 |

### 2.4 发现真问题（单列，本次不改）

| # | 位置 | 事实 | 影响 | 建议处置 |
|---|---|---|---|---|
| 1 | `svc/analytics/src/modules/bi/*`（comparison_analysis / data_drilldown / multidimensional_analysis / predictive_analysis / row_level_permission / self_service_report / sync_records / dashboard/share / dashboard/templates） | 56 处 handler 不提取 `claims`、裸池直查 `bi.analytics_*`；analytics 未挂 `tenant_middleware`；`bi` schema 8 张表**无策略未开 RLS** | 跨租户读写 BI 定义与结果（对比分析、下钻、自助报表、分享链接、模板） | 独立波次：先挂 `tenant_middleware` + 补 8 张表严格 B，再把该服务 67 处业务裸池改 `Db + scope_with` |
| 2 | `svc/qms/src/modules/quality_dashboard.rs:171-350` | `get_quality_overview / get_quality_trend / get_defect_distribution` 14 处全租户 `COUNT/AVG`，无 claims | 看板指标泄露他租户质量数据 | 加 `tenant_filter`+参数绑定，或改 `Db + scope_with` |
| 3 | `svc/qms/src/modules/inspection_standard.rs:1066` | `remove_plan_item` 取到 `tenant_filter` 后 `let _ =` 丢弃，`DELETE ... WHERE plan_id=$1 AND item_id=$2` | 可按 id 删除他租户检验方案项 | 谓词进 SQL 并绑定 |
| 4 | `svc/mes/src/modules/quality_management/inspection.rs:146,180,322`；`patrol.rs:122,154,260,583` | `where_clause` 只拼 status/type/search，无租户谓词 | 跨租户列表/详情 | 同上 |
| 5 | `lib/shared-db/src/approval.rs:213-240`（mes 9 处调用） | `execute_transition_and_log` / `reject_and_log` 裸池 `UPDATE {table} SET status=$1 WHERE id=$2 AND status=$3`，无租户谓词 | 按 id 可跨租户推进审批状态 | helper 增加 `tenant_id` 形参并进谓词 |
| 6 | `svc/erp/src/modules/consolidation/reports.rs:252,346`；`searchable_projection.rs:213` | `submit_report / approve_report` 未取 claims；`searchable_snapshot` 为写后按主键读快照 | 前两处待核（可能靠内部 `tenant_of`），第三处非越权面 | 前两处补 claims 校验；第三处登记 |
| 7 | `svc/unified-core`（IAM / versioning / automation 共 100 处） | 操作 `iam.users`、`core_roles`、版本与自动化规则等**无 `tenant_id` 的平台表** | 平台级管理面，租户隔离由 `core_tenant_users` 承载 | 登记不改；若后续给平台表加 `tenant_id`，需同步改造 |

> 注：第 1 条与策略侧「`bi` 8 张无策略未开 RLS」「analytics 11 张宽松」是同一问题的两面，处置时应一并做。

---

## 3. 策略侧读数

### 3.1 目标表分类（990 张）

分类定义：**严格 B** = 表达式同时含 `app.rls_system` 与 `app.tenant_id`，且无 fail-open 分支；**宽松** = 含 `IS NULL` / `=''` / 全零 UUID 等 fail-open 分支；**allow_all** = 策略名含 `allow_all` 或表达式为 `true`；**其他** = 非以上三类（如仅 `rls_system='on'` 的系统通道专用、`group_tenant_of(...)` 变体、仅写策略）；**无策略未开 RLS** / **无策略已开 RLS（默认拒绝）**。

| schema | 目标表 | 严格 B | 宽松 | allow_all | 其他 | 无策略未开 RLS | 无策略已开 RLS | 策略数 | RLS 开 | FORCE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| public | 119 | 50 | 48 | 1 | 2 | 18 | 0 | 108 | 101 | 101 |
| finance | 109 | 107 | 2 | 0 | 0 | 0 | 0 | 111 | 109 | 109 |
| master_data | 85 | 1 | 84 | 0 | 0 | 0 | 0 | 95 | 85 | 85 |
| ehs | 70 | 70 | 0 | 0 | 0 | 0 | 0 | 70 | 70 | 70 |
| iam | 59 | 0 | 15 | 0 | 0 | 44 | 0 | 21 | 15 | 15 |
| mes | 50 | 48 | 0 | 0 | 0 | 0 | 2 | 48 | 50 | 50 |
| lims | 45 | 45 | 0 | 0 | 0 | 0 | 0 | 45 | 45 | 45 |
| erp | 39 | 15 | 11 | 2 | 11 | 0 | 0 | 46 | 39 | 39 |
| pm | 38 | 37 | 1 | 0 | 0 | 0 | 0 | 39 | 38 | 38 |
| scm | 37 | 36 | 0 | 0 | 1 | 0 | 0 | 37 | 37 | 36 |
| wms | 37 | 37 | 0 | 0 | 0 | 0 | 0 | 37 | 37 | 37 |
| qms | 32 | 0 | 27 | 2 | 0 | 3 | 0 | 48 | 29 | 29 |
| hrm | 31 | 0 | 29 | 1 | 1 | 0 | 0 | 56 | 31 | 31 |
| mobile | 27 | 26 | 1 | 0 | 0 | 0 | 0 | 28 | 27 | 27 |
| pdm | 21 | 20 | 0 | 0 | 1 | 0 | 0 | 22 | 21 | 21 |
| crm | 20 | 5 | 14 | 0 | 1 | 0 | 0 | 26 | 20 | 20 |
| flow | 20 | 2 | 0 | 0 | 0 | 18 | 0 | 2 | 2 | 2 |
| srm | 20 | 20 | 0 | 0 | 0 | 0 | 0 | 20 | 20 | 20 |
| gis | 19 | 15 | 0 | 4 | 0 | 0 | 0 | 19 | 19 | 19 |
| integration | 18 | 18 | 0 | 0 | 0 | 0 | 0 | 18 | 18 | 18 |
| bi | 16 | 1 | 6 | 1 | 0 | 8 | 0 | 9 | 8 | 8 |
| rs | 15 | 0 | 15 | 0 | 0 | 0 | 0 | 17 | 15 | 15 |
| analytics | 11 | 0 | 11 | 0 | 0 | 0 | 0 | 11 | 11 | 11 |
| ai | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 10 | 10 |
| core | 8 | 1 | 6 | 1 | 0 | 0 | 0 | 9 | 8 | 8 |
| ticket | 8 | 4 | 1 | 0 | 0 | 0 | 3 | 5 | 8 | 8 |
| tms | 7 | 3 | 4 | 0 | 0 | 0 | 0 | 7 | 7 | 7 |
| plugin_finance | 6 | 0 | 6 | 0 | 0 | 0 | 0 | 6 | 6 | 6 |
| portal | 5 | 2 | 2 | 1 | 0 | 0 | 0 | 5 | 5 | 5 |
| communication | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 6 | 5 | 5 |
| plugin_mes | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
| unified_core | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
| plugin_erp | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| **合计** | **990** | **573** | **290** | **13** | **17** | **92** | **5** | **983** | **898** | **897** |

「其他」17 张 = 系统通道专用 6（`crm/erp/hrm.audit_logs`、`scm.schema_defense_ledger`、`public.core_refresh_tokens/core_sessions`）+ `group_tenant_of(...)` 变体 8（erp 合并/抵消/内部交易）+ 明文租户但无系统分支 2（`erp.erp_production_orders`、`erp.event_idempotency`）+ `pdm.pdm_master_data_refs`（读侧 `true`、写侧系统通道）1。

### 3.2 仍未收口的表

**A. fail-open 宽松策略（290 张；`rs.formulas` 另有 1 条 `allow_all` 并存）**——目标是把表达式改为严格 B 或删表策略：

- **analytics**（11）：analytics_comparison_analyses、analytics_comparison_results、analytics_dashboard_shares、analytics_dashboard_templates、analytics_dashboards、analytics_datasources、analytics_drilldown_history、analytics_drilldown_paths、analytics_row_level_permissions、analytics_self_service_reports、analytics_widgets
- **bi**（6）：analytics_dashboards、analytics_datasources、analytics_widgets、report_schedules、report_templates、reports
- **communication**（5）：core_email_templates、core_notification_deliveries、core_notification_preferences、core_notification_subscriptions、notification_channels
- **core**（6）：ai_conversations、knowledge_bases、knowledge_chunks、knowledge_documents、knowledge_qa_history、user_preferences
- **crm**（14）：contacts、contracts、customer_finance、customer_orders、customer_recommendations、customer_scores、customer_segments、customer_tags、interactions、opportunities、return_items、sales_forecasts、sales_orders、tags
- **erp**（11）：announcements、assets、bank_accounts、documents、fin_reconciliations、inventory、inventory_items、materials、purchase_orders、voucher_items、vouchers
- **finance**（2）：core_finance_currencies、core_finance_report_line_map
- **hrm**（29）：attendance_records、candidates、companies、contract_renewals、contracts、departments、employees、hrm_cache_invalidation_logs、hrm_master_data_refs、initialization_status、interviews、job_openings、leave_records、module_settings、payroll_details、payroll_items、payroll_records、payroll_runs、performance_goals、performance_records、performance_reviews、positions、recruitment_applications、recruitment_records、salary_adjustments、training_courses、training_participants、training_plans、training_records
- **iam**（15）：crm_dashboard_snapshots、data_permissions、ehs_dashboard_snapshots、hrm_dashboard_snapshots、lims_dashboard_snapshots、pdm_dashboard_snapshots、permission_audit_logs、permission_templates、position_permissions、position_roles、positions、resource_permissions、tenant_users、user_positions、wms_dashboard_snapshots
- **master_data**（84）：materials、mdm_ai_models、mdm_ai_suggestions、mdm_api_exposures、mdm_api_products、mdm_assets、mdm_audit_events、mdm_audit_export_logs、mdm_auto_fix_actions、mdm_bc_tests、mdm_billing_records、mdm_change_events、mdm_classification_models、mdm_classification_results、mdm_classifier_rules、mdm_continuity_plans、mdm_critical_functions、mdm_data_asset_categories、mdm_data_contracts、mdm_data_permissions、mdm_data_products、mdm_dimension_scores、mdm_failover_records、mdm_fix_strategies、mdm_governance_insights、mdm_governance_suggestions、mdm_graph_communities、mdm_graph_edges、mdm_graph_nodes、mdm_impact_analyses、mdm_impact_simulations、mdm_improvement_plans、mdm_interactions、mdm_kg_edges、mdm_kg_graphs、mdm_kg_nodes、mdm_lifecycle_history、mdm_lifecycle_policies、mdm_lifecycle_stages、mdm_lineage_edges、mdm_lineage_graphs、mdm_lineage_nodes、mdm_match_results、mdm_match_rules、mdm_maturity_assessments、mdm_maturity_history、mdm_metadata_attributes、mdm_metadata_tags、mdm_permission_roles、mdm_propagation_logs、mdm_propagation_rules、mdm_quality_checks、mdm_quality_loop_configs、mdm_rate_cards、mdm_recommendations、mdm_recovery_plans、mdm_recovery_points、mdm_region_configs、mdm_replication_configs、mdm_search_history、mdm_search_indexes、mdm_semantic_search_indexes、mdm_sla_configs、mdm_sla_incidents、mdm_sla_measurements、mdm_subscriptions、mdm_supplier_categories、mdm_suppliers、mdm_sync_dead_letter、mdm_tag_rules、mdm_tagged_entities、mdm_tags、mdm_usage_records、mdm_user_role_assignments、mdm_v60_lineage_edges、mdm_v60_lineage_graphs、mdm_v60_lineage_nodes、mdm_version_branches、mdm_version_snapshots、mdm_workflow_history、mdm_workflow_templates、mdm_workflows、samples、uoms
- **mobile**（1）：sync_policies
- **plugin_finance**（6）：accounting_subjects、difference_adjustments、reconciliation_item_snapshots、reconciliation_settlement_links、reconciliation_snapshots、settlement_snapshots
- **plugin_mes**（1）：audit_logs
- **pm**（1）：project_type_configs
- **portal**（2）：portal_dashboard_stats、portal_notifications
- **public**（48）：_archive_core_workflow_instances、_archive_core_workflow_versions、approval_records、approvals、automation_rules、automation_runs、automation_variables、core_doc_documents、core_doc_folders、core_doc_templates、core_email_queue、core_emails、core_file_folders、core_finance_accounts、core_finance_vouchers、core_flow_categories、core_guide_lessons、core_guide_progress、core_inter_module_sync、core_master_data_change_log、core_master_data_refs、core_mdm_approvals、core_mdm_reconciliation_log、core_menu_groups、core_menus、core_migration_history、core_notification_templates、core_notifications、core_roles、core_tenant_modules、core_tenant_usage、core_tenants、cqrs_events、crm_dashboard_snapshots、ehs_dashboard_snapshots、finance_voucher_templates、financial_reports、hrm_dashboard_snapshots、lims_dashboard_snapshots、pdm_change_notices、pdm_dashboard_snapshots、pdm_materials、pdm_products、permission_audit_logs、search_entity_projections、system_settings、tenant_permissions、wms_dashboard_snapshots
- **qms**（27）：qa_alert_messages、qa_alert_rules、qa_approval_events、qa_apqp_phases、qa_apqp_projects、qa_apqp_risks、qa_apqp_tasks、qa_audit_findings、qa_audit_plans、qa_audit_tasks、qa_corrective_action_items、qa_corrective_actions、qa_ehs_hazards、qa_eightd_audit_logs、qa_eightd_reports、qa_fmea_analyses、qa_fmea_items、qa_inspection_audits、qa_inspection_results、qa_qms_sync_records、qa_quality_costs、qa_quality_inspections、qa_quality_issues、qa_spc_charts、qa_spc_data_points、qa_standard_revisions、qa_standards
- **rs**（15）：audit_logs、change_orders、change_requests、experiments、formula_versions、formulas、material_tests、module_settings、project_members、project_milestones、project_phases、projects、rs_experiments、rs_formulas、rs_projects
- **ticket**（1）：ticket_attachments
- **tms**（4）：carriers、drivers、tms_routes、tms_shipments
- **unified_core**（1）：inter_module_sync

**B. `allow_all`（13 张）**——bi.audit_logs, core.core_plugins, erp.dict_items, erp.dict_types, gis.geodata, gis.geofeatures, gis.map_layers, gis.spatial_analysis, hrm.initialization_logs, portal.portal_quick_actions, public.alerts, qms.quality_inspections, qms.quality_standards。其中 `gis.*` 4 张、`erp.dict_*` 2 张、`portal.portal_quick_actions`、`public.alerts`、`hrm.initialization_logs`、`qms.quality_inspections/quality_standards`、`bi.audit_logs`、`core.core_plugins` 属平台/公共语料或审计面，撤策略前需先定平台通道口径，本次不动。

**C. 无策略未开 RLS（92 张）**——完全没有租户隔离兜底：

- **bi**（8）：analytics_comparison_analyses、analytics_comparison_results、analytics_dashboard_shares、analytics_dashboard_templates、analytics_drilldown_history、analytics_drilldown_paths、analytics_row_level_permissions、analytics_self_service_reports
- **flow**（18）：core_doc_documents、core_doc_folders、core_doc_templates、core_flow_categories、core_master_data_change_log、core_master_data_refs、core_mdm_approvals、core_mdm_reconciliation_log、core_menu_groups、core_menus、core_operation_logs、core_tenant_modules、core_tenant_settings、core_tenant_usage、core_tenant_users、core_workflow_instances、core_workflow_versions、core_workflows
- **iam**（44）：core_billing_invoices、core_billing_plans、core_chat_members、core_chat_messages、core_chat_rooms、core_dashboard_refresh_log、core_dict_items、core_dict_types、core_email_queue、core_email_templates、core_emails、core_faqs、core_file_folders、core_files、core_guide_lessons、core_guide_progress、core_guides、core_inter_module_sync、core_login_logs、core_menu_groups、core_menus、core_migration_history、core_mobile_offline_records、core_notification_templates、core_notifications、core_plugin_categories、core_plugin_instances、core_plugin_permissions、core_plugin_pricing、core_plugin_reviews、core_plugins、core_roles、core_subscriptions、core_tenant_modules、core_tenant_plugins、core_tenant_settings、core_tenant_usage、core_tenant_users、core_usage_records、core_users、core_workflow_instances、core_workflow_tasks、core_workflows、tenant_permissions
- **plugin_erp**（1）：accounting_subjects
- **public**（18）：analytics_sync_records、conversion_executions、conversion_rules、core_file_permissions、core_flow_delegates、core_flow_rules、core_flow_variable_history、core_flow_variables、core_ticket_activities、core_ticket_comments、core_ticket_sla_escalations、core_ticket_sla_policies、core_tickets、core_users、monitor_thresholds、pm_master_data_refs、qa_qms_sync_records、search_logs
- **qms**（3）：qa_inspection_items、qa_inspection_plans、qa_sampling_plans

**D. 无策略但 RLS 已开（5 张）**——默认拒绝，需确认业务可用性：mes.process_flow_steps, mes.quality_patrol_items, ticket.core_ticket_activities, ticket.core_ticket_comments, ticket.core_ticket_sla_escalations。

### 3.3 平台语料（全零租户）

克隆库实测含 `tenant_id/tenant_uid = 00000000-0000-0000-0000-000000000000` 行的表共 11 张：`public.core_dict_items`(397)、`public.audit_logs`(162)、`public.core_login_logs`(137)、`public.core_dict_types`(77)、`core.ai_faqs`(15)、`public.core_guides`(12)、`public.core_faqs`(12)、`ai.ai_models`(4)、`ai.ai_prompt_templates`(3)、`finance.cqrs_projection_progress`(2)、`lims.lims_safety_tasks`(1)。读取端一律走 `Db::scope_read_platform()` / 显式 `PLATFORM_TENANT_ID`；归属未定的只有 `core.ai_faqs`（DEC-M2-03）。

---

## 4. 待上生产 DDL

当前清单只有一条：`database/migrations/20261118090000_allow_all_residuals_strict_and_deny.sql`，manifest 状态 **`to_apply`**，回滚脚本同名在 `database/rollback/`。

| 类 | 表 | 变更 | 克隆库实测 |
|---|---|---|---|
| A | `public.core_operation_logs`、`public.subscriptions` | `ENABLE`+`FORCE`，策略改为严格 B（`rls_system='on' OR tenant_id = GUC`） | 已是严格 B（试跑结果） |
| B | `public.navigation_menu`、`public.pinned_apps`、`public.todos` | `DROP POLICY allow_all`，保留 `ENABLE`+`FORCE`（默认拒绝） | 策略已删、RLS/FORCE 在 |
| C | `public.user_settings` | **不动**（无 `tenant_id`，用户级策略待 GUC 约定） | 仍 1 条 allow_all，后置断言校验 |

**前置条件**：`SELECT count(*) FROM public.core_operation_logs` 必须为 **0**（克隆库实测 0；`flow.core_operation_logs` 是历史影子表，无 RLS、0 行，不在本迁移范围）。
**执行**：窗口内单事务执行；迁移内含后置断言（A 类 2 张严格、B 类 3 张零策略、C 类 `user_settings` 仍 1 条），断言失败即 `RAISE EXCEPTION` 回滚。
**注意**：克隆库 `m2_dryrun_20261116` 已试跑过本迁移，因此第 3 节读数里这 5 张表不是生产当前态；生产执行前请以 `pg_policies` 现查为准。

---

## 5. 登记未改项

| # | 位置 | 为什么不改 | 触发条件 |
|---|---|---|---|
| 1 | `svc/rd/src/event_handlers/mod.rs:189,245`（`rs_formulas` / `rs_experiments` 的 `COUNT(*)`） | payload 无 `tenant_id` 字段，查询结果只进日志做诊断，无数据读写 | 若要改为按租户计数或参与业务判断 |
| 2 | `svc/rd/src/repositories/project_repository.rs:11`（`ProjectRepository`） | 全仓无实例化，无调用点，改它无收益 | 接入路由/服务时补 `Db + scope_with` |
| 3 | `database/migrations/20261118090000_...sql:22-24`（`public.user_settings`） | 无 `tenant_id` 列，隔离维度是 `user_id`；需先定 `app.user_id` 之类 GUC 约定 | GUC 约定落地后单独出迁移 |
| 4 | ehs 站级豁免 57 处（`tenant_middleware_no_txn`；`accident` 7 / `occupational_health` 7 / `hazard` 6 / `environmental_compliance` 5 / `training` 4 / `safety` 4 等，见 `docs/quality/m1-acceptance-2026-11-16.md:338`） | 请求不建事务，只能自开显式租户作用域；改造需换中间件并重写全站 handler，属独立波次 | 换 `tenant_middleware` 并全站重写时 |
| 5 | wms 走 B 路线（`TODO.md:292-294` DEC-WMS-B-01/02/03） | 需独立上线窗口、20 线程同 SKU 压测、业务方书面 p99/锁等待阈值，三项均未就绪 | 窗口日期 + 压测数据 + 阈值书面确认 |
| 6 | M-3 `PostCommitQueue`（`TODO.md:300`） | 2026-11-16 已定案不推广，保持 finance `settlement_center` 5 处试点 | 观测 ≥4 周且 `discarded=0`、发布失败率不高于基线、事件丢失样本为 0 |
| 7 | T-3 离线编译（`docs/quality/下一步执行总计划-2026-11-16.md:82`） | 已完成，作为所有批次的前置判据保留 | 无 |
| 8 | `svc/erp/src/modules/searchable_projection.rs:157`（`emit_after_commit` 16 处调用） | 写事务提交后按主键读快照拼事件 payload，读的是本请求刚写的实体，不构成跨租户请求读面 | 若改成按条件批量读、或事件里需要租户过滤 |
| 9 | `svc/qms/src/modules/integration.rs:70-100,127` | 绑定 `PLATFORM_TENANT_ID` 显式常量，属平台语料通道，不写裸零 UUID | 若该表改为业务租户维度 |
| 10 | `svc/unified-core` IAM/versioning/automation 100 处 | 操作 `iam.users`、`core_roles`、`core_permissions`、版本与自动化规则等无 `tenant_id` 的平台表；租户关系在 `core_tenant_users` | 平台表新增 `tenant_id` 时同步改造 |
| 11 | `svc/erp/src/modules/consolidation/reports.rs:252,346`（`call_finance_core_approval` 传裸池）、`searchable_projection.rs:213`（`searchable_snapshot`） | 前者是审批桥接/幂等记录，后者是写后按主键读快照；均按主键/idempotency_key 定位，不构成跨租户请求读面 | 若桥接查询改为按条件批量读、或审批对象由外部传入 id |

---

## 6. 剩余决策项

只列真正需要拍板的；已定案项（B 范式、M-3、T-3）不再重复。

| # | 决策 | 建议 | 理由 |
|---|---|---|---|
| 1 | analytics BI 收口放在本轮还是独立波次 | **独立波次**，先挂 `tenant_middleware` + 补 `bi` 8 张表策略，再改该服务 67 处业务裸池（其中 57 处无租户谓词） | 57 处改动跨 9 个文件且需回归 BI 报表口径，与当前窗口混做会把风险面和回滚面一起放大 |
| 2 | 宽松策略 290 张 + `allow_all` 13 张的窗口排期（DEC-M2-01） | 按 schema 分批：先 `public`/`iam`，再 `master_data`(84)/`hrm`(29)/`qms`(27)，每批单独可回滚 | 材料已备；按 schema 分批可把单批断言与回滚控制在 1 个脚本内 |
| 3 | 全零租户数据归属（DEC-M2-03，`core.ai_faqs` 15 行等） | 由业务方逐行确认归属租户；确认前不动数据，读取端保持平台通道 | 归属未定时做数据迁移会把「可见数变化」误判为回归 |
| 4 | qms 看板 / mes 质量列表 / shared-db 审批链是否立即热修 | **立即**做最小谓词补丁（4 处 SQL + helper 加 `tenant_id` 形参），不换中间件 | 这 4 处是可利用的跨租户读写面，补丁面小、可单测覆盖；换 `Db` 通道留到后续波次 |

---

## 附录 A：代码侧普查脚本（完整可复跑）

```python
#!/usr/bin/env python3
"""全仓裸池/裸 db 普查 v3（可复现固定检索式，无人工判断）。

判定链（确定性）：
1. 命中：`&state\.(db|pool)\b`。
2. 字段类型：由各服务状态结构体 `pub db: T` / `pub pool: T` 决定；
   T 含 `Db` -> state.db 为作用域包装（下传即视为已作用域化）；
   T 为 PgPool/sqlx::PgPool -> 裸池。state.pool 恒为裸池。
3. 裸池命中取「接收者」：命中行及前 6 行最后一次 `NAME(`；
   fetch_one/fetch_optional/fetch_all/execute/query/begin 视为直接执行，按所属函数归类。
4. 名单（前缀匹配）：
   PERM  check_permission/check_perm/check_tenant_permission/require_permission/
         verify_permission/resolve_permission_ids/check_role/check_user/
         resolve_user_grants/check_perm_or_internal
   AUDIT log_audit_event/log_audit_event_with_actor/log_audit/record_audit_log/
         record_sync_log/write_audit/log_operation
   HEALTH SELECT 1/build_simple_status_response/build_detailed_service_health/
          build_detailed_health_response/is_ok/health
   SCOPED Db::new/open_*_scope/open_rls_txn/begin_tenant_txn/read_scope_for_claims/
          wms_db/scope_with/scope_for_tenant/execute_bi_sql/state.db.clone
5. 其余为业务裸池；再按所属函数签名是否含 claims 分为「请求内」/「后台内部」，
   请求内按函数体是否出现 tenant_id/tenant_uid 分为「带显式谓词」/「无谓词」。
"""
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = "/Users/xingzhai/topems"
HIT = re.compile(r"&state\.(db|pool)\b")
FN = re.compile(r"^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)")
CALL = re.compile(r"([A-Za-z_][A-Za-z0-9_:]*)\s*\(")
HEALTH_SQL = re.compile(r"SELECT\s+1\b", re.IGNORECASE)
DIRECT = {"fetch_one", "fetch_optional", "fetch_all", "execute", "query", "begin"}

PERM = ("check_permission", "check_perm", "check_tenant_permission", "require_permission",
        "verify_permission", "resolve_permission_ids", "check_role", "check_user",
        "resolve_user_grants", "check_perm_or_internal")
AUDIT = ("log_audit_event", "log_audit_event_with_actor", "log_audit", "record_audit_log",
         "record_sync_log", "write_audit", "log_operation")
HEALTH = ("build_simple_status_response", "build_detailed_service_health",
          "build_detailed_health_response", "is_ok", "health")
META = ("validate_columns", "validate_prediction_fields")
SCOPED = ("Db::new", "open_read_scope", "open_write_scope", "open_scope", "open_rls_txn",
          "begin_tenant_txn", "read_scope_for_claims", "wms_db", "scope_with",
          "scope_for_tenant", "execute_bi_sql", "state.db.clone")
NOISE = {"Some", "Ok", "Err", "None", "State", "Extension", "if", "match", "return"}


def starts(name, prefixes):
    base = name.split("::")[-1]
    return any(base == p or base.startswith(p) for p in prefixes)


def state_types():
    """返回 {(service, field): is_wrapper}。"""
    res = {}
    for svc in sorted(os.listdir(os.path.join(ROOT, "svc"))):
        base = os.path.join(ROOT, "svc", svc, "src")
        if not os.path.isdir(base):
            continue
        for dp, _, fs in os.walk(base):
            for f in fs:
                if not f.endswith(".rs"):
                    continue
                txt = open(os.path.join(dp, f), encoding="utf-8", errors="replace").read()
                for m in re.finditer(r"pub struct (\w*State)\s*\{([^}]*)\}", txt):
                    for fm in re.finditer(r"pub (db|pool)\s*:\s*([^,\n]+)", m.group(2)):
                        t = fm.group(2).strip()
                        res[(svc, fm.group(1))] = "PgPool" not in t
    return res


def fn_body(lines, idx):
    """从命中行向上找 fn 定义，返回 (fn_name, signature, 整个函数体文本)。"""
    for j in range(idx, max(-1, idx - 600), -1):
        m = FN.match(lines[j])
        if m:
            sig = "\n".join(lines[j:j + 12]) + "\n" + lines[j]
            k = len(lines)
            for t in range(j + 1, min(len(lines), j + 600)):
                if FN.match(lines[t]) and len(lines[t]) - len(lines[t].lstrip()) <= len(lines[j]) - len(lines[j].lstrip()):
                    k = t
                    break
            return m.group(1), sig, "\n".join(lines[j:k])
    return "<top>", "", "\n".join(lines[max(0, idx - 40):idx + 1])


def main():
    types = state_types()
    svc_root = os.path.join(ROOT, "svc")
    services = sorted(d for d in os.listdir(svc_root)
                      if os.path.isdir(os.path.join(svc_root, d, "src")))
    res = defaultdict(Counter)
    detail = defaultdict(list)
    for svc in services:
        for dp, _, fs in os.walk(os.path.join(svc_root, svc, "src")):
            for f in sorted(fs):
                if not f.endswith(".rs"):
                    continue
                p = os.path.join(dp, f)
                rel = os.path.relpath(p, ROOT)
                L = open(p, encoding="utf-8", errors="replace").read().splitlines()
                for i, line in enumerate(L):
                    hm = HIT.search(line)
                    if not hm:
                        continue
                    field = "db" if hm.group(1) == "db" else "pool"
                    kind = "wrapper" if types.get((svc, field)) else "raw"
                    if kind == "wrapper":
                        res[svc]["scoped"] += 1
                        continue
                    ctx = "\n".join(L[max(0, i - 6):i + 1])
                    calls = [c for c in CALL.findall(ctx) if c.split("::")[-1] not in NOISE]
                    callee = calls[-1] if calls else "?"
                    cur, sig, body = fn_body(L, i)
                    short = callee.split("::")[-1]
                    target = cur if short in DIRECT else callee
                    if starts(target, META):
                        k = "meta"
                    elif HEALTH_SQL.search(ctx) or starts(target, HEALTH) or starts(cur, HEALTH):
                        k = "health"
                    elif starts(target, PERM) or starts(cur, PERM):
                        k = "permission"
                    elif starts(target, AUDIT) or starts(cur, AUDIT):
                        k = "audit"
                    elif any(s in ctx for s in SCOPED):
                        k = "scoped"
                    else:
                        is_handler = "State(" in sig
                        has_claims = "claims" in sig or "claims" in body
                        has_tid = "tenant_id" in body or "tenant_uid" in body
                        if is_handler and has_claims and has_tid:
                            k = "biz_pred"
                        elif is_handler and has_claims:
                            k = "biz_nopred"
                        elif is_handler:
                            k = "biz_noctx"
                        else:
                            k = "biz_internal"
                    res[svc][k] += 1
                    if k.startswith("biz_"):
                        detail[svc].append((k, f"{rel}:{i+1} | fn={cur} | {line.strip()[:80]}"))

    print("| 服务 | 合计 | 权限 | 审计 | 健康 | 元数据校验 | 已作用域化 | 业务-带谓词 | 业务-无谓词 | 业务-无上下文 | 业务-后台内部 |")
    print("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    T = Counter()
    for s in services:
        c = res[s]
        if not sum(c.values()):
            continue
        print(f"| {s} | {sum(c.values())} | {c['permission']} | {c['audit']} | {c['health']} | "
              f"{c['meta']} | {c['scoped']} | {c['biz_pred']} | {c['biz_nopred']} | {c['biz_noctx']} | {c['biz_internal']} |")
        T.update(c)
    print(f"| **合计** | {sum(T.values())} | {T['permission']} | {T['audit']} | {T['health']} | "
          f"{T['meta']} | {T['scoped']} | {T['biz_pred']} | {T['biz_nopred']} | {T['biz_noctx']} | {T['biz_internal']} |")
    print(f"\n业务裸池合计 = {T['biz_pred'] + T['biz_nopred'] + T['biz_noctx'] + T['biz_internal']} "
          f"(带谓词 {T['biz_pred']} + 无谓词 {T['biz_nopred']} + 无上下文 {T['biz_noctx']} + 后台内部 {T['biz_internal']})")
    print("\n## 业务裸池明细")
    for s in services:
        if detail[s]:
            print(f"\n### {s} ({len(detail[s])})")
            for k, d in detail[s]:
                print(f"[{k}] {d}")


if __name__ == "__main__":
    sys.exit(main())

```

## 附录 B：策略侧固定 SQL

```sql
-- 目标表 + RLS/FORCE
SELECT c.oid, n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
  AND EXISTS (SELECT 1 FROM information_schema.columns col
              WHERE col.table_schema=n.nspname AND col.table_name=c.relname
                AND col.column_name IN ('tenant_id','tenant_uid'));

-- 策略表达式
SELECT c.oid, p.policyname, p.cmd, p.permissive, coalesce(p.qual,''), coalesce(p.with_check,'')
FROM pg_policies p
JOIN pg_class c ON c.relname=p.tablename
 AND c.relnamespace=(SELECT oid FROM pg_namespace WHERE nspname=p.schemaname)
WHERE p.schemaname NOT IN ('pg_catalog','information_schema');

-- 平台语料（全零租户）逐表探测（DO 块动态执行）
-- SELECT count(*) FROM <schema>.<table> WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
```

## 附录 C：业务裸池全量明细（340 处）

### analytics（67）

- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:156 | fn=list_comparisons | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:178 | fn=list_comparisons | .fetch_one(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:257 | fn=get_comparison | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:335 | fn=create_comparison | .fetch_one(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:419 | fn=update_comparison | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:485 | fn=delete_comparison | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:541 | fn=run_comparison | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:573 | fn=run_comparison | .execute(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:622 | fn=run_comparison | .execute(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:636 | fn=run_comparison | .execute(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:656 | fn=run_comparison | .execute(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:692 | fn=get_comparison_result | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/comparison_analysis.rs:725 | fn=get_comparison_result | .fetch_optional(&state.pool)
- [biz_internal] svc/analytics/src/modules/bi/comparison_analysis.rs:860 | fn=fallback_comparison_result | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/data_drilldown.rs:106 | fn=list_drilldown_paths | .fetch_all(&state.pool)
- [biz_pred] svc/analytics/src/modules/bi/data_drilldown.rs:185 | fn=create_drilldown_path | .fetch_one(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/data_drilldown.rs:233 | fn=get_drilldown_path | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/data_drilldown.rs:300 | fn=update_drilldown_path | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/data_drilldown.rs:352 | fn=delete_drilldown_path | .fetch_optional(&state.pool)
- [biz_pred] svc/analytics/src/modules/bi/data_drilldown.rs:403 | fn=drill_down | .fetch_optional(&state.pool)
- [biz_pred] svc/analytics/src/modules/bi/data_drilldown.rs:453 | fn=drill_down | .fetch_optional(&state.pool)
- [biz_pred] svc/analytics/src/modules/bi/data_drilldown.rs:505 | fn=roll_up | .fetch_optional(&state.pool)
- [biz_pred] svc/analytics/src/modules/bi/data_drilldown.rs:554 | fn=roll_up | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/data_drilldown.rs:603 | fn=get_drilldown_history | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/multidimensional_analysis.rs:197 | fn=query_cube | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/multidimensional_analysis.rs:330 | fn=slice_cube | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/multidimensional_analysis.rs:464 | fn=dice_cube | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/multidimensional_analysis.rs:560 | fn=pivot_table | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/multidimensional_analysis.rs:682 | fn=rank_data | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/predictive_analysis.rs:300 | fn=moving_average_forecast | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/predictive_analysis.rs:421 | fn=exponential_smoothing_forecast | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/predictive_analysis.rs:522 | fn=trend_analysis | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/predictive_analysis.rs:610 | fn=prediction_comparison | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/row_level_permission.rs:165 | fn=list_permission_rules | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/row_level_permission.rs:259 | fn=create_permission_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/row_level_permission.rs:320 | fn=get_permission_rule | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/row_level_permission.rs:412 | fn=update_permission_rule | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/row_level_permission.rs:476 | fn=delete_permission_rule | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/row_level_permission.rs:538 | fn=validate_permission | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/row_level_permission.rs:643 | fn=get_user_permissions | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/self_service_report.rs:114 | fn=list_reports | .fetch_all(&state.pool)
- [biz_pred] svc/analytics/src/modules/bi/self_service_report.rs:206 | fn=create_report | .fetch_one(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/self_service_report.rs:261 | fn=get_report | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/self_service_report.rs:349 | fn=update_report | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/self_service_report.rs:410 | fn=delete_report | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/self_service_report.rs:453 | fn=query_report_data | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/self_service_report.rs:608 | fn=query_report_data | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/self_service_report.rs:674 | fn=export_report | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/sync_records.rs:188 | fn=list_sync_records | let total: i64 = match count_query.fetch_one(&state.pool).await {
- [biz_noctx] svc/analytics/src/modules/bi/sync_records.rs:214 | fn=list_sync_records | let rows = match list_query.fetch_all(&state.pool).await {
- [biz_noctx] svc/analytics/src/modules/bi/sync_records.rs:255 | fn=get_sync_record | .fetch_optional(&state.pool)
- [biz_nopred] svc/analytics/src/modules/bi/sync_records.rs:355 | fn=create_sync_record | .execute(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/sync_records.rs:415 | fn=update_sync_record | .execute(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/sync_records.rs:452 | fn=delete_sync_record | .execute(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/sync_records.rs:496 | fn=retry_sync | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/sync_records.rs:548 | fn=retry_sync | .execute(&state.pool)
- [biz_internal] svc/analytics/src/modules/bi/websocket.rs:101 | fn=handle_dashboard_socket | .fetch_optional(&state.pool)
- [biz_internal] svc/analytics/src/modules/bi/websocket.rs:172 | fn=handle_dashboard_socket | .fetch_all(&state.pool)
- [biz_internal] svc/analytics/src/modules/bi/websocket.rs:341 | fn=refresh_widget_data | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/share.rs:46 | fn=create_share_link | .fetch_one(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/share.rs:94 | fn=get_shared_dashboard | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/share.rs:151 | fn=list_share_links | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/share.rs:207 | fn=delete_share_link | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/templates.rs:37 | fn=list_dashboard_templates | .fetch_all(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/templates.rs:179 | fn=get_dashboard_template | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/templates.rs:258 | fn=update_dashboard_template | .fetch_optional(&state.pool)
- [biz_noctx] svc/analytics/src/modules/bi/dashboard/templates.rs:317 | fn=delete_dashboard_template | .fetch_optional(&state.pool)

### erp（25）

- [biz_pred] svc/erp/src/modules/customer.rs:305 | fn=create_customer | &state.db,
- [biz_nopred] svc/erp/src/modules/customer.rs:383 | fn=update_customer | &state.db,
- [biz_nopred] svc/erp/src/modules/customer.rs:443 | fn=delete_customer | &state.db,
- [biz_pred] svc/erp/src/modules/customer.rs:644 | fn=batch_create_customers | &state.db,
- [biz_nopred] svc/erp/src/modules/customer.rs:693 | fn=batch_update_customers | &state.db,
- [biz_nopred] svc/erp/src/modules/customer.rs:739 | fn=batch_delete_customers | &state.db,
- [biz_nopred] svc/erp/src/modules/customer.rs:797 | fn=change_customer_status | &state.db,
- [biz_nopred] svc/erp/src/modules/customer.rs:859 | fn=batch_change_status | &state.db,
- [biz_pred] svc/erp/src/modules/purchase_order.rs:312 | fn=create_purchase_order | &state.db,
- [biz_nopred] svc/erp/src/modules/purchase_order.rs:386 | fn=update_purchase_order | &state.db,
- [biz_nopred] svc/erp/src/modules/purchase_order.rs:440 | fn=delete_purchase_order | &state.db,
- [biz_pred] svc/erp/src/modules/purchase_order.rs:510 | fn=approve_purchase_order | &state.db,
- [biz_nopred] svc/erp/src/modules/purchase_order.rs:610 | fn=cancel_purchase_order | &state.db,
- [biz_pred] svc/erp/src/modules/sales_order.rs:316 | fn=create_sales_order | &state.db,
- [biz_nopred] svc/erp/src/modules/sales_order.rs:386 | fn=update_sales_order | &state.db,
- [biz_nopred] svc/erp/src/modules/sales_order.rs:447 | fn=delete_sales_order | &state.db,
- [biz_pred] svc/erp/src/modules/sales_order.rs:807 | fn=batch_create_sales_orders | &state.db,
- [biz_nopred] svc/erp/src/modules/sales_order.rs:853 | fn=batch_update_sales_orders | &state.db,
- [biz_nopred] svc/erp/src/modules/sales_order.rs:921 | fn=batch_approve_sales_orders | &state.db,
- [biz_nopred] svc/erp/src/modules/sales_order.rs:967 | fn=batch_ship_sales_orders | &state.db,
- [biz_nopred] svc/erp/src/modules/sales_order.rs:1013 | fn=batch_complete_sales_orders | &state.db,
- [biz_nopred] svc/erp/src/modules/sales_order.rs:1059 | fn=batch_cancel_sales_orders | &state.db,
- [biz_noctx] svc/erp/src/modules/searchable_projection.rs:213 | fn=searchable_snapshot | let db = &state.db;
- [biz_noctx] svc/erp/src/modules/consolidation/reports.rs:252 | fn=submit_report | &state.db,
- [biz_noctx] svc/erp/src/modules/consolidation/reports.rs:346 | fn=approve_report | &state.db,

### mes（68）

- [biz_pred] svc/mes/src/modules/capacity.rs:183 | fn=list_capacities | .fetch_all(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:201 | fn=list_capacities | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:267 | fn=get_capacity | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:317 | fn=create_capacity | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:363 | fn=update_capacity | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:400 | fn=update_capacity | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:447 | fn=delete_capacity | .execute(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:510 | fn=allocate_capacity | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:551 | fn=allocate_capacity | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:589 | fn=release_capacity | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:622 | fn=release_capacity | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:659 | fn=maintenance_capacity | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:694 | fn=maintenance_capacity | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:780 | fn=submit_capacity | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/capacity.rs:806 | fn=submit_capacity | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:177 | fn=list_forecasts | .fetch_all(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:197 | fn=list_forecasts | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:250 | fn=get_forecast | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:304 | fn=create_forecast | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:329 | fn=update_forecast | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:376 | fn=update_forecast | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:401 | fn=delete_forecast | .execute(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:443 | fn=calculate_forecast | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:476 | fn=calculate_forecast | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:513 | fn=validate_forecast | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:544 | fn=validate_forecast | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:581 | fn=adopt_forecast | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/demand_forecast.rs:607 | fn=adopt_forecast | .fetch_one(&state.pool)
- [biz_nopred] svc/mes/src/modules/production_order.rs:1615 | fn=start_order_approval | &state.pool,
- [biz_nopred] svc/mes/src/modules/production_order.rs:1661 | fn=approve_order | &state.pool,
- [biz_nopred] svc/mes/src/modules/production_order.rs:1705 | fn=reject_order | &state.pool,
- [biz_pred] svc/mes/src/modules/production_plan.rs:148 | fn=list_plans | .fetch_all(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:164 | fn=list_plans | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:215 | fn=get_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:263 | fn=create_plan | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:293 | fn=update_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:336 | fn=update_plan | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:361 | fn=delete_plan | .execute(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:403 | fn=submit_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:422 | fn=submit_plan | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:460 | fn=approve_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:479 | fn=approve_plan | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:517 | fn=reject_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/mes/src/modules/production_plan.rs:536 | fn=reject_plan | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/production_process.rs:315 | fn=create_process | &state.pool,
- [biz_pred] svc/mes/src/modules/production_process.rs:508 | fn=update_process | &state.pool,
- [biz_nopred] svc/mes/src/modules/work_report.rs:1319 | fn=start_rework_approval | &state.pool,
- [biz_nopred] svc/mes/src/modules/work_report.rs:1366 | fn=approve_rework | &state.pool,
- [biz_nopred] svc/mes/src/modules/work_report.rs:1411 | fn=reject_rework | &state.pool,
- [biz_nopred] svc/mes/src/modules/quality_management/inspection.rs:146 | fn=list_inspections | let count_result = count_query.fetch_one(&state.pool).await;
- [biz_nopred] svc/mes/src/modules/quality_management/inspection.rs:180 | fn=list_inspections | let rows = match fetch_query.fetch_all(&state.pool).await {
- [biz_nopred] svc/mes/src/modules/quality_management/inspection.rs:322 | fn=get_inspection | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/inspection.rs:442 | fn=create_inspection | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/inspection.rs:563 | fn=update_inspection | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/inspection.rs:626 | fn=delete_inspection | .execute(&state.pool)
- [biz_nopred] svc/mes/src/modules/quality_management/inspection.rs:692 | fn=start_concession_approval | &state.pool,
- [biz_nopred] svc/mes/src/modules/quality_management/inspection.rs:743 | fn=approve_concession | &state.pool,
- [biz_nopred] svc/mes/src/modules/quality_management/inspection.rs:792 | fn=reject_concession | &state.pool,
- [biz_nopred] svc/mes/src/modules/quality_management/patrol.rs:122 | fn=list_patrols | let count_result = count_query.fetch_one(&state.pool).await;
- [biz_nopred] svc/mes/src/modules/quality_management/patrol.rs:154 | fn=list_patrols | let rows = match fetch_query.fetch_all(&state.pool).await {
- [biz_nopred] svc/mes/src/modules/quality_management/patrol.rs:260 | fn=get_patrol | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/patrol.rs:351 | fn=create_patrol | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/patrol.rs:454 | fn=update_patrol | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/patrol.rs:510 | fn=delete_patrol | .execute(&state.pool)
- [biz_nopred] svc/mes/src/modules/quality_management/patrol.rs:583 | fn=list_patrol_items | .fetch_all(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/patrol.rs:649 | fn=add_patrol_item | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/patrol.rs:745 | fn=update_patrol_item | .fetch_one(&state.pool)
- [biz_pred] svc/mes/src/modules/quality_management/patrol.rs:795 | fn=delete_patrol_item | .execute(&state.pool)

### qms（48）

- [biz_nopred] svc/qms/src/modules/inspection_standard.rs:259 | fn=list_inspection_items | let total = match count_query.fetch_one(&state.pool).await {
- [biz_nopred] svc/qms/src/modules/inspection_standard.rs:275 | fn=list_inspection_items | let rows = match fetch_query.fetch_all(&state.pool).await {
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:320 | fn=get_inspection_item | let row = q.fetch_optional(&state.pool).await;
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:369 | fn=create_inspection_item | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:416 | fn=update_inspection_item | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:438 | fn=update_inspection_item | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:464 | fn=delete_inspection_item | .execute(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:469 | fn=delete_inspection_item | .execute(&state.pool)
- [biz_nopred] svc/qms/src/modules/inspection_standard.rs:518 | fn=list_sampling_plans | let total = match count_query.fetch_one(&state.pool).await {
- [biz_nopred] svc/qms/src/modules/inspection_standard.rs:534 | fn=list_sampling_plans | let rows = match fetch_query.fetch_all(&state.pool).await {
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:577 | fn=get_sampling_plan | let row = q.fetch_optional(&state.pool).await;
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:622 | fn=create_sampling_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:668 | fn=update_sampling_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:681 | fn=update_sampling_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:708 | fn=delete_sampling_plan | .execute(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:713 | fn=delete_sampling_plan | .execute(&state.pool)
- [biz_nopred] svc/qms/src/modules/inspection_standard.rs:764 | fn=list_inspection_plans | let total = match count_query.fetch_one(&state.pool).await {
- [biz_nopred] svc/qms/src/modules/inspection_standard.rs:780 | fn=list_inspection_plans | let rows = match fetch_query.fetch_all(&state.pool).await {
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:822 | fn=get_inspection_plan | let row = q.fetch_optional(&state.pool).await;
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:865 | fn=create_inspection_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:909 | fn=update_inspection_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:921 | fn=update_inspection_plan | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:948 | fn=delete_inspection_plan | .execute(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:953 | fn=delete_inspection_plan | .execute(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:986 | fn=list_plan_items | let rows = match q.fetch_all(&state.pool).await {
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:1022 | fn=add_plan_item | .fetch_one(&state.pool)
- [biz_pred] svc/qms/src/modules/inspection_standard.rs:1037 | fn=add_plan_item | .fetch_optional(&state.pool)
- [biz_nopred] svc/qms/src/modules/inspection_standard.rs:1066 | fn=remove_plan_item | .execute(&state.pool)
- [biz_noctx] svc/qms/src/modules/integration.rs:81 | fn=create_integration_action | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/integration.rs:127 | fn=update_integration_inspection_result | .fetch_optional(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:171 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:177 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:183 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:189 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:199 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:207 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:216 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:230 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:236 | fn=get_quality_overview | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:286 | fn=get_quality_trend | .fetch_all(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:332 | fn=get_defect_distribution | .fetch_one(&state.pool)
- [biz_noctx] svc/qms/src/modules/quality_dashboard.rs:350 | fn=get_defect_distribution | .fetch_all(&state.pool)
- [biz_pred] svc/qms/src/modules/quality_task.rs:109 | fn=list_quality_tasks | .fetch_one(&state.pool)
- [biz_pred] svc/qms/src/modules/quality_task.rs:149 | fn=list_quality_tasks | .fetch_all(&state.pool)
- [biz_pred] svc/qms/src/modules/quality_task.rs:199 | fn=get_quality_task | .fetch_optional(&state.pool)
- [biz_pred] svc/qms/src/modules/quality_task.rs:298 | fn=list_defect_records | .fetch_one(&state.pool)
- [biz_pred] svc/qms/src/modules/quality_task.rs:328 | fn=list_defect_records | .fetch_all(&state.pool)
- [biz_pred] svc/qms/src/modules/spc.rs:835 | fn=calculate_spc_chart_limits | let chart = sqlx::query_as::<_, SpcChart>(only_own_schema_query!("qms", r#"SELEC

### unified-core（132）

- [biz_noctx] svc/unified-core/src/handlers.rs:41 | fn=plugin_proxy | .fetch_optional(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:493 | fn=list_versions | .fetch_all(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:518 | fn=get_version | .fetch_optional(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:545 | fn=create_version | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:558 | fn=create_version | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:585 | fn=create_version | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:625 | fn=update_version_status | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:652 | fn=delete_version | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:680 | fn=get_version_statistics | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:686 | fn=get_version_statistics | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:693 | fn=get_version_statistics | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:699 | fn=get_version_statistics | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:705 | fn=get_version_statistics | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:711 | fn=get_version_statistics | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:718 | fn=get_version_statistics | .fetch_optional(&state.pool)
- [biz_noctx] svc/unified-core/src/middleware/versioning.rs:725 | fn=get_version_statistics | .fetch_optional(&state.pool)
- [biz_internal] svc/unified-core/src/middleware/versioning.rs:745 | fn=reload_version_config | if let Err(e) = config.load_from_db(&state.pool).await {
- [biz_internal] svc/unified-core/src/middleware/versioning.rs:752 | fn=reload_version_config | .fetch_optional(&state.pool)
- [biz_internal] svc/unified-core/src/middleware/versioning.rs:758 | fn=reload_version_config | .fetch_optional(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/auth.rs:244 | fn=login | &state.pool,
- [biz_pred] svc/unified-core/src/modules/iam/auth.rs:292 | fn=login | &state.pool,
- [biz_pred] svc/unified-core/src/modules/iam/auth.rs:312 | fn=login | &state.pool,
- [biz_pred] svc/unified-core/src/modules/iam/auth.rs:334 | fn=login | &state.pool,
- [biz_pred] svc/unified-core/src/modules/iam/auth.rs:355 | fn=login | &state.pool,
- [biz_pred] svc/unified-core/src/modules/iam/company_scope.rs:203 | fn=get_user_company_scopes | match list_scopes(&state.pool, tenant_id, user_uuid).await {
- [biz_pred] svc/unified-core/src/modules/iam/company_scope.rs:344 | fn=update_user_company_scopes | match list_scopes(&state.pool, tenant_id, user_uuid).await {
- [biz_nopred] svc/unified-core/src/modules/iam/permission_verify.rs:102 | fn=verify_multiple_permissions | let has_permission = verify_user_permission(&state.pool, &user_id, &permission).
- [biz_nopred] svc/unified-core/src/modules/iam/permission_verify.rs:254 | fn=get_my_permissions | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/permission_verify.rs:270 | fn=get_my_permissions | .fetch_all(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:108 | fn=create_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:125 | fn=create_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:136 | fn=create_position | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/iam/position.rs:195 | fn=get_position | .fetch_all(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/iam/position.rs:205 | fn=get_position | .fetch_all(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:277 | fn=update_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:285 | fn=update_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:293 | fn=update_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:303 | fn=update_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:313 | fn=update_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:324 | fn=update_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:334 | fn=update_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:356 | fn=delete_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/position.rs:364 | fn=delete_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/role.rs:159 | fn=list_roles | .fetch_one(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/role.rs:430 | fn=get_role | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/role.rs:894 | fn=get_role_permissions | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/role.rs:962 | fn=add_role_permission | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/role.rs:1069 | fn=remove_role_permission | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user_permission.rs:56 | fn=get_user_permissions | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user_permission.rs:77 | fn=get_user_permissions | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user_permission.rs:120 | fn=get_user_permissions | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user_position.rs:56 | fn=get_user_positions | .fetch_all(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/user_position.rs:85 | fn=assign_position | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/user_position.rs:120 | fn=batch_assign_positions | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/iam/user_position.rs:202 | fn=get_position_users | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/access_log.rs:70 | fn=get_login_history | .fetch_one(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/access_log.rs:97 | fn=get_login_history | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/batch.rs:56 | fn=get_effective_permissions | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/batch.rs:83 | fn=get_effective_permissions | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/batch.rs:98 | fn=get_effective_permissions | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/batch.rs:199 | fn=batch_delete_users | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/batch.rs:303 | fn=batch_update_users | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/batch.rs:320 | fn=batch_update_users | .execute(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/user/crud.rs:309 | fn=create_user | .fetch_one(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/user/crud.rs:340 | fn=create_user | .fetch_one(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/crud.rs:580 | fn=get_user | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/crud.rs:594 | fn=get_user | .fetch_all(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/crud.rs:708 | fn=update_user | .fetch_one(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/crud.rs:738 | fn=update_user | .fetch_one(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/crud.rs:777 | fn=update_user | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/crud.rs:887 | fn=delete_user | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile.rs:41 | fn=get_preferences | .fetch_all(&state.pool)
- [biz_pred] svc/unified-core/src/modules/iam/user/profile.rs:108 | fn=update_preferences | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile.rs:159 | fn=get_current_user | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:47 | fn=get_my_permissions | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:222 | fn=update_current_user | .fetch_one(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:259 | fn=update_current_user | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:270 | fn=update_current_user | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:416 | fn=change_my_password | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:472 | fn=change_my_password | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:564 | fn=update_my_avatar | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/profile_ext.rs:575 | fn=update_my_avatar | .fetch_optional(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/roles.rs:580 | fn=assign_user_role | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/roles.rs:722 | fn=remove_user_role | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/status.rs:66 | fn=disable_user | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/status.rs:166 | fn=enable_user | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/status.rs:256 | fn=change_password | .fetch_one(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/status.rs:318 | fn=change_password | .execute(&state.pool)
- [biz_nopred] svc/unified-core/src/modules/iam/user/validation.rs:65 | fn=check_email_availability | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:238 | fn=list_rules | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:252 | fn=list_rules | .fetch_all(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:269 | fn=get_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:292 | fn=get_rule_by_code | .fetch_one(&state.pool)
- [biz_pred] svc/unified-core/src/modules/automation/mod.rs:340 | fn=create_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:379 | fn=update_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:401 | fn=delete_rule | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:424 | fn=enable_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:448 | fn=disable_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:475 | fn=duplicate_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:499 | fn=trigger_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:523 | fn=trigger_rule | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:532 | fn=trigger_rule | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:573 | fn=list_runs | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:587 | fn=list_runs | .fetch_all(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:604 | fn=get_run | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:624 | fn=retry_run | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:647 | fn=retry_run | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:667 | fn=cancel_run | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:691 | fn=get_run_steps | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:715 | fn=get_run_logs | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:762 | fn=purge_runs | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:806 | fn=list_variables | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:825 | fn=list_variables | .fetch_all(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:846 | fn=get_variable | .fetch_one(&state.pool)
- [biz_pred] svc/unified-core/src/modules/automation/mod.rs:898 | fn=create_variable | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:932 | fn=update_variable | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:954 | fn=delete_variable | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:977 | fn=reveal_variable | .fetch_one(&state.pool)
- [biz_pred] svc/unified-core/src/modules/automation/mod.rs:1025 | fn=bulk_import_variables | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1046 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1052 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1057 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1063 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1069 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1075 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1088 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1093 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1099 | fn=get_dashboard_stats | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1203 | fn=get_designer_canvas | .fetch_one(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1232 | fn=save_designer_canvas | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1261 | fn=sync_to_rule | .execute(&state.pool)
- [biz_noctx] svc/unified-core/src/modules/automation/mod.rs:1284 | fn=sync_from_rule | .fetch_one(&state.pool)

## 决策 3 第二批（2026-11-18）与顺延矩阵

迁移：`database/migrations/20261118103000_residual_loose_tables_rls_strict.sql`
（回滚同名 `.rollback.sql`，克隆库 `m2_dryrun_20261116` 六档演练通过，`status: to_apply`）。

本批判定只用了两条轴：**有无真实数据**、**有无跨租户读路径**。生产 `topems_prod`
（superuser 复核，2026-11-17）结果：

- 无 RLS 且含 `tenant_id` 的 91 张表，除平台元数据外全部 0 行。
- 宽松策略表中有真实数据的仅 13 张；其中 10 张被跨租户读路径或回填前置挡住。

### 本批收严（3 张）

| 表 | 行数 | 原策略 | 依据 |
|---|---:|---|---|
| `hrm.initialization_logs` | 1（…0001，无 NULL） | `hrm_allow_all_initialization_logs` (true) | 仅 `setup.rs` 一处 INSERT、无 SELECT；同批改为显式绑定 claims 租户 |
| `qms.quality_inspections` | 0 | `qms_allow_all_quality_inspections` (true) | qms 幻影表，代码零引用；仍带 `tenant_id`，防遗留洞 |
| `qms.quality_standards` | 0 | `qms_allow_all_quality_standards` (true) | 同上 |

演练读数（克隆库，A/B/全零夹具）：

- up 前六档：3/3/3、3/3/3、3/3/3、3/3/3、3/3/3、3/3/3（allow_all，无隔离）。
- up 后六档：0/0/0、0/0/0、1/1/1、1/1/1、1/1/1、3/3/3。
- A 上下文跨租户 UPDATE/DELETE 0 行；INSERT 他人/全零 `42501`；INSERT 自有成功。
- down 复原 allow_all 且无新增索引；再 up 停严格态；夹具清理为 0 行。

### 顺延矩阵（写明前置，不伪造空迁移）

| 表 | 行数 | 阻塞原因 | 前置条件 |
|---|---:|---|---|
| `erp.audit_logs` | 13（t1=8,t2=5） | `audit.rs` 列表/详情显式 `set_system_channel` 跨租户读 | 端点改租户作用域 + 产品确认平台视角 |
| `finance.core_finance_currencies` | 16（8 NULL） | 全局币种全租户读 | 回填 8 行 NULL 或定义全局语料语义 |
| `finance.core_finance_report_line_map` | 48（全 NULL） | 全局报表行映射 | 定义全局语料语义 |
| `public.core_roles` | 17（16 NULL） | 平台角色模板全租户读 | 定全局角色语义 / 回填 16 行 |
| `public.core_sessions` / `core_refresh_tokens` | 106 / 106 | 登录前置，仅 `rls_system=on` | 认证系统通道设计 |
| `public.core_login_logs` | 137（全零） | 登录前置，零租户待回填 | 见 `zero-tenant-backfill-plan-2026-11-18.md`，先回填 54 行 |
| `mobile.sync_policies` / `pm.project_type_configs` | 1 / 1（NULL） | 全局默认策略 | 定全局默认语义 |
| `public.core_operation_logs` | 0 | 读取端 tenant_id 可选 = 平台跨租户视图 | 系统通道设计 |
| `public.core_menus` / `core_menu_groups` / `core_tenants` | 452 / 130 / 1 | 平台元数据 | 有意保留 |
| 5 张无 `tenant_id` 的 qms 幻影表 | 0 | 无租户列 | 登记为 DROP 候选（另开窗） |

### 同窗口清单

`20261118090000`、`20261118093000`、`20261118100000`、`20261118103000`
以及 `zero-tenant-backfill-plan-2026-11-18.md` 的 54 行回填，同一窗口执行，窗口待业务确认。