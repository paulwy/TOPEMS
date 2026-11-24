# RLS 覆盖分类甄别台账（2026-11-24）

## 1. 背景与目标

承接《tenant-read-predicate-rls-audit-2026-11-24.md》§9.3。本轮目标：对生产库 RLS OFF 的表做客观分类，区分「应补隔离」「可豁免」「灰色待口径」，为后续是否补 RLS 策略迁移提供基线。**本轮全程只读 `information_schema` / 系统目录与代码基准文件，不写生产库、不改迁移链。**

## 2. 数据基准与口径

- **代码侧基准**：`database/rls_policy_expected.json`（由迁移链生成，`generated_from: migration-chain`），共收录 801 表，其中 800 表标记 `rls_enabled: true`；基准内有意保留的全局读通道仅 3 张：`erp.core_erp_materials`、`gis.track_positions`、`iam.roles`。
- **head 结构校验库**：`topems_runtime_fixture_verify`（水位 `20261124200000`，0 失败）。复核：代码期望 ON 的 800 表在 head 库 OFF 数量为 **0**，即基准与 head 结构一致，可作对照基准。
- **生产快照**：`topems_prod`，采集于 2026-11-24。
- **判据**：① 表是否带 `tenant_id` 列；② 代码基准是否已期望 RLS ON；③ 表名用途特征（启发式，仅作初筛）。

## 3. 总量对照

| 口径 | 数量 |
|---|---:|
| 生产基表总数 | 1344 |
| 生产 RLS ON | 959 |
| 生产 RLS OFF | 385 |
| 代码基准期望 ON | 800 |
| 代码期望 ON 但生产 OFF（待追平） | **1** |

**关键判断**：生产 RLS 开关层面几乎不存在「代码已覆盖、待生产追平」的缺口（仅 1 张）；生产滞后主要体现在**策略内容**（allow-all 通道，见审计文档 §9.3），而非 RLS 开关未开。

## 4. 分类结果

### 4.1 A 类 —— 代码已覆盖、生产待追平（1 张）

代码基准期望 ON，生产当前 OFF。需在生产 schema 窗口随迁移追平后复核开关状态：

- `iam.core_tenant_plugins`

> **复核结论（2026-11-25）**：`iam.core_tenant_plugins` 是**权威活表**，不是重复副本，**保留、不可归档**。
> - 源码证据：`svc/plugin-registry` 的 `tenant_plugins.rs` / `simple_api.rs` / `runtime.rs` 运行时读写该表（安装/激活/停用/卸载/列表/状态，JOIN `core.core_plugins`）。
> - 结构证据：14 列，`tenant_id`/`plugin_id` NOT NULL，唯一约束 `(tenant_id,plugin_id)`、租户索引、`tenant_id` 外键；数据已由 `20261115140800_family_tenant_plugins_to_iam.sql` 从 core 迁入。
> - 基准口径：`rls_tenant_isolation` ALL，ON+FORCE；严格化前向补丁 `20261119140000_iam_core_tenant_plugins_rls_strict_forward.sql`（前置断言 tenant_id NOT NULL、0 零/NULL 租户）。
> - 生产 OFF 根因：账本滞后，`20261119140000` 未重放；**追平账本后该迁移落地即对齐基准**，无需新增策略迁移。
>
> 同名另两张（勿混淆）：`core.core_tenant_plugins` 为遗留壳表（2 列骨架、无 tenant_id、源码零引用，档 2 系统通道口径，`20261119161000` 已重建）；`public.core_tenant_plugins` 为遗留骨架副本（2 列、OFF、零引用），建议纳入下一批副本归档评审。

### 4.2 B 类 —— 带 `tenant_id` 列、RLS OFF、代码未列入（72 张）

表本身携带租户列，但代码迁移链未给其挂 RLS 策略。按用途初筛四子类：

#### 4.2.1 废弃归档（11 张）—— 建议豁免，后续可走归档/清理
- `flow._deprecated_core_doc_documents`
- `flow._deprecated_core_doc_folders`
- `flow._deprecated_core_doc_templates`
- `flow._deprecated_core_flow_categories`
- `flow._deprecated_core_master_data_change_log`
- `flow._deprecated_core_mdm_approvals`
- `flow._deprecated_core_operation_logs`
- `flow._deprecated_core_tenant_modules`
- `flow._deprecated_core_tenant_settings`
- `flow._deprecated_core_tenant_usage`
- `flow._deprecated_core_tenant_users`

