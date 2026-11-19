# RLS 策略归一草案 + 账本/manifest 偏差核对（2026-11-19）

> 状态：**草案，未应用、未开窗、未连生产写入、未 push**。
> 依据文档：[readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md](./readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md) §2。
> 生产口径：`topems_prod`（`public._sqlx_migrations` 721 行 / max `20261119000002` / failed 0），全程 `default_transaction_read_only=on`。

---

## 0. 摘要

| 批次 | 对象 | 动作 | 文件 | 表数 | 热点表 |
|---|---|---|---|---|---|
| 批 1 | 80 张「canonical + 遗留并存」 | `DROP` 遗留策略 | `database/migrations/20261119130000_rls_normalize_batch1_drop_duplicate_legacy.sql` | 71 | 4 |
| 批 1 回滚 | 同上 | 重建遗留策略 | `database/rollback/20261119130000_...rollback.sql` | 71 | — |
| 批 2 | 216 张「只有遗留名」 | 单事务 rename + 改表达式 | `database/migrations/20261119131000_rls_normalize_batch2_rename_legacy.sql` | 167（159 rename + 8 合并） | 4 |
| 批 2 回滚 | 同上 | 还原名字 + 表达式 | `database/rollback/20261119131000_...rollback.sql` | 167 | — |

- 两批文件均通过 `scripts/ci/check-destructive-sql.mjs --strict`，文件内无 `BEGIN/COMMIT`、无 `DROP TABLE`，事务由 `apply-forward.sh` 包裹。
- 批 1 的遗留策略与 canonical 表达式**逐字相同**，删除不改变任何可见行；批 2 的遗留策略已含 `app.rls_system`，本质是「改名 + 规范化」。
- **37 条 `USING(true)` 未动**，逐表清单见 §4，等业务定性。
- 账本偏差：`20261118124000` 生产确实未落；10 条 `family_*` 经核对**全部是「真没上」**，不是「上了但账本缺失」。见 §5。

---

## 1. 范围与排除

生产 1050 条策略 / 956 张 RLS 表，按形态分成四组：

| 分组 | 表数 | 处理 |
|---|---|---|
| canonical + 遗留并存 | 80 | 批 1 删遗留；排除 9 张平台读语义表 |
| 只有遗留名 | 216 | 批 2 归一；排除 37 fail-open + 8 erp + 3 例外 = 48 |
| fail-open（`USING(true)`） | 37 | **不动**，只出清单 §4 |
| 其他（erp 八表、系统通道等） | — | 另案 |

### 1.1 批 1 排除的 9 张（平台读语义，不能删）

| 表 | 第二条策略 | 原因 |
|---|---|---|
| `core.core_plugins` | `rls_platform_read` | 平台目录，租户需读全量平台行 |
| `erp.holidays` | `rls_platform_read` | 平台节假日语料 |
| `finance.core_finance_currencies` | `rls_platform_read` | 平台币种字典 |
| `finance.core_finance_report_line_map` | `rls_platform_read` | 平台报表行映射 |
| `pm.project_type_configs` | `rls_platform_read` | 平台项目类型配置 |
| `portal.portal_quick_actions` | `rls_platform_read` | 平台快捷入口 |
| `public.core_roles` | `rls_platform_read` | 平台内置角色 |
| `public.core_menu_groups` | `rls_global_read` | 全局菜单组 |
| `public.core_menus` | `rls_global_read` | 全局菜单 |

> 这 9 张的两个策略**语义不同**（平台可见 vs 本租户可见），不是重复，删任何一条都会改变可见行，故整表退出批 1。

### 1.2 批 2 排除的 48 张

- 37 张 fail-open（§4）。
- 8 张 erp 合并报表表：`erp.company_relations`、`erp.consolidation_report_lines`、`erp.consolidation_reports`、`erp.consolidation_scope_companies`、`erp.consolidation_scopes`、`erp.elimination_candidates`、`erp.elimination_rules`、`erp.internal_transactions`（已在上一份定性 §3 处理，策略用 `erp.group_tenant_of`，不改）。
- `erp.event_idempotency`（幂等表，语义待定）。
- `public.core_refresh_tokens`、`public.core_sessions`（系统通道/会话，语义待定）。
- 额外单列：`public.core_login_logs`（见 §3.3）。

---

## 2. 批 1：删除「canonical + 遗留」重复策略（71 张）

### 2.1 动作

每表两条策略：`rls_tenant_isolation`（canonical）与 `tenant_isolation_<table>`（遗留），二者 `USING/WITH CHECK` 逐字相同（严格 B）。删除遗留策略：

```sql
DROP POLICY "tenant_isolation_<table>" ON "<schema>"."<table>";
```

### 2.2 断言

