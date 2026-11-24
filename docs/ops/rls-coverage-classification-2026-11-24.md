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

> 备注：基准内 `core.core_tenant_plugins`、`iam.core_tenant_plugins` 两条并存；生产 OFF 的是 `iam` 副本，可能为历史重复表，需在追平前确认是否保留。

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

## 6. 下一步建议（优先级）

1. **P1**：核对 B 类 38 张业务实体表的应用 SQL 依赖，区分平台全局表与租户业务表；业务表列入补 RLS 迁移清单。
2. **P1**：复核 C 类 53 张疑似业务实体，确认是全局表还是漏加 `tenant_id`；漏列者先补列再补策略。
3. **P2**：在超户/CI 全链 head 库上复跑本对照，消除 fixture 库快照偏差。
4. **P3**：B 类废弃归档 11 张纳入后续归档/下线评估；日志/队列/字典类逐张确认豁免口径后登记豁免台账。