#### 4.2.2 日志 / 队列 / 同步 / 记录（10 张）—— 灰色，多为后台流转表，倾向豁免
- `flow.core_mdm_reconciliation_log`
- `iam.core_dashboard_refresh_log`
- `iam.core_email_queue`
- `iam.core_inter_module_sync`
- `iam.core_login_logs`
- `iam.core_migration_history`
- `iam.core_mobile_offline_records`
- `iam.core_usage_records`
- `public.analytics_sync_records`
- `public.qa_qms_sync_records`

#### 4.2.3 字典 / 目录 / 模板 / 内容参考（13 张）—— 灰色，全局参考数据倾向豁免
- `flow.core_menu_groups`
- `flow.core_menus`
- `iam.core_dict_items`
- `iam.core_dict_types`
- `iam.core_email_templates`
- `iam.core_faqs`
- `iam.core_guide_lessons`
- `iam.core_guide_progress`
- `iam.core_guides`
- `iam.core_menu_groups`
- `iam.core_menus`
- `iam.core_notification_templates`
- `iam.core_plugin_categories`

#### 4.2.4 业务实体（38 张）—— 应补隔离候选，需逐张核对应用依赖后定策略
- `flow.core_master_data_refs`
- `flow.core_workflow_instances`
- `flow.core_workflow_versions`
- `flow.core_workflows`
- `iam.core_billing_invoices`
- `iam.core_billing_plans`
- `iam.core_chat_members`
- `iam.core_chat_messages`
- `iam.core_chat_rooms`
- `iam.core_emails`
- `iam.core_file_folders`
- `iam.core_files`
- `iam.core_notifications`
- `iam.core_plugin_instances`
- `iam.core_plugin_permissions`
- `iam.core_plugin_pricing`
- `iam.core_plugin_reviews`
- `iam.core_plugins`
- `iam.core_roles`
- `iam.core_subscriptions`
- `iam.core_tenant_modules`
- `iam.core_tenant_settings`
- `iam.core_tenant_usage`
- `iam.core_tenant_users`
- `iam.core_users`
- `iam.core_workflow_instances`
- `iam.core_workflow_tasks`
- `iam.core_workflows`
- `iam.tenant_permissions`
- `plugin_erp.accounting_subjects`
- `public.conversion_executions`
- `public.conversion_rules`
- `public.core_ticket_activities`
- `public.core_ticket_comments`
- `public.core_ticket_sla_escalations`
- `public.core_ticket_sla_policies`
- `public.core_tickets`
- `public.pm_master_data_refs`

> 说明：本子类混杂平台级表（计费/订阅/插件市场/角色/用户/工作流引擎）与租户业务表（工单/文件/邮件/通知/会话）。平台级表可能本就应全局可读，**不能仅凭 `tenant_id` 存在即判应补 RLS**；需结合应用层 SQL 访问方式逐张定性。

### 4.3 C 类 —— 无 `tenant_id` 列、RLS OFF、代码未列入（312 张）

表本身不具备租户隔离列。按表名关键词初筛出疑似业务实体需复核 53 张，其余 259 张多为系统/网关/联邦/缓存/会话/种子/归档表，倾向豁免。

