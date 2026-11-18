# 裸表名解析影子表：静态排查报告（2026-11-18）

> 只读排查。表清单取自本地 `topems_prod` 的 `pg_class` 元数据；代码位置取自全仓 `svc/**/*.rs` 的 SQL 字面量。
> 本轮不执行任何建表/删表/授权/数据写入；不提交、不 push。

## 0. 结论摘要

| 项 | 结果 |
|---|---|
| SQL 裸表名引用总数（FROM/JOIN/INSERT/UPDATE/DELETE） | 1618 |
| A 确实命中影子表 | 1 组已修：`public.core_users`；另有 1 组高置信候选：`flow.core_master_data_change_log`（本轮只报） |
| C 需要运行期确认 | 241 处 |
| B1 固定解析到本服务 schema | 565 处 |
| B2 表名唯一 | 812 处 |
| 72 张待核实影子表中：零裸引用 | 61 张 |
| 72 张待核实影子表中：有裸引用但经 `state.db` 落 public | 9 张 |
| 72 张待核实影子表中：裸引用经裸池落到副本（DROP 阻塞） | 2 张 |

**对「72 张能不能 DROP」的回答**：静态证据支持 **61 张可直接进入 DROP 候选**；9 张的副本本身无读者（引用经 `Db::scope_*` 的 `SET LOCAL search_path` 落到 public 权威表），可 DROP 但需先确认无裸池路径；**2 张必须先改代码**：`flow.core_mdm_approvals`、`flow.core_master_data_change_log`（`svc/unified-core/src/modules/master/handlers.rs` 的裸池写入）。

## 0.1 长期对照表与门禁约束（2026-11-18 补充）

**门禁事实（有意为之的约束，不是障碍）**：

- `scripts/ci/check-search-path.mjs`（lefthook `search-path`，pre-commit）阻断 `svc/**` 里任何
  `SET [LOCAL] search_path` 或 `set_config('search_path', ...)`。本轮在 `doc/handlers.rs` 试图
  「在公共入口统一钉 `public`」时被直接拦下，最终改为把 3 处 `core_doc_document_versions`
  逐条写成 `public.`。
- `scripts/check_schema_boundary.py`（lefthook `boundary-gate-py`，CI 同名门禁）另行守护跨 schema
  引用边界。两者共同确立：**模块 schema 作用域只能由 `Db::new(pool, "<search_path>")` 在事务内注入**，
  业务代码不得自行改 `search_path`。

**结论**：「在公共入口统一钉 `search_path`」这条治全类的路已经封死。今后同类
「裸名解析到 flow / iam 空副本」的风险，**只能逐处加 schema 限定**（或改走 `Db` 作用域），
不能再靠设置 `search_path` 兜底。

**强制要求（长期有效）**：本文件的裸名引用清单（C 档 241 处；附录 A 38 张表 / 243 个代码位置；
历史口径常被概括为「86 处」，以本文件分档明细为准）**升级为长期对照表**。任何新增 SQL
提交前必须先查本表：

1. 命中「同名跨 schema」的表，一律写全限定名（如 `public.core_doc_document_versions`）；
2. 未命中的，也要能说明该表名在目标服务的所有运行路径下唯一；
3. 新发现或新引入的裸名引用必须回填本表，**不得只改代码不更新清单**。

## 1. 方法

1. 从 `pg_class` 取全部非系统 schema 的表/视图（1012 个表名，240 个同名跨 schema）。
2. 从代码提取每个服务实际生效的 search_path，而不是只看配置文件：
   - 服务 `src/main.rs` 的 `set_var("SEARCH_PATH", ...)` 与 `Db::new(..., "...")`；
   - 嵌入模式 `svc/server/src/modules/*_real_module.rs` 的 bootstrap / `Db::new`；
   - `svc/unified-core/src/embedded.rs:50` 的 `flow, public`（嵌入进程池默认值）。
3. 正则提取 SQL 中的未限定表名：`FROM|JOIN|INSERT INTO|UPDATE|DELETE FROM <name>`，排除 `schema.name`、CTE 名与函数调用。
4. 按 search_path 顺序解析到首个命中 schema；再与「同一服务的其他运行路径」比对。

判定口径：

- **A 确实命中**：裸引用解析到的表是 0 行副本，且同名权威表有数据 / 代码路径明确应读另一 schema。
- **B 无歧义**：表名只存在于一个 schema（B2），或在该服务所有运行路径下都固定解析到本服务 schema（B1）。
- **C 需要运行期确认**：同一服务的两条运行路径解析结果不一致，或全部候选均为空表、无法用数据判定权威归属。