- 前置 `DO $pre$`：逐表断言
  1. 策略总数 = 2；
  2. `bool_and(c.relforcerowsecurity)`（FORCE 已开）；
  3. canonical `rls_tenant_isolation` 存在，且 `qual LIKE '%rls_system%'`；
  4. 遗留策略恰好 1 条且名字匹配。
  任一不满足 `RAISE EXCEPTION`，整批回滚。
- 后置 `DO $post$`：每表恰好 1 条策略、名为 `rls_tenant_isolation`、含 `rls_system`、FORCE。
- `SET lock_timeout='5s'; SET statement_timeout='300s';`。

### 2.3 回滚

前置断言每表 1 条 canonical → 71 条

```sql
CREATE POLICY "<legacy>" ON "<schema>"."<table>"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (<原 qual>) WITH CHECK (<原 with_check>);
```

→ 后置断言每表 2 条且遗留恰好 1 条。

### 2.4 热点表（行数非 0，写入方已定位）

| 表 | 行数 | 写入方 |
|---|---|---|
| `hrm.positions` | 12 | [setup.rs](file:///Users/xingzhai/TOPEMS/svc/hrm/src/modules/setup.rs#L747) `INSERT INTO hrm.positions` |
| `hrm.departments` | 8 | [setup.rs](file:///Users/xingzhai/TOPEMS/svc/hrm/src/modules/setup.rs#L529) `INSERT INTO hrm.departments` |
| `hrm.employees` | 1 | [setup.rs](file:///Users/xingzhai/TOPEMS/svc/hrm/src/modules/setup.rs#L977) `INSERT INTO hrm.employees` |
| `hrm.companies` | 1 | [setup.rs](file:///Users/xingzhai/TOPEMS/svc/hrm/src/modules/setup.rs#L319) `INSERT INTO hrm.companies` |

> 其余 67 张均为 0 行。0 行表删除毫秒级；4 张热点表建议与 HR 初始化/入职高峰错开，但仍可在同一事务内完成。

### 2.5 全量清单（71）

- **bi (1)**：`report_templates`
- **communication (1)**：`notification_channels`
- **crm (6)**：`contacts, customer_finance, customer_tags, interactions, opportunities, tags`
- **erp (7)**：`announcements, assets, fin_reconciliations, inventory, materials, purchase_orders, voucher_items`
- **hrm (25)**：`attendance_records, candidates, companies, contract_renewals, contracts, departments, employees, interviews, job_openings, leave_records, payroll_details, payroll_items, payroll_records, payroll_runs, performance_goals, performance_records, performance_reviews, positions, recruitment_applications, recruitment_records, salary_adjustments, training_courses, training_participants, training_plans, training_records`
- **iam (6)**：`permission_audit_logs, position_permissions, position_roles, positions, resource_permissions, user_positions`
- **master_data (3)**：`materials, samples, uoms`
- **public (2)**：`_archive_core_workflow_versions, tenant_permissions`
- **qms (19)**：`qa_audit_findings, qa_audit_plans, qa_audit_tasks, qa_corrective_action_items, qa_corrective_actions, qa_eightd_audit_logs, qa_eightd_reports, qa_fmea_analyses, qa_fmea_items, qa_inspection_audits, qa_inspection_results, qa_qms_sync_records, qa_quality_costs, qa_quality_inspections, qa_quality_issues, qa_spc_charts, qa_spc_data_points, qa_standard_revisions, qa_standards`
- **rs (1)**：`change_requests`

---

## 3. 批 2：只有遗留名 → 归一为 `rls_tenant_isolation`（167 张）

### 3.1 动作

159 张单策略表，每表两条 DDL：

```sql
ALTER POLICY "<legacy>" ON "<schema>"."<table>" RENAME TO rls_tenant_isolation;
ALTER POLICY rls_tenant_isolation ON "<schema>"."<table>"
  USING (<STRICT>) WITH CHECK (<STRICT>);
```

其中 `<STRICT>` 为严格 B：

```
((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
 OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
```

> **为什么 rename 而不是 drop+create**：rename 不产生第二条策略对象，锁持有时间更短；但必须同时改表达式，否则只是「换了名字的宽松策略」。

> **列名差异（演练发现）**：159 张里有 **10 张 `master_data.mdm_*` 表**的租户列是 `tenant_uid` 而非 `tenant_id`（`mdm_lifecycle_history/lifecycle_policies/lifecycle_stages/metadata_attributes/metadata_tags/rate_cards/sla_configs/v60_lineage_edges/v60_lineage_graphs/v60_lineage_nodes`）。这些表的严格 B 表达式按 `tenant_uid` 生成，GUC key 仍为 `app.tenant_id`。

### 3.2 断言

- 前置 `DO $pre$`（159 张单策略表）：`count(*)=1`、`p.polcmd='*'`、`qual LIKE '%rls_system%'`、FORCE（数组为 `schema.table` 点分格式，表名/命令/表达式不符即 `RAISE`）。
- 8 张多策略表：先 `DROP` 全部遗留，再 `CREATE POLICY rls_tenant_isolation ... FOR ALL TO PUBLIC USING (<STRICT>) WITH CHECK (<STRICT>)`。
- 后置：每表恰好 1 条 `rls_tenant_isolation`、FORCE、`qual` 含 `rls_system` 与 `app.tenant_id`。

### 3.3 8 张多策略表（合并）

| 表 | 原遗留策略 |
|---|---|
| `master_data.mdm_ai_models` | `tenant_isolation_policy`, `tenant_isolation_mdm_ai_models` |
| `master_data.mdm_ai_suggestions` | `tenant_isolation_policy`, `tenant_isolation_mdm_ai_suggestions` |
| `master_data.mdm_classification_models` | `tenant_isolation_policy`, `tenant_isolation_mdm_classification_models` |
| `master_data.mdm_classification_results` | `tenant_isolation_policy`, `tenant_isolation_mdm_classification_results` |
| `master_data.mdm_classifier_rules` | `tenant_isolation_policy`, `tenant_isolation_mdm_classifier_rules` |
| `master_data.mdm_match_results` | `tenant_isolation_policy`, `tenant_isolation_mdm_match_results` |
| `master_data.mdm_match_rules` | `tenant_isolation_policy`, `tenant_isolation_mdm_match_rules` |
| `core.ai_conversations` | `tenant_isolation_ai_conversations`, `ai_conversations_tenant_isolation` |

**永久移出归一候选（已定性）：`public.core_login_logs`**（137 行）。现有 `rls_system_only`（ALL）+ `rls_tenant_read`（SELECT）是**刻意的按 command 拆分**：系统通道全权、租户只读；合并为单条 ALL 会把租户从只读放大为可写。登记为「有意双策略」，由 `20261119141000_rls_intentional_policies_guard.sql` 钉住不变量：租户策略 `polcmd` 必须是 `SELECT`，被改成 `ALL` 即 `RAISE EXCEPTION`。负向演练已验证（改成 ALL 时守卫报错，事务回滚后仍为 SELECT）。

### 3.4 热点表（行数非 0）

| 表 | 行数 | 代码路径 | 写入方 |
|---|---|---|---|
| `core.ai_faqs` | 15 | 运行期只读：[business_copilot_handlers.rs](file:///Users/xingzhai/TOPEMS/svc/ai/src/handlers/business_copilot_handlers.rs#L814) `SELECT ... FROM core.ai_faqs` | 仅测试写入：[integration_tests.rs](file:///Users/xingzhai/TOPEMS/svc/ai/tests/integration_tests.rs#L240)；运行期无 INSERT/UPDATE |
| `master_data.mdm_sync_dead_letter` | 4 | `INSERT/SELECT`：[supplier_sync.rs](file:///Users/xingzhai/TOPEMS/svc/master-data/src/modules/supplier_sync.rs)、[scm/supplier.rs](file:///Users/xingzhai/TOPEMS/svc/scm/src/modules/supplier.rs)、[srm/supplier.rs](file:///Users/xingzhai/TOPEMS/svc/srm/src/modules/supplier.rs) | `svc/master-data`、`svc/scm`、`svc/srm` 供应商同步链路 |
| `master_data.mdm_suppliers` | 1 | [supplier_master.rs](file:///Users/xingzhai/TOPEMS/svc/master-data/src/modules/supplier_master.rs)、[data_sync.rs](file:///Users/xingzhai/TOPEMS/svc/scm/src/modules/data_sync.rs) | `svc/master-data` 主数据；`svc/scm` 同步 |
| `core.ai_conversations` | 1 | [chat_conversations.rs](file:///Users/xingzhai/TOPEMS/svc/ai/src/modules/chat_conversations.rs#L177) `INSERT` / [business_copilot_handlers.rs](file:///Users/xingzhai/TOPEMS/svc/ai/src/handlers/business_copilot_handlers.rs#L267) `INSERT` | `svc/ai` 会话与 Copilot |

> 其余 163 张为 0 行。批 2 对这 4 张是「改名 + 表达式收紧」，需在低峰窗口执行（`ALTER POLICY` 持 ACCESS EXCLUSIVE 表锁）。

### 3.5 全量清单（167，按 schema）

- **analytics (11)**：`analytics_comparison_analyses, analytics_comparison_results, analytics_dashboard_shares, analytics_dashboard_templates, analytics_dashboards, analytics_datasources, analytics_drilldown_history, analytics_drilldown_paths, analytics_row_level_permissions, analytics_self_service_reports, analytics_widgets`
- **bi (3)**：`analytics_dashboards, analytics_datasources, analytics_widgets`
- **communication (3)**：`core_notification_deliveries, core_notification_preferences, core_notification_subscriptions`
- **core (2)**：`ai_faqs, user_preferences`
- **crm (3)**：`contracts, customer_recommendations, customer_segments`
- **erp (3)**：`bank_accounts, erp_production_orders, inventory_items`
- **hrm (2)**：`hrm_cache_invalidation_logs, initialization_status`
- **iam (3)**：`data_permissions, permission_templates, tenant_users`
- **master_data (69)**：`mdm_api_exposures … mdm_workflows`（含 §3.3 的 7 张）
- **plugin_finance (6)**：`accounting_subjects, difference_adjustments, reconciliation_item_snapshots, reconciliation_settlement_links, reconciliation_snapshots, settlement_snapshots`
- **portal (2)**：`portal_dashboard_stats, portal_notifications`
- **public (34)**：`_archive_core_workflow_instances, core_doc_documents … wms_dashboard_snapshots`
- **qms (7)**：`qa_alert_messages, qa_alert_rules, qa_approval_events, qa_apqp_phases, qa_apqp_projects, qa_apqp_risks, qa_apqp_tasks`
- **rs (9)**：`change_orders, material_tests, project_members, project_milestones, project_phases, projects, rs_experiments, rs_formulas, rs_projects`
- **tms (2)**：`carriers, drivers`

> 逐表精确清单以迁移文件中的 `ARRAY[...]` 与 167 条 `ALTER/DROP POLICY` 为准（文件名即版本号，可 `grep`）。

---

## 4. 37 条 `USING(true)` 逐表清单（**不动**，待定性）

> 说明：这 37 张表当前**没有**租户隔离效果（`USING(true)` 或等价的宽松读）。本清单只列事实，不做定性。行数为 `topems_prod` 实测。
> 「代码路径」口径：在 `svc/ lib/ packages/ apps/` 的非测试源码里，对**字符串字面量中的 SQL** 做表名 + `SELECT/INSERT/UPDATE/DELETE` 匹配；通用名词存在跨 schema 同名，已注明。

| # | 表 | 模块 | 行数 | 代码读写路径 | 写入方 |
|---|---|---|---|---|---|
| 1 | `bi.audit_logs` | BI 审计 | 0 | 共享审计：`{prefix}.audit_logs`，见 [audit.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/audit.rs#L627) | 共享审计写入口（system scope） |
| 2 | `core.core_tenant_plugins` | 插件注册 | 0 | [tenant_plugins.rs](file:///Users/xingzhai/TOPEMS/svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs)（读 5 / 写 6）、[simple_api.rs](file:///Users/xingzhai/TOPEMS/svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs)（写 6） | `svc/plugin-registry` |
| 3 | `doc.document_versions` | 文档 | 0 | [document.rs](file:///Users/xingzhai/TOPEMS/svc/pm/src/modules/document.rs)（读/写各 1） | `svc/pm` |
| 4 | `doc.documents` | 文档 | 0 | [vector.rs](file:///Users/xingzhai/TOPEMS/svc/ai/src/services/vector.rs)、[documents.rs](file:///Users/xingzhai/TOPEMS/svc/erp/src/modules/documents.rs)、[document.rs](file:///Users/xingzhai/TOPEMS/svc/mobile/src/modules/document.rs) | `svc/ai`、`svc/erp`、`svc/mobile`、`svc/unified-core`(doc) |
| 5 | `doc.folders` | 文档 | 0 | 未见运行期 SQL 命中（前端类型引用） | 待确认 |
| 6 | `doc.templates` | 文档 | 0 | 未见运行期 SQL 命中 | 待确认 |
| 7 | `doc_service.archives` | 审计归档 | 0 | 未见 `doc_service.` 运行期 SQL 命中；早期扫描见 [audit_archive_api.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/business_tools/audit_archive_api.rs) 的 `audit_*` 泛名 | 待确认 |
| 8 | `doc_service.files` | 审计归档 | 0 | 同上，泛名命中 [audit_restorer.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/business_tools/audit_restorer.rs) | 待确认 |
| 9 | `doc_service.folders` | 审计归档 | 0 | 未见运行期 SQL 命中 | 待确认 |
| 10 | `doc_service.templates` | 审计归档 | 0 | 未见运行期 SQL 命中 | 待确认 |
| 11 | `erp.core_erp_materials` | ERP | 0 | [search.rs](file:///Users/xingzhai/TOPEMS/svc/erp/src/modules/search.rs)（读 1） | 只读 |
| 12 | `flow.audit_logs` | 流程审计 | 0 | 共享审计 `{prefix}.audit_logs` | 共享审计写入口 |
| 13 | `flow.notifications` | 通知 | 0 | [notification.rs](file:///Users/xingzhai/TOPEMS/svc/communication/src/notification.rs)（读 7）、[communication_real_module.rs](file:///Users/xingzhai/TOPEMS/svc/server/src/modules/communication_real_module.rs) | `svc/communication`、`svc/pm`、`svc/portal` |
| 14 | `flow.workflows` | 流程 | 0 | 未见运行期 SQL 命中（前端 workflow 类型） | 待确认 |
| 15 | `gis.audit_log` | GIS 审计 | 0 | 共享审计 `{prefix}.audit_logs`（单数名，历史） | 共享审计写入口 |
| 16 | `gis.audit_logs` | GIS 审计 | 0 | 共享审计 `{prefix}.audit_logs` | 共享审计写入口 |
| 17 | `gis.geofence_alerts` | GIS | 0 | [im_location.rs](file:///Users/xingzhai/TOPEMS/svc/communication/src/im_location.rs)（3 处上下文命中） | 待确认 |
| 18 | `gis.track_positions` | GIS | 0 | [sync.rs](file:///Users/xingzhai/TOPEMS/svc/gis/src/modules/sync.rs)（读 1） | `svc/gis` |
| 19 | `iam.audit_logs` | IAM 审计 | 0 | 共享审计 `{prefix}.audit_logs`；另 [handlers.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/audit/handlers.rs) | 共享审计写入口 |
| 20 | `iam.permissions` | IAM | 0 | [auth.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/auth.rs)（读 3）、[menu/handlers.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/menu/handlers.rs)（写 2） | `svc/unified-core` |
| 21 | `iam.roles` | IAM | **4** | [auth.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/auth.rs)（读 4 / 写 1）、[user/models.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/user/models.rs) | `svc/unified-core` |
| 22 | `mail.emails` | 邮件 | 0 | 前端 [MailPageHooks.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/components/im/MailPageHooks.tsx)；后端无 `mail.emails` 运行期 SQL | 待确认 |
| 23 | `mail.templates` | 邮件 | 0 | 未见运行期 SQL 命中 | 待确认 |
| 24 | `mobile.oa_announcement_reads` | 移动 OA | 0 | [oa.rs](file:///Users/xingzhai/TOPEMS/svc/mobile/src/modules/oa.rs)（写 1） | `svc/mobile` |
| 25 | `notification.notifications` | 通知 | 0 | [notification.rs](file:///Users/xingzhai/TOPEMS/svc/communication/src/notification.rs)（读 7） | `svc/communication` |
| 26 | `pdm.pdm_master_data_refs` | PDM | 0 | [event_handlers/mod.rs](file:///Users/xingzhai/TOPEMS/svc/pdm/src/event_handlers/mod.rs)（写 1） | `svc/pdm` |
| 27 | `pm.service_integrations` | 项目管理 | 0 | [openapi.rs](file:///Users/xingzhai/TOPEMS/svc/pm/src/modules/openapi.rs)（上下文命中 1） | 待确认 |
| 28 | `portal.user_preferences` | 门户 | 0 | [profile.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/user/profile.rs)（读/写各 1） | `svc/unified-core` |
| 29 | `public.alert_rules` | 监控告警 | 0 | [alerts.rs](file:///Users/xingzhai/TOPEMS/svc/monitor/src/modules/monitor/alerts.rs)（15）、[monitoring.rs](file:///Users/xingzhai/TOPEMS/lib/shared-observability/src/monitoring.rs) | `svc/monitor`、shared-observability |
| 30 | `public.user_settings` | 门户/IAM | 0 | 未见 SQL 命中 | 待确认 |
| 31 | `qms.audit_logs` | QMS 审计 | 0 | 共享审计 `{prefix}.audit_logs` | 共享审计写入口 |
| 32 | `qms.corrective_actions` | QMS | 0 | [environmental_compliance.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/environmental_compliance.rs)（读 6 / 写 4）、[quality.rs](file:///Users/xingzhai/TOPEMS/svc/pm/src/modules/quality.rs)（写 1） | `svc/ehs`、`svc/pm` |
| 33 | `qms.dashboard_metrics` | QMS | 0 | 未见运行期 SQL 命中（`schema_defense.rs` 目录定义） | 待确认 |
| 34 | `qms.inspection_items` | QMS | 0 | [report.rs](file:///Users/xingzhai/TOPEMS/svc/lims/src/modules/report.rs)（读 3 / 写 2） | `svc/lims` |
| 35 | `qms.quality_issues` | QMS | 0 | 未见运行期 SQL 命中 | 待确认 |
| 36 | `report.reports` | 报表 | 0 | [report.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/report/report.rs)（读 5 / 写 5） | `svc/analytics` |
| 37 | `storage.files` | 文件存储 | 0 | 未见 `storage.files` 运行期 SQL 命中 | 待确认 |

**要点（供定性参考，不替业务选边）**：

1. 6 张共享审计表（`bi/flow/gis/iam/qms.audit_logs` + `gis.audit_log`）由**同一个共享审计服务**按 `{schema_prefix}.audit_logs` 写入，且 [audit.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/audit.rs#L627) 代码注释明确「仅系统通道」——**已登记为「有意放行」**，由 `20261119141000` 守卫钉住（策略须保持 `ALL` + `USING(true)`，被收紧即 `RAISE`，强制复核）。写入方保证在代码层：共享审计按 `{schema_prefix}` 注入系统通道，不由租户上下文写入。
2. `public.alert_rules` / `pdm.pdm_master_data_refs` 的原策略是 **SELECT-only** 的 `USING(true)`，不是 ALL；与其余 `*_allow_all_*` 的 ALL 语义不同，需分开看。
3. `iam.roles`（4 行）、`qms.corrective_actions`、`qms.inspection_items`、`report.reports`、`flow/notification.notifications` 有**运行期读写**，是 37 条里风险最高的几类。
4. `public.user_settings`、`doc.folders`、`doc.templates`、`document_versions`、`doc_service.*`、`storage.files`、`mail.templates`、`qms.quality_issues`、`qms.dashboard_metrics` 未见运行期 SQL 命中，可能是**休眠表**，优先确认是否可下线而不是补策略。

---

## 5. 账本与 manifest 偏差

### 5.1 `20261118124000_iam_tenant_plugins_rls_strict`

| 检查项 | 生产实测（只读） |
|---|---|
| 账本 `public._sqlx_migrations` | **无** `20261118124000` |
| `iam.core_tenant_plugins` 行数 | 0 |
| RLS | **关闭**（`relrowsecurity=f`） |
| 策略数 | 0 |

**结论：确实未落生产。** manifest 原登记 `status: applied`（依据「version ≤ anchor 视为已承接」）与实测不符，已改为 `superseded`。

**处置（已定）：走前向补丁，不在原地重放。**
- `20261118124000` 在 manifest 中标记 `status: superseded`、`superseded_by: 20261119140000`，并注明「版本低于账本水位，按不得 in-place 重放，改由前向补丁承载」。
- 新建 `20261119140000_iam_core_tenant_plugins_rls_strict_forward.sql`：DDL 与 18124000 等价、幂等可重跑（每次先清空策略再建），`> 20261119000002`，常规扫描即可收。
- `--apply-deferred` 仅保留为**应急手段**写入文档，本次不作常规路径。理由：账本保持单调、无水位下 in-place 重放，常规扫描可收，后续审计不会出现「水位下还有待办」的长期悬挂项。

### 5.2 10 条 `family_*` 逐条核对

核对方法：生产账本是否有该版本 + 源表是否存在 + 目标表行数 + 迁移指纹（`20261115140600` 会创建 `public.migration_quarantine_rows` / `migration_column_rewrites`）。

| 版本 | 迁移 | 源表（生产） | 目标表行数 | 指纹 | 结论 |
|---|---|---|---|---|---|
| `20261115140000` | assets → erp.assets | `public.assets` **不存在** | `erp.assets`=0 | — | **真没上**（源表不存在，不适用） |
| `20261115140100` | employees → hrm.employees | `public.employees` **不存在** | `hrm.employees`=1（生产自有） | — | **真没上**（不适用） |
| `20261115140200` | mail.emails → core_emails | `mail.emails`=0 | `public.core_emails`=0 | — | **真没上**（源/目标皆空，无痕） |
| `20261115140300` | erp_connections → integration | `public.erp_connections` **不存在** | 0 | — | **真没上**（不适用） |
| `20261115140400` | erp_mappings → integration | `public.erp_mappings` **不存在** | 0 | — | **真没上**（不适用） |
| `20261115140500` | external_erp_sync_logs → integration | `public.external_erp_sync_logs` **不存在** | 0 | — | **真没上**（不适用） |
| `20261115140600` | storage.files → core_files | `storage.files`=0 | `public.core_files`=0 | `migration_*` 表**不存在** | **真没上**（指纹缺失，决定性） |
| `20261115140700` | doc_service.files → core_files | `doc_service.files`=0 | `public.core_files`=0 | `migration_*` 表**不存在** | **真没上**（指纹缺失，决定性） |
| `20261115141000` | core_workflows → public | `flow.core_workflows`=0 | `public.core_workflows`=0 | — | **真没上**（源/目标皆空） |
| `20261115141100` | flow.workflows → public | `flow.workflows`=0 | `public.core_workflows`=0 | — | **真没上**（源/目标皆空） |

**10 条全部为「真没上」，无一条是「上了但账本缺失」。** 其中 5 条源表在生产根本不存在（不适用），5 条源表为空（迁移效果为零）。

**拟改 manifest**（只改这 10 条，不动其他已登记内容）：

- 源表不存在的 5 条（`140000/140100/140300/140400/140500`）→ `status: excluded`，note 记「生产源表不存在，迁移不适用」。
- 源表存在但 0 行的 5 条（`140200/140600/140700/141000/141100`）→ `status: obsolete`，note 记「生产源表 0 行，迁移效果为空；`1406/1407` 以 `migration_*` 指纹表缺失为决定性证据」。
- `20261115140800` / `20261115140900` 维持 `hold`（不在本次 10 条内）。

### 5.3 新批次登记

四条新迁移 `20261119130000`（批 1）/ `20261119131000`（批 2）/ `20261119140000`（前向补丁）/ `20261119141000`（有意策略守卫）均 > 账本 max `20261119000002`，按 `pending_forward_patches.status: to_apply` 登记，并纳入 `database/checksums.txt`。登记后 `gen-manifest.sh --check` 为 0 漂移、`unregistered_pending=0`。

### 5.4 演练（非特权，仅验迁移链可应用）

- 演练库：本地一次性库，由 `topems_prod` schema 导出（`--schema-only --no-owner --no-privileges`，剔除 `CREATE/COMMENT ON EXTENSION`）恢复为**非超级用户 `topems_test_runner`**（`rolsuper=f, rolbypassrls=f, rolcreatedb=t`），1346 表 / 1039 策略。
- 依次应用四条迁移（`--single-transaction`），全部 exit 0：
  - 批 1：策略总数 1039 → 968（−71）；
  - 批 2：968 → 960（8 张多策略合并净 −8）；`public.core_login_logs` 仍为 2 条未动（`rls_system_only=ALL` / `rls_tenant_read=SELECT`）；
  - 前向补丁：`iam.core_tenant_plugins` 0 策略 → 1 条 `rls_tenant_isolation`，RLS+FORCE（总数 960 → 961）；
  - 守卫：通过 `core_login_logs` 双策略与 6 张审计表 fail-open 断言（`ALL` / `qual=true`）。
- 四条回滚按逆序应用亦 exit 0，策略数回到 1039、RLS 表回到 945，`iam.core_tenant_plugins` 恢复 0 策略 / RLS 关闭。
- 演练库对齐说明：该库某次恢复后 `rs.projects` 丢了 `relforcerowsecurity`（dump `drill_schema_clean.sql:28273` 明确有 `ALTER TABLE ONLY rs.projects FORCE ROW LEVEL SECURITY`），已按 dump 证据补回后再演练；这是演练夹具漂移，不是迁移缺陷。
- **负向演练**：把 `rls_tenant_read` 临时改成 ALL 后运行守卫，按预期 `RAISE`（租户策略必须 SELECT），事务回滚后恢复 SELECT。
- **语义边界**：本演练只证明**迁移链在该 schema 上可应用**（语法、对象存在性、断言、锁行为），**不验证 RLS 的租户隔离效果**（不构造租户上下文、不验可见行）。隔离语义仍以生产策略定义与后续窗口实测为准。

---

## 6. 死表清单撞车与存在性守卫（2026-11-19 追加）

### 6.1 根因：两份清单同源，链内顺序是「先删表、后归一」

`migration-drill-anchor` 门禁在干净 worktree 上首次暴露真差异：批 1/批 2 归一迁移的目标清单，与同一批次死表清理迁移
`20261119100000_drop_dead_tables_batch1`（19 张）/ `20261119110000_drop_dead_tables_batch2`（188 张）的 DROP 清单存在交集。

- 两份清单都取样于「DROP 执行前」的生产现状，各自内部自洽；
- 但迁移链内顺序是 `100000/110000`（删表）→ `130000/131000`（归一），归一执行时这些表已不存在；
- 于是归一迁移的 `DROP POLICY` / `ALTER POLICY` 命中不存在的对象，门禁报错。这不是建表迁移漏策略，也不是基线/夹具缺东西。

### 6.2 交集：27 张逐表名单

**批 1 归一 ∩ 死表 DROP = 7 张**（均由 `20261119110000` 删除）：

| # | 表 |
|---|---|
| 1 | `erp.voucher_items` |
| 2 | `hrm.payroll_records` |
| 3 | `hrm.performance_records` |
| 4 | `hrm.recruitment_applications` |
| 5 | `hrm.recruitment_records` |
| 6 | `hrm.training_participants` |
| 7 | `public.tenant_permissions` |

**批 2 归一 ∩ 死表 DROP = 20 张**：

| # | 表 | 删除方 |
|---|---|---|
| 1 | `tms.carriers` | `20261119100000` |
| 2 | `tms.drivers` | `20261119100000` |
| 3 | `public.core_file_folders` | `20261119110000` |
| 4 | `public.core_finance_vouchers` | `20261119110000` |
| 5 | `public.core_guide_lessons` | `20261119110000` |
| 6 | `public.core_guide_progress` | `20261119110000` |
| 7 | `public.core_inter_module_sync` | `20261119110000` |
| 8 | `public.core_mdm_reconciliation_log` | `20261119110000` |
| 9 | `public.cqrs_events` | `20261119110000` |
| 10 | `public.crm_dashboard_snapshots` | `20261119110000` |
| 11 | `public.ehs_dashboard_snapshots` | `20261119110000` |
| 12 | `public.finance_voucher_templates` | `20261119110000` |
| 13 | `public.financial_reports` | `20261119110000` |
| 14 | `public.hrm_dashboard_snapshots` | `20261119110000` |
| 15 | `public.lims_dashboard_snapshots` | `20261119110000` |
| 16 | `public.pdm_change_notices` | `20261119110000` |
| 17 | `public.pdm_dashboard_snapshots` | `20261119110000` |
| 18 | `public.pdm_materials` | `20261119110000` |
| 19 | `public.pdm_products` | `20261119110000` |
| 20 | `public.wms_dashboard_snapshots` | `20261119110000` |

合计 27 张：归一覆盖率相应变为 `71−7=64` 与 `167−20=147`，其余目标表全部按原严格度处理。

### 6.3 处置：清单白名单 + 三条守卫（A 的加强版）

静态 DDL 全部改为「按表循环 + `to_regclass` 存在性守卫」，批 1 的 71 条 `DROP POLICY`、批 2 的 318 条 `ALTER POLICY` +
16 条 `DROP POLICY` + 8 条 `CREATE POLICY` 走同一套循环；严格 B 表达式从原文件原样取用（生成时只做单引号转义），不手抄重写。

| 规则 | 条件 | 行为 |
|---|---|---|
| 1 | 表不存在，且命中本批 `v_dropped` 白名单（7 / 20 张） | `RAISE NOTICE` 跳过，并按批累计跳过数 |
| 2 | 表不存在，且**不在**白名单 | `RAISE EXCEPTION`，文案含表名与实际原因 |
| 3 | 表存在 | 前置断言（恰好 2 条 / 恰好 1 条、含 `app.rls_system`、FORCE）、归一 DDL、后置断言全部保持原严格度，一条不放宽 |

规则 2 是刻意 fail-closed：将来任何人调整两份死表清单而未同步本迁移，归一这一步会立刻炸出来，而不是静默少归一。
回滚文件同样带守卫：`表已被删` 与 `死表批已回滚、表已恢复` 两种顺序都可逆。

### 6.4 为什么不用纯 B（按现存表收敛、删除清单直接剔除）

纯 B 的做法是把这 27 张从目标清单里直接删掉。问题在回滚：死表批一旦回滚（`archive` 里的表被恢复），这 27 张会重新出现，
但归一迁移的账本已记过、不会重跑，于是它们**永久漏归一**（保留遗留策略名 / 重复策略），且没有任何断言会提示。
守卫版把「跳过」限制在同一批次的已知删除名单内，并在名单外的缺失上即时报错，因此能同时容纳两种回滚顺序。

### 6.5 验收

- 走门禁同一路径 `bash scripts/dev/run-migration-drill.sh anchor`：干净 worktree、模板库 `topems_drill_template`、非特权连接
  （`[conn]` 显示 `topems_test_runner`、`rolsuper=false`、`rolbypassrls=false`），尾行 `PASS: drill:anchor`。
- 演练日志应包含 27 条跳过 `NOTICE`（批 1 ×7、批 2 ×20）与最终策略计数，后置断言全部通过。

---

## 7. 待决点

1. **9 张平台读语义表**（§1.1）：两个策略语义不同，需确认保留两张还是合并为一张带 `OR` 的 `rls_platform_read`。本批未动。
2. **37 条 fail-open 中除 6 张审计表外的其余表**：按 §4 清单继续确认「平台语料 / 租户数据 / 休眠表」。6 张共享审计表已定性为有意放行并由守卫钉住；其余未动。
3. **manifest anchor 滞后**：`ledger_evidence.current_prod.anchor` 仍写 `20261118150000`，而生产账本已到 `20261119000002`。本次未改 anchor（超出「只改相关条目」范围），建议下次窗口一并刷新。
4. **已关闭**：`public.core_login_logs` 定性（永久移出，双策略 + 守卫）；`20261118124000` 登记方式（superseded + 前向补丁）。