#### 4.3.1 疑似业务实体（53 张）—— 需复核：是全局表还是漏加租户列
- `ai.user_profiles`
- `analytics.report_schedules`
- `analytics.report_subscriptions`
- `analytics.report_templates`
- `analytics.reports`
- `bi.report_execution_records`
- `communication.core_location_messages`
- `core.core_plugin_permissions`
- `doc_service.core_doc_documents`
- `erp.erp_master_data_quality_reports`
- `erp.erp_master_data_quality_rules`
- `flow._deprecated_core_doc_document_versions`
- `flow.core_file_folders`
- `flow.core_file_permissions`
- `flow.core_files`
- `flow.core_workflow_tasks`
- `gis.track_positions`
- `iam.core_permissions`
- `iam.core_role_permissions`
- `iam.core_user_roles`
- `iam.tool_permissions`
- `iam.user_access_logs`
- `iam.user_roles`
- `iam.users`
- `master_data.mdm_quality_rules`
- `plugin_wms.purchase_order_snapshots`
- `portal.graphql_execution_profiles`
- `portal.portal_alert_thresholds`
- `portal.portal_compatibility_reports`
- `portal.portal_queue_messages`
- `public._archive_core_doc_documents`
- `public.core_doc_document_versions`
- `public.core_permissions`
- `public.core_plugin_permissions`
- `public.core_role_permissions`
- `public.core_user_roles`
- `public.equipment_inspections`
- `public.qa_ehs_inspection_items`
- `public.qa_ehs_inspection_plans`
- `public.qa_ehs_material_stocks`
- `public.qa_ehs_stock_records`
- `public.quality_inspections`
- `public.quality_patrol_items`
- `public.quality_patrols`
- `public.quality_standard_values`
- `public.quality_standards`
- `public.ticket_automation_rules`
- `public.ticket_knowledge_articles`
- `qms.qa_inspection_plan_items`
- `rs.document_relations`
- `rs.equipment_inspections`
- `ticket.schema_defense_ledger`
- `unified_core.documents`

#### 4.3.2 其余（259 张）—— 倾向豁免候选，抽查复核

schema 聚合：`portal` 108（网关/联邦/缓存/路由/策略等系统表）、`public` 67、`flow` 9、`iam` 9、`master_data` 9、`erp` 7、`rs` 7、`core` 5、`finance` 4、`rd` 4，其余 `bi/mobile/ai/analytics/doc_service/integration/mes/qms/communication/crm/ehs/gis/hrm/pdm/plugin_finance/pm/shared/srm/tms/unified_core` 各 1–3。

> 注意：`public` 67、`flow` 9、`rs` 7、`rd` 4、`mobile` 3 中仍可能混入业务表（如 `material_*`、`qa_ehs_*`、`rd.bugs/builds`、`rs.experiment_records/patents`、`mobile_attendance/leave`），关键词初筛未覆盖，需在应用依赖核对阶段二次过筛，不能直接归入豁免。

## 5. 局限与方法说明

1. 表名/列名分类为启发式初筛，**不构成逐表定性结论**；业务表 vs 全局参考表的最终判定，必须结合应用层 SQL 读写依赖与访问路径（系统通道/租户通道）复核。
2. 本台账聚焦「RLS 开关覆盖」；生产 36 条 `qual='true'` 全放行策略属「策略内容不隔离」问题，见审计文档 §9.3，不在本台账重复。
3. 生产账本滞后（水位 `20261119000002` vs 头版本 `20261124200000`），追平后需对 A 类及 B/C 候选重新跑一遍本对照。

## 7. P1 复核：B 类 38 张业务实体表应用依赖核对（2026-11-24）

### 7.1 方法

扫描 `svc/`、`lib/` 共 1983 个 `.rs` 文件，提取 SQL 中真实 `schema.table` 全限定引用（FROM/JOIN/INTO/UPDATE，共 848 个被引表名），与生产 RLS 状态、代码基准 ON 集合三方对照。关键鉴别：**基名相同不等于同一张表**——源码实际访问的常是另一 schema 的同名表，清单内同名副本可能是历史遗留。

### 7.2 ① 源码零引用死表（10 张）—— 不补 RLS，列归档候选

`.rs` 源码与 seeds/测试均无 SQL 引用：

- `iam.core_billing_invoices`
- `iam.core_billing_plans`
- `iam.core_chat_members`
- `iam.core_chat_messages`
- `iam.core_chat_rooms`
- `iam.core_file_folders`
- `iam.core_plugin_pricing`
- `iam.core_subscriptions`
- `iam.core_users`
- `public.pm_master_data_refs`

### 7.3 ② 同名重复遗留表（24 张）—— 不补 RLS，列重复表清理候选

源码访问的是另一 schema 的同名表，且该本体在生产已 RLS ON、基准期望 ON；清单内副本无应用依赖：