## 2. A 档：确实命中影子表

### 2.1 已修复：`public.core_users`（analytics）

- 位置：`svc/analytics/src/main.rs`、`svc/analytics/src/routes.rs` 的 `reports_center_stats`。
- 旧 SQL 裸读 `core_users`，在 `search_path=bi, public` 下命中 `public.core_users`（0 行孤儿镜像），四个用户口径恒为 0。
- 新 SQL 改为 `iam.users ⨝ public.core_tenant_users`，全部显式 schema 前缀；`public.core_users` 不建写入链路。
- 修复后全仓已无运行期裸读/裸写 `core_users`。

### 2.2 新发现：`flow.core_master_data_change_log`（写读分裂，A 档候选）

- `svc/unified-core/src/modules/master/handlers.rs:483` `INSERT INTO core_master_data_change_log ... .execute(&self.pool)`：走裸池。
- `svc/unified-core/src/modules/master/handlers.rs:361` `SELECT ... FROM core_master_data_change_log ...`：走 `state.db` scope（`SET LOCAL search_path='public, shared'`）。
- 嵌入部署池默认 `flow, public`（`embedded.rs:50`）；若该池最终采用此路径，写入落 `flow.core_master_data_change_log`（0 行），读取落 `public.core_master_data_change_log`（0 行）→ 变更历史永远为空。与 `core_users` 同类，只是方向相反。
- **本轮不修**（按要求只出清单）。修复方式与 core_users 一致：统一走 `state.db` 并在 SQL 内显式 `public.`。

### 2.3 `flow.core_mdm_approvals`

- 5 处引用全部走 `MasterDataService::new(state.pool)` 的裸池，读写都在 flow；public 同名副本无读者。
- 属「一致但落在副本」：若 flow 是 MDM 审批的权威 schema 则正常，否则是影子。需业务确认归属后再 DROP 任一副本。

## 3. B 档：表名唯一 / 固定解析到本服务 schema

- 表名唯一：812 处；固定解析到本服务 schema：565 处。
- 这类引用不构成影子表歧义，不逐条列出。Top 表：

  - `core_tenants`：29 处（flow,iam,public）
  - `qa_lims_pt_plans`：26 处（lims,public）
  - `equipment`：26 处（mes,public,rs）
  - `qa_quality_issues`：24 处（唯一表名）
  - `automation_runs`：24 处（唯一表名）
  - `finance_voucher_template_lines`：23 处（唯一表名）
  - `core_tenant_users`：22 处（flow,iam,public）
  - `finance_voucher_templates`：21 处（finance,public）
  - `production_orders`：21 处（唯一表名）
  - `automation_rules`：21 处（唯一表名）
  - `analytics_dashboards`：20 处（analytics,bi）
  - `work_stations`：20 处（唯一表名）

## 4. C 档：需要运行期确认

共 241 处。按表聚合：

- `core_tenants`：28 处（候选 schema：flow,iam,public）
- `core_tenant_users`：22 处（候选 schema：flow,iam,public）
- `finance_voucher_templates`：21 处（候选 schema：finance,public）
- `cqrs_events`：10 处（候选 schema：finance,public）
- `core_flow_delegates`：10 处（候选 schema：flow,public）
- `core_flow_categories`：10 处（候选 schema：flow,public）
- `core_flow_rules`：10 处（候选 schema：flow,public）
- `financial_reports`：9 处（候选 schema：finance,public）
- `core_operation_logs`：9 处（候选 schema：flow,public）
- `core_faqs`：8 处（候选 schema：iam,portal,public）
- `core_tenant_usage`：8 处（候选 schema：flow,iam,public）
- `approvals`：8 处（候选 schema：flow,public）
- `core_doc_documents`：7 处（候选 schema：doc_service,flow,public）
- `core_flow_variables`：7 处（候选 schema：flow,public）
- `core_guides`：6 处（候选 schema：iam,portal,public）
- `core_tenant_modules`：6 处（候选 schema：flow,iam,public）
- `core_doc_templates`：6 处（候选 schema：doc_service,flow,public）
- `core_email_queue`：5 处（候选 schema：iam,public）
- `qa_ehs_risks`：5 处（候选 schema：ehs,public）
- `core_tenant_settings`：5 处（候选 schema：flow,iam,public）
- `core_mdm_approvals`：5 处（候选 schema：flow,master_data,public）
- `core_doc_folders`：5 处（候选 schema：doc_service,flow,public）
- `qa_ehs_hazards`：4 处（候选 schema：ehs,public,qms）
- `approval_records`：4 处（候选 schema：flow,public）
- `core_master_data_change_log`：3 处（候选 schema：flow,master_data,public）
- `core_doc_document_versions`：3 处（候选 schema：flow,public）
- `core_migration_history`：3 处（候选 schema：flow,iam,public）
- `qa_ehs_hazard_rectifications`：2 处（候选 schema：ehs,public）
- `core_guide_lessons`：2 处（候选 schema：iam,portal,public）
- `core_flow_variable_history`：2 处（候选 schema：flow,public）
- `qa_ehs_accidents`：1 处（候选 schema：ehs,public）
- `qa_ehs_trainings`：1 处（候选 schema：ehs,public）
- `qa_ehs_inspection_plans`：1 处（候选 schema：ehs,public）
- `qa_ehs_emergency_plans`：1 处（候选 schema：ehs,public）
- `qa_ehs_hazardous_materials`：1 处（候选 schema：ehs,public）
- `qa_ehs_hazard_verifications`：1 处（候选 schema：ehs,public）
- `audit_logs`：1 处（候选 schema：bi,crm,ehs,erp,flow,gis,hrm,iam,lims,mes,plugin_mes,public,qms,rs,scm,shared,srm,wms）
- `core_file_permissions`：1 处（候选 schema：flow,public）