| 清单内 OFF 副本 | 源码实际访问本体（生产 ON / 基准 ON） |
|---|---|
| `flow.core_master_data_refs` | `public.core_master_data_refs` |
| `flow.core_workflow_instances` / `core_workflow_versions` / `core_workflows` | `public.core_workflow_instances` / `core_workflow_versions` / `core_workflows` |
| `iam.core_emails` | `public.core_emails` |
| `iam.core_files` | `public.core_files` |
| `iam.core_notifications` | `public.core_notifications` |
| `iam.core_roles` | `public.core_roles` |
| `iam.core_tenant_modules` / `core_tenant_settings` / `core_tenant_usage` / `core_tenant_users` | `public.core_tenant_modules` / `core_tenant_settings` / `core_tenant_usage` / `core_tenant_users` |
| `iam.core_workflow_instances` / `core_workflow_tasks` / `core_workflows` | `public.core_workflow_instances` / `core_workflow_tasks` / `core_workflows` |
| `iam.core_plugin_instances` / `core_plugin_permissions` / `core_plugin_reviews` | `core.core_plugin_instances` / `core_plugin_permissions` / `core_plugin_reviews`（本体见 7.4③） |
| `iam.core_plugins` | `core.core_plugins` |
| `plugin_erp.accounting_subjects` | `plugin_finance.accounting_subjects` |
| `public.conversion_executions` / `conversion_rules` | `integration.conversion_executions` / `conversion_rules` |
| `public.core_ticket_activities` / `core_ticket_comments` / `core_ticket_sla_escalations` / `core_ticket_sla_policies` / `core_tickets` | `ticket.core_ticket_activities` / `core_ticket_comments` / `core_ticket_sla_escalations` / `core_ticket_sla_policies` / `core_tickets` |

### 7.4 ③ 源码在用、生产 OFF、待口径定性（4 张）

这 4 张是 B 类中唯一「代码路径真实访问、但生产 RLS OFF、基准未列入」的表：

| 表 | 访问路径观察 | 初步倾向 |
|---|---|---|
| `core.core_plugin_instances` | 插件运行时实例注册；INSERT/UPDATE/SELECT 按 `plugin_id` 关联，SQL 未直接绑定 `tenant_id` | 需评审：平台运行时注册表 vs 租户业务实例 |
| `core.core_plugin_permissions` | 插件权限定义目录，按 `plugin_code` 查询，无租户谓词 | 倾向全局参考数据，可豁免 |
| `core.core_plugin_reviews` | 插件市场评论/评分 | 需评审：全局公开评价 vs 租户可见 |
| `iam.tenant_permissions` | 应用层 SQL 均带 `WHERE tenant_id = $1`，租户谓词在位；RLS OFF 属谓词兜底 | 风险较低，确认是否需补 RLS 兜底策略 |

> 处置建议：③ 组在产品/安全口径确认前不擅自补策略；`iam.tenant_permissions` 已有应用谓词，优先级最低；插件实例/评论表需先明确数据归属模型。

### 7.5 小结

B 类 38 张经应用依赖核对：**10 张死表 + 24 张重复遗留表不补 RLS**；仅 **4 张在用表待口径定性**，其中无一张可直接判定为"漏挂 RLS 的租户业务表"。这与 §3 判断一致：生产 RLS 开关覆盖基本健康，主要隔离风险仍在策略内容（allow-all，见审计 §9.3）。

## 8. P1 复核：C 类 53 张疑似业务实体表（2026-11-24）

同 §7.1 方法做三方对照（源码全限定引用 × 生产 RLS 状态 × 基准 ON 集合）。结果分三档。

### 8.1 源码无引用（12 张）—— 死表/归档候选，不补 RLS

- `flow._deprecated_core_doc_document_versions`
- `flow.core_file_folders`
- `flow.core_file_permissions`
- `iam.user_access_logs`
- `iam.user_roles`
- `portal.graphql_execution_profiles`
- `portal.portal_alert_thresholds`
- `portal.portal_compatibility_reports`
- `portal.portal_queue_messages`
- `public._archive_core_doc_documents`
- `public.qa_ehs_material_stocks`
- `ticket.schema_defense_ledger`

### 8.2 同名重复遗留（22 张）—— 本体在生产 ON 且基准 ON，副本不补 RLS

| 清单内 OFF 副本 | 源码实际访问本体（生产 ON / 基准 ON） |
|---|---|
| `analytics.report_schedules` / `report_subscriptions` / `report_templates` / `reports` | `bi.report_schedules` / `bi.report_subscriptions` / `bi.report_templates`(+`pm.report_templates`) / `bi.reports` |
| `bi.report_execution_records` | `analytics.report_execution_records` |
| `doc_service.core_doc_documents` | `public.core_doc_documents` |
| `flow.core_files` / `core_workflow_tasks` | `public.core_files` / `public.core_workflow_tasks` |
| `plugin_wms.purchase_order_snapshots` | `wms.purchase_order_snapshots` |
| `public.equipment_inspections` / `rs.equipment_inspections` | `mes.equipment_inspections` |
| `public.qa_ehs_inspection_items` / `inspection_plans` / `stock_records` | `ehs.qa_ehs_inspection_items` / `inspection_plans` / `stock_records` |
| `public.quality_inspections` / `quality_patrol_items` / `quality_patrols` / `quality_standard_values` / `quality_standards` | `mes.quality_inspections` / `quality_patrol_items` / `quality_patrols` / `quality_standard_values` / `quality_standards` |
| `public.ticket_automation_rules` / `ticket_knowledge_articles` | `ticket.ticket_automation_rules` / `ticket_knowledge_articles` |
| `unified_core.documents` | `mobile.documents` / `ai.documents` / `erp.documents` |

### 8.3 在用待定性（19 张）

- **基准有意全局通道（豁免）**：`gis.track_positions`（基准白名单 3 张之一）。
- **与 §7.4③ 同源**：`core.core_plugin_permissions`、`public.core_plugin_permissions`（插件权限目录）。
- **权限/角色关联表（测试夹具命中，待评审）**：`public.core_permissions`、`public.core_role_permissions`、`public.core_user_roles`、`iam.core_permissions`、`iam.core_role_permissions`、`iam.core_user_roles`、`iam.tool_permissions`。
- **其余需运行时链路复核**：`ai.user_profiles`、`communication.core_location_messages`、`erp.erp_master_data_quality_reports`、`erp.erp_master_data_quality_rules`、`iam.users`、`master_data.mdm_quality_rules`、`public.core_doc_document_versions`、`qms.qa_inspection_plan_items`、`rs.document_relations`。

> 注意：部分源码命中来自 `svc/**/tests/` 夹具建表/样例 SQL，不等于运行时服务端依赖；上表"待定性"项需在运行时链路（路由 → 服务 → SQL）二次确认，不能仅凭测试命中定性。

### 8.4 两轮复核小结

| 分桶 | 总数 | 无引用死表 | 重复遗留 | 在用待定性 |
|---|---:|---:|---:|---:|
| B 类（带 tenant_id，OFF，代码未列） | 38 | 10 | 24 | 4 |
| C 类（无 tenant_id，OFF，代码未列） | 53 | 12 | 22 | 19 |

两轮对照未发现"明确漏挂 RLS 的租户业务表"；待定性 23 张（4+19）需产品/安全口径与运行时链路复核后再决定补策略。整体结论与 §3、§7.5 一致：**生产 RLS 开关覆盖基本健康，主要隔离风险集中在策略内容（allow-all）与历史重复/遗留表治理。**

## 9. 待定性表运行时链路复核（2026-11-24）

### 9.1 方法

排除 `**/tests/` 夹具与测试样例，扫描 1750 个运行时 `.rs`，逐表核查：运行时是否有真实 SQL、SQL 是否绑定 `tenant_id`、数据归属靠什么隔离。下列为客观观察与初步建议，**不构成补 RLS 迁移结论**；④ 组仍需产品/安全口径拍板。

### 9.2 ① 全局参考/目录表（倾向豁免，不补 RLS）