全量明细见附录 A。典型成因：

- 同一服务在 standalone（`main.rs`）与嵌入（`server` module / `state.db`）下 search_path 不同，例如 `portal` 的 `Db::new(..., "public, portal")` 把 public 放在前面；
- 同一模块内混用 `state.db`（scope 显式 SET LOCAL）与 `state.pool`（裸池），如 `master/handlers.rs`；
- 两组同名表均为空表，无数据可判定权威归属。

## 5. 72 张影子表逐表判定

| 影子表 | 同名副本 | 裸引用 | 判定 | 依据 |
|---|---|---:|---|---|
| `flow.core_doc_documents` | doc_service,flow,public | 7 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_doc_folders` | doc_service,flow,public | 5 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_doc_templates` | doc_service,flow,public | 6 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_flow_categories` | flow,public | 10 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_master_data_change_log` | flow,master_data,public | 3 | 不可 DROP（A 档候选） | 写 `record_change` 走裸池（嵌入模式下可能=flow），读 `list_changes` 走 `state.db` scope（public）：写读分裂，与 core_users 同类 |
| `flow.core_master_data_refs` | flow,master_data,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `flow.core_mdm_approvals` | flow,master_data,public | 5 | 不可 DROP | 5 处 INSERT/SELECT 走 `MasterDataService::new(state.pool)`（裸池）；嵌入模式池路径由 `embedded.rs`/build 顺序决定（默认 `flow, public`），可能落 flow 副本，需运行期确认 |
| `flow.core_mdm_reconciliation_log` | flow,master_data,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `flow.core_menu_groups` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `flow.core_menus` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `flow.core_operation_logs` | flow,public | 9 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_tenant_modules` | flow,iam,public | 6 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_tenant_settings` | flow,iam,public | 5 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_tenant_usage` | flow,iam,public | 8 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_tenant_users` | flow,iam,public | 22 | 可 DROP（先确认） | 引用经 state.db/scope 的 SET LOCAL 落 public 权威表，副本无读者 |
| `flow.core_workflow_instances` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `flow.core_workflow_versions` | flow,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `flow.core_workflows` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_billing_invoices` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_billing_plans` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_chat_members` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_chat_messages` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_chat_rooms` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_dashboard_refresh_log` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_dict_items` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_dict_types` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_email_queue` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_email_templates` | communication,iam | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_emails` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_faqs` | iam,portal,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_file_folders` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_files` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_guide_lessons` | iam,portal,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_guide_progress` | iam,portal,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_guides` | iam,portal,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_inter_module_sync` | iam,integration,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_login_logs` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_menu_groups` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_menus` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_migration_history` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_mobile_offline_records` | iam,mobile | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_notification_templates` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_notifications` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_plugin_categories` | core,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_plugin_instances` | core,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_plugin_permissions` | core,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_plugin_pricing` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_plugin_reviews` | core,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_plugins` | core,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_roles` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_subscriptions` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_tenant_modules` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_tenant_settings` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_tenant_usage` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_tenant_users` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_usage_records` |  | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_users` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_workflow_instances` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_workflow_tasks` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.core_workflows` | flow,iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `iam.tenant_permissions` | iam,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `plugin_erp.accounting_subjects` | finance,plugin_erp,plugin_finance | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.analytics_sync_records` | analytics,bi,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.conversion_executions` | integration,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.conversion_rules` | integration,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.core_ticket_activities` | public,ticket | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.core_ticket_comments` | public,ticket | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.core_ticket_sla_escalations` | public,ticket | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.core_ticket_sla_policies` | public,ticket | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.core_tickets` | public,ticket | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.pm_master_data_refs` | pm,public | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |
| `public.qa_qms_sync_records` | public,qms | 0 | 可 DROP 候选 | 全仓无裸引用解析到该副本 |

> 说明：`public.core_users` 原被 §12.1 归入 15 张租户表，本轮证明它是 0 行孤儿镜像（`iam.users` 才是真相源）。
> 迁移 `20261118150000` 仍会对它启用 RLS（按要求本轮不动既定草案）；它现在已无读写方，建议后续并入 DROP 候选。

## 6. 未覆盖面 / 风险

1. **动态 SQL**：用 `format!` 拼接表名的语句无法静态解析；本轮正则只覆盖字面量表名。
2. **`database/**.sql` 脚本**：仍有 215 处裸引用，集中在 `database/init/03_init_permissions.sql`（`core_menu_groups` 83、`core_roles` 58、`core_menus` 51、`core_users` 19 等）。这些脚本按 public 语义执行，是 public 权威表的写入/初始化链路，不影响 iam/flow 副本的 DROP。
3. **外部工具/旧部署**：psql、备份恢复、BI 直连等不在全仓代码范围内。
4. **Python 门禁盲区**：`scripts/check_schema_boundary.py` 的 `known_schemas` 不包含 `iam`，因此全仓 112 处 `iam.*` 引用不会被它识别（本次 analytics 新增 `iam.users` 仍 PASS）。Node 门禁已通过 allowlist 登记。若要把 `iam` 纳入 Python 门禁，需先清理其他服务的 `iam.*` 引用，属独立议题。

## 7. REVOKE 方案（仅 topems_app，本轮不执行）

目标：对 72 张影子表做幂等撤销，防止未来误授权。`topems_prod` 暂缓。

```sql
-- 幂等：表不存在时跳过，未授权时 REVOKE 也是 no-op
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        -- 由本报告第 5 节的 72 张清单生成
        'flow.core_doc_documents', 'flow.core_doc_folders'
        -- ...（其余 70 张）
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass(t) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %s FROM topems_app', t);
        END IF;
    END LOOP;
END $$;
```

- 当前事实：`topems_app` 为 NOLOGIN，且在 87 张表上的授权数为 0，因此该脚本现状为 no-op，只提供未来防护。

## 8. 处置记录（Round E，2026-11-18）

### 8.1 master 两表：代码改走租户作用域 + 显式 `public.`

改动文件：`svc/unified-core/src/modules/master/handlers.rs`。

- 8 处裸引用全部改为显式 `public.`（`core_master_data_change_log` 3 处、`core_mdm_approvals` 5 处）。
- 原先直接跑在 `self.pool` 上的 3 条语句（`log_change` INSERT、`create_approval` INSERT、
  `review_approval` UPDATE）改为接收 `&mut ScopedTxn`，由 handler 通过
  `state.db.scope_with(txn)` 复用请求事务；`create_ref/update_ref/delete_ref` 与两个审批 handler
  补挂 `RlsTxnCell`。5 条原本已走 `ScopedTxn` 的读语句保持作用域，仅补 `public.`。
- 写路径均显式绑定 `tenant_id`（变更日志取 `ref_data.tenant_id`，审批取 claims 租户）；
  读路径依赖请求事务内的 `app.tenant_id` GUC + public 表 RLS，不再依赖 `search_path` 偶然命中。

**真实调用验证**（显式 `TEST_DATABASE_URL`，测试库 `topems_test_runner`；请求事务提交后再走读路径）：

| 步骤 | 结果 |
|---|---|
| `create_ref_handler`（租户 `…0009`） | 成功；`public.core_master_data_change_log` 1 行、`tenant_id=…0009`；`flow` 同名副本 0 行 |
| `list_changes_handler`（新请求事务） | 查回 1 条，`action=created`，`tenant_id=…0009` |
| `create_approval_handler` → `list_pending_approvals_handler` → `review_approval_handler` | 均成功；审批落 public，待审批列表可查回，`flow` 副本 0 行 |
| 清理后残余 | 5 张表（public/flow 变更日志 + public/flow 审批 + public 引用）合计 **0 行**；审计表同条件 0 行 |

### 8.2 报告项 1：生产是「一直静默丢写」还是「从未被调用」

**结论：生产从未成功调用过该路径；主数据变更功能实际处于未启用状态，不是持续静默丢数据。**

只读核查 `topems_prod`：

| 对象 | 行数 | `pg_stat_user_tables.n_tup_ins` |
|---|---:|---:|
| `public.core_master_data_change_log` | 0 | 0 |
| `flow.core_master_data_change_log` | 0 | 0 |
| `public.core_mdm_approvals` | 0 | 0 |
| `flow.core_mdm_approvals` | 0 | 0 |
| `public.core_master_data_refs` | 0 | 0 |

补充事实：

- `create_ref_handler` 已挂在路由上（`routes/master.rs:539`），但 `create_ref` 先写
  `public.core_master_data_refs`；该表 0 行，说明请求从未走到变更日志写入，或写入前即失败。
- 审批 4 个 handler **没有任何路由注册**（全仓仅定义，无 `routes/*.rs` 引用），审批功能从未对外暴露。
- 修复前的实际形态不是「写入丢失」，而是**读写分叉**：裸池写落 `flow` 副本（无 RLS、可写成功），
  读路径经 `state.db.scope_with` 落 `public`，因此即使被调用也表现为「刚写的查不到」。
  本次改完后读写都在 `public` 同一租户作用域内。

### 8.3 doc 三表 18 处：逐调用点确认租户 GUC 后只补 `public.`

逐调用点核对结论：**18 处全部带租户 GUC，无需补 GUC，仅显式加 `public.`。**

| 路径 | 调用点 | GUC 来源 |
|---|---|---|
| `list_*` / `get_*` / `list_categories`（documents/folders/templates） | handlers.rs 116、154、271、343、456、494 | `state.db.scope_with(request_txn)` → `SET LOCAL app.tenant_id` |
| `create_*` / `update_*` / `delete_*`（documents/folders/templates） | services 各文件 `tenant_txn(Some(tenant_id))` | 事务内 `set_config('app.tenant_id', …, true)`（超管为 nil，命中策略旁路分支） |
| `open_rls_txn` 三处（版本列表/详情/恢复） | handlers.rs 1088、1148、1212 | 事务内 `set_config('app.tenant_id', …, true)` |

改动：`document.rs` 7 处、`folder.rs` 5 处、`template.rs` 6 处全部改为 `public.` 前缀；
另发现同表漏计 1 处 —— `handlers.rs:1238` 恢复版本的 `UPDATE core_doc_documents`（同样经
`open_rls_txn` 带 GUC），一并补 `public.`。行为不变，仅去掉对 `search_path` 的依赖。

**未改动但需单列**：版本相关 3 个端点读写的 `core_doc_document_versions` 也在 `flow` 存在同名副本，
且 `open_rls_txn` 不设 `search_path`，当前首命中 `flow` 副本（0 行）→ 生产上版本历史恒为空。
该表不在本轮 11 张清理范围，按「不在没确认前改行为」未动，建议单独排期确认。

### 8.4 11 张副本清理迁移（草案，单独登记，不进 RLS 窗口清单）

- 正向：`database/migrations/20261118160000_flow_shadow_copies_rename_deprecated.sql`
- 回滚：`database/rollback/20261118160000_flow_shadow_copies_rename_deprecated.rollback.sql`
- `database/checksums.txt` 已按哈希序登记（manifest 生成器未运行）。
- 干跑：在测试库 `topems_test_runner` 用 `BEGIN … ROLLBACK` 跑了正向脚本，11 张前置断言（0 行）、
  改名、public 表/策略快照比对全部通过；回滚后 `flow` 原状、无 `_deprecated_` 残留。

口径：

- 仅处理 11 张：`core_doc_documents`、`core_doc_folders`、`core_doc_templates`、
  `core_flow_categories`、`core_master_data_change_log`、`core_mdm_approvals`、
  `core_operation_logs`、`core_tenant_modules`、`core_tenant_settings`、`core_tenant_usage`、
  `core_tenant_users`；**不碰** `core_comments`、`core_favorites`、`notifications`、`workflows`。
- `RENAME TO _deprecated_<原名>`，不 DROP；回滚改回原名。
- 前置断言：副本存在时必须 0 行；不存在（含已被 `20261027200000` 清理）→ NOTICE 跳过。
- 后置断言：11 张 public 同名表仍在；对每表快照比对 `relrowsecurity` / `relforcerowsecurity` /
  全部策略（名称、命令、permissive、roles、USING、WITH CHECK）逐字未变；原名副本消失、
  `_deprecated_<原名>` 存在。
- **需代码同窗口上线**：本轮 master/doc 的显式 `public.` + 租户作用域必须先于/同时于迁移发布；
  否则改名后旧代码的裸引用会落到 public，master 变更日志/审批写路径在无 GUC 时被 RLS 拒绝。
- 与 RLS 窗口清单（`docs/database/window-rls-strict-20261118-runbook.md` 的 14 条）**分开登记**，
  不计入该窗口的账本/策略数预期。
- 已知冲突：仍挂在活动链上的 `20261027200000_core_schema_duplicates_cleanup.sql` 对同一批表使用
  `DROP TABLE IF EXISTS … CASCADE`（还覆盖另外约 90 张 flow 副本）。若它先执行，本迁移自动跳过；
  两者不应在同一窗口重复批准。

### 8.5 报告项 2：回归一律显式 `TEST_DATABASE_URL`

- `#[sqlx::test]` 会读取 shell 的 `DATABASE_URL` 建临时库；本机 `DATABASE_URL` 指向
  `topems_prod`，存在把测试库建到生产实例的风险。
- 自本轮起，所有回归/验证命令显式设置 `TEST_DATABASE_URL`（`topems_test_runner`），
  并 `env -u DATABASE_URL` 启动；本轮实测即按此执行。
- 既有 `audit_e2e` 的 4 个 `数据库作用域创建失败` 为改动前已存在的环境问题，与本轮改动无关。

## 附录 A：C 档全量明细

### `approval_records`（候选：flow,public）
- `svc/unified-core/src/modules/flow/instance.rs:108` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:135` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:175` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:221` → ['flow', 'public']

### `approvals`（候选：flow,public）
- `svc/unified-core/src/modules/flow/instance.rs:104` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:109` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:131` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:136` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:171` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:176` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:217` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/instance.rs:222` → ['flow', 'public']

### `audit_logs`（候选：bi,crm,ehs,erp,flow,gis,hrm,iam,lims,mes,plugin_mes,public,qms,rs,scm,shared,srm,wms）
- `svc/unified-core/tests/system_audit_e2e.rs:58` → ['flow', 'public'] [test]

### `core_doc_document_versions`（候选：flow,public）
- `svc/unified-core/src/modules/doc/handlers.rs:1098` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/handlers.rs:1158` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/handlers.rs:1221` → ['flow', 'public']

### `core_doc_documents`（候选：doc_service,flow,public）
- `svc/unified-core/src/modules/doc/handlers.rs:1238` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/document.rs:39` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/document.rs:52` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/document.rs:70` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/document.rs:101` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/document.rs:125` → ['flow', 'public']
- `svc/unified-core/tests/documents_e2e.rs:59` → ['flow', 'public'] [test]

### `core_doc_folders`（候选：doc_service,flow,public）
- `svc/unified-core/src/modules/doc/services/folder.rs:39` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/folder.rs:52` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/folder.rs:69` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/folder.rs:96` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/folder.rs:123` → ['flow', 'public']

### `core_doc_templates`（候选：doc_service,flow,public）
- `svc/unified-core/src/modules/doc/services/template.rs:39` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/template.rs:52` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/template.rs:70` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/template.rs:100` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/template.rs:133` → ['flow', 'public']
- `svc/unified-core/src/modules/doc/services/template.rs:145` → ['flow', 'public']

### `core_email_queue`（候选：iam,public）
- `svc/communication/src/mail.rs:1081` → ['public']
- `svc/communication/src/mail.rs:1155` → ['public']
- `svc/communication/src/mail.rs:1176` → ['public']
- `svc/communication/src/mail.rs:1194` → ['public']
- `svc/communication/src/mail.rs:1210` → ['public']

### `core_faqs`（候选：iam,portal,public）
- `svc/portal/src/modules/help/faq.rs:105` → ['public']
- `svc/portal/src/modules/help/faq.rs:124` → ['public']
- `svc/portal/src/modules/help/faq.rs:192` → ['public']
- `svc/portal/src/modules/help/faq.rs:208` → ['public']
- `svc/portal/src/modules/help/faq.rs:270` → ['public']
- `svc/portal/src/modules/help/faq.rs:334` → ['public']
- `svc/portal/src/modules/help/faq.rs:392` → ['public']
- `svc/portal/src/modules/help/faq.rs:443` → ['public']

### `core_file_permissions`（候选：flow,public）
- `svc/unified-core/src/modules/file/manage.rs:1292` → ['flow', 'public']

### `core_flow_categories`（候选：flow,public）
- `svc/unified-core/src/modules/flow/category.rs:131` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:150` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:202` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:260` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:307` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:332` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:378` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:414` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:470` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/category.rs:532` → ['flow', 'public']

### `core_flow_delegates`（候选：flow,public）
- `svc/unified-core/src/modules/flow/delegate.rs:142` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:163` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:219` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:263` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:312` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:367` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:402` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:530` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:572` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/delegate.rs:649` → ['flow', 'public']

### `core_flow_rules`（候选：flow,public）
- `svc/unified-core/src/modules/flow/rule.rs:149` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:170` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:226` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:275` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:326` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:385` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:436` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:477` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:522` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/rule.rs:610` → ['flow', 'public']

### `core_flow_variable_history`（候选：flow,public）
- `svc/unified-core/src/modules/flow/variable.rs:142` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/variable.rs:596` → ['flow', 'public']

### `core_flow_variables`（候选：flow,public）
- `svc/unified-core/src/modules/flow/variable.rs:145` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/variable.rs:161` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/variable.rs:224` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/variable.rs:249` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/variable.rs:277` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/variable.rs:292` → ['flow', 'public']
- `svc/unified-core/src/modules/flow/variable.rs:597` → ['flow', 'public']

### `core_guide_lessons`（候选：iam,portal,public）
- `svc/portal/src/modules/help/guide.rs:249` → ['public']
- `svc/portal/src/modules/help/guide.rs:400` → ['public']

### `core_guides`（候选：iam,portal,public）
- `svc/portal/src/modules/help/guide.rs:142` → ['public']
- `svc/portal/src/modules/help/guide.rs:161` → ['public']
- `svc/portal/src/modules/help/guide.rs:229` → ['public']
- `svc/portal/src/modules/help/guide.rs:318` → ['public']
- `svc/portal/src/modules/help/guide.rs:423` → ['public']
- `svc/portal/src/modules/help/guide.rs:466` → ['public']

### `core_master_data_change_log`（候选：flow,master_data,public）
- `svc/unified-core/src/modules/master/handlers.rs:361` → ['flow', 'public']
- `svc/unified-core/src/modules/master/handlers.rs:384` → ['flow', 'public']
- `svc/unified-core/src/modules/master/handlers.rs:483` → ['flow', 'public']

### `core_mdm_approvals`（候选：flow,master_data,public）
- `svc/unified-core/src/modules/master/handlers.rs:786` → ['flow', 'public']
- `svc/unified-core/src/modules/master/handlers.rs:826` → ['flow', 'public']
- `svc/unified-core/src/modules/master/handlers.rs:864` → ['flow', 'public']
- `svc/unified-core/src/modules/master/handlers.rs:878` → ['flow', 'public']
- `svc/unified-core/src/modules/master/handlers.rs:900` → ['flow', 'public']

### `core_migration_history`（候选：flow,iam,public）
- `svc/unified-core/src/modules/migration/service.rs:231` → ['flow', 'public']
- `svc/unified-core/src/modules/migration/service.rs:260` → ['flow', 'public']
- `svc/unified-core/src/modules/migration/service.rs:273` → ['flow', 'public']

### `core_operation_logs`（候选：flow,public）
- `svc/unified-core/src/modules/audit/handlers.rs:93` → ['flow', 'public']
- `svc/unified-core/src/modules/audit/handlers.rs:135` → ['flow', 'public']
- `svc/unified-core/src/modules/audit/handlers.rs:224` → ['flow', 'public']
- `svc/unified-core/src/modules/audit/handlers.rs:280` → ['flow', 'public']
- `svc/unified-core/src/modules/audit/handlers.rs:294` → ['flow', 'public']
- `svc/unified-core/src/modules/audit/handlers.rs:310` → ['flow', 'public']
- `svc/unified-core/src/modules/audit/service.rs:26` → ['flow', 'public']
- `svc/unified-core/src/modules/audit/service.rs:72` → ['flow', 'public']
- `svc/unified-core/tests/audit_e2e.rs:152` → ['flow', 'public'] [test]

### `core_tenant_modules`（候选：flow,iam,public）
- `svc/unified-core/src/modules/tenant/handlers.rs:521` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:539` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:947` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:989` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1041` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3541` → ['flow', 'public']

### `core_tenant_settings`（候选：flow,iam,public）
- `svc/unified-core/src/modules/settings/api_keys.rs:434` → ['flow', 'public']
- `svc/unified-core/src/modules/settings/smtp.rs:98` → ['flow', 'public']
- `svc/unified-core/src/modules/settings/smtp.rs:171` → ['flow', 'public']
- `svc/unified-core/src/modules/settings/smtp.rs:200` → ['flow', 'public']
- `svc/unified-core/src/modules/settings/smtp.rs:261` → ['flow', 'public']

### `core_tenant_usage`（候选：flow,iam,public）
- `svc/unified-core/src/modules/tenant/handlers.rs:874` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1462` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1474` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1537` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1549` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3521` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3585` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3848` → ['flow', 'public']

### `core_tenant_users`（候选：flow,iam,public）
- `svc/unified-core/src/modules/tenant/handlers.rs:371` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1132` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1146` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1159` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1172` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1185` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1197` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1209` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1221` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1233` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1294` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1347` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1391` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1444` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1452` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1527` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1670` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1737` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1803` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3533` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3761` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3797` → ['flow', 'public']

### `core_tenants`（候选：flow,iam,public）
- `svc/finance/tests/finance_service_tests.rs:28` → ['public'] [test]
- `svc/pdm/tests/pdm_tests.rs:24` → ['public'] [test]
- `svc/unified-core/src/modules/tenant/handlers.rs:54` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:67` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:79` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:91` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:103` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:114` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:125` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:136` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:147` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:153` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:191` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:225` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:271` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:602` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:705` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:778` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:819` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:859` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1081` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1592` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1736` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1818` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:1892` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:2091` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:2134` → ['flow', 'public']
- `svc/unified-core/src/modules/tenant/handlers.rs:3326` → ['flow', 'public']

### `cqrs_events`（候选：finance,public）
- `svc/finance/src/domain/pg_event_store.rs:74` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:82` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:100` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:120` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:128` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:176` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:205` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:236` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:246` → ['finance', 'public']
- `svc/finance/src/domain/pg_event_store.rs:322` → ['finance', 'public']

### `finance_voucher_templates`（候选：finance,public）
- `svc/finance/src/modules/mod.rs:2375` → ['finance', 'public']
- `svc/finance/src/modules/mod.rs:2617` → ['finance', 'public']
- `svc/finance/src/modules/mod.rs:2703` → ['finance', 'public']
- `svc/finance/src/modules/mod.rs:2781` → ['finance', 'public']
- `svc/finance/src/modules/mod.rs:2849` → ['finance', 'public']
- `svc/finance/src/modules/voucher_template.rs:150` → ['finance', 'public']
- `svc/finance/src/modules/voucher_template_entries.rs:105` → ['finance', 'public']
- `svc/finance/src/modules/voucher_template_entries.rs:138` → ['finance', 'public']
- `svc/finance/src/modules/voucher_template_entries.rs:214` → ['finance', 'public']
- `svc/finance/src/modules/voucher_template_entries.rs:287` → ['finance', 'public']
- `svc/finance/src/modules/voucher_template_entries.rs:334` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:105` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:163` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:226` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:305` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:326` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:410` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:429` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:448` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:456` → ['finance', 'public']
- `svc/finance/src/services/finance/voucher_template.rs:464` → ['finance', 'public']

### `financial_reports`（候选：finance,public）
- `svc/finance/src/modules/financial_reports.rs:1254` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:1298` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:1342` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:1360` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:2040` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:2080` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:2122` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:2176` → ['finance', 'public']
- `svc/finance/src/modules/financial_reports.rs:2216` → ['finance', 'public']

### `qa_ehs_accidents`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:191` → ['ehs'] [test]

### `qa_ehs_emergency_plans`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:285` → ['ehs'] [test]

### `qa_ehs_hazard_rectifications`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:161` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:430` → ['ehs'] [test]

### `qa_ehs_hazard_verifications`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:441` → ['ehs'] [test]

### `qa_ehs_hazardous_materials`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:324` → ['ehs'] [test]

### `qa_ehs_hazards`（候选：ehs,public,qms）
- `svc/ehs/tests/ehs_tests.rs:103` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:138` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:417` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:451` → ['ehs'] [test]

### `qa_ehs_inspection_plans`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:254` → ['ehs'] [test]

### `qa_ehs_risks`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:69` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:366` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:379` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:387` → ['ehs'] [test]
- `svc/ehs/tests/ehs_tests.rs:396` → ['ehs'] [test]

### `qa_ehs_trainings`（候选：ehs,public）
- `svc/ehs/tests/ehs_tests.rs:224` → ['ehs'] [test]