| 表 | 运行时观察 |
|---|---|
| `core.core_plugin_permissions` | 插件权限定义目录，按 `plugin_code` 查询/写入，无租户谓词 |
| `erp.erp_master_data_quality_rules` / `erp_master_data_quality_reports` | 主数据质量规则/报告目录，按 domain/entity_type 过滤 |
| `master_data.mdm_quality_rules` | 质量规则目录，按 entity_type/enabled 过滤 |
| `public.core_permissions` / `core_role_permissions` / `core_user_roles`（及 `iam.core_permissions` / `core_role_permissions` / `core_user_roles` 副本） | 权限-角色-用户授权关联模型，全局权限定义与关联 |
| `iam.tool_permissions` | 工具级权限覆盖，外键挂 `tenant_permission_id`，无独立租户谓词 |

### 9.3 ② 父子关联/版本表，靠父表 JOIN 隔离（豁免自身 RLS）

| 表 | 隔离现状 |
|---|---|
| `public.core_doc_document_versions` | 表无 `tenant_id`、无 RLS；代码注释明确：JOIN 父文档表 `d.tenant_id` 谓词做归属校验，不依赖版本表自身策略 |
| `qms.qa_inspection_plan_items` | 计划-明细关联表，JOIN `qa_inspection_items` 带 `i.tenant_id` 谓词 |
| `rs.document_relations` | 按 `entity_type`/`entity_id` 关联归属（列表分页见 9.5④） |
| `communication.core_location_messages` | 按 `chat_id` 归属会话（chat 边界见 9.5④） |

### 9.4 ③ 应用谓词/作用域在位，风险较低

| 表 | 隔离现状 |
|---|---|
| `iam.tenant_permissions` | SQL `WHERE tenant_id=$1 AND user_id=$2`，租户谓词在位 |
| `iam.users` | 身份主表；scope 判定 JOIN `tenant_users` 带 `tenant_id`；登录按 username/email 做全局身份解析 |
| `ai.user_profiles` | 按 `user_id` 读写，走 `scope_with` 租户作用域事务 |

### 9.5 ④ 仍需口径拍板（4 类）

| 表 | 待确认点 |
|---|---|
| `core.core_plugin_instances` | 插件运行时实例注册；INSERT/UPDATE/SELECT 按 `plugin_id` 关联，SQL 未直接绑定 `tenant_id`，需明确实例是平台共享还是租户私有 |
| `core.core_plugin_reviews` | 市场评论/评分，需确认公开可见还是租户内可见 |
| `rs.document_relations` | 列表与 COUNT 为全表分页，未见租户过滤；需复核是否应按实体租户收敛 |
| `communication.core_location_messages` | 仅按 `chat_id` 归属，需确认 chat 边界是否已覆盖租户隔离 |

### 9.6 ⑤ 基准白名单（豁免）

- `gis.track_positions`：代码基准 `rls_policy_expected.json` 有意保留的全局读通道（白名单 3 张之一）。

### 9.7 复核结论

23 张待定性表经运行时链路复核：**未发现必须立即补 RLS 的明确租户业务表**。① 组倾向目录/全局豁免；② 组靠父表 JOIN 隔离；③ 组应用谓词在位；④ 组 4 个点需产品/安全口径确认后再定；⑤ 组为有意全局通道。后续若补策略，优先复核 ④ 组中 `rs.document_relations` 的全表分页读与 `core_plugin_instances` 的实例归属。

## 6. 下一步建议（优先级）

1. **P1**：~~核对 B 类 38 张业务实体表的应用 SQL 依赖~~（已完成，见 §7；剩 4 张待口径定性）。
2. **P1**：~~复核 C 类 53 张疑似业务实体~~（已完成，见 §8；12 死表 / 22 重复遗留 / 19 待定性）。
3. **P2**：在超户/CI 全链 head 库上复跑本对照，消除 fixture 库快照偏差。
4. **P3**：22 张死表 + 46 张重复遗留表纳入后续归档/下线评估；日志/队列/字典类逐张确认豁免口径后登记豁免台账。
5. **口径待办**：§9.5④ 组 4 个点（插件实例归属、插件评论可见性、`rs.document_relations` 全表分页、位置消息 chat 边界）提交产品/安全评审。
