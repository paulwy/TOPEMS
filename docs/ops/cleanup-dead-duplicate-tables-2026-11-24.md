# 死表 / 重复遗留表归档清理清单（2026-11-24）

## 1. 背景与口径

承接 RLS 覆盖分类台账与 allow-all 口径评审。本清单汇总经源码依赖与生产状态核对、可纳入后续归档/下线评估的表。**本轮只出清单与处置建议，不执行任何 DROP / 重命名；破坏性操作须在生产窗口、确认前置条件后另行执行。**

- **口径校正**：早期台账小结估算为「22 死表 + 46 重复遗留」；按本体映射展开复核，实际为 **22 张死表 + 49 张重复遗留副本**（B 组 27 + C 组 22），共 **71 张**。以本清单与 CSV 附件为准。
- **证据来源**：源码运行时 `.rs` 全限定 SQL 引用（排除 `**/tests/`）× 生产库行数核对 × 代码基准 `rls_policy_expected.json`。
- **行数口径**：2026-11-24 生产 `topems_prod` 只读 `count(*)`；`reltuples` 未 ANALYZE 不可靠，未采用。

## 2. 核对结论概览

| 类别 | 数量 | 副本/表行数 | 说明 |
|---|---:|---|---|
| 死表（源码零引用） | 22 | 21 张 0 行，1 张 1 行 | 无应用依赖，归档候选 |
| 重复遗留副本 | 49 | 全部 0 行 | 源码访问另一 schema 本体，副本空 |

- 49 张副本**全部为空**；承接本体在生产在位，其中 `public.core_roles` 17 行、`public.core_tenant_settings` 4 行、`public.core_tenant_users` 3 行、`bi.reports` 1 行，无副本数据丢失风险。
- 本体仍为 OFF 或待定性的（如 `core.core_plugin_instances` 等），其 RLS 口径见分类台账 §9，不在本清理清单内处理。

## 3. A 组：死表（22 张）—— 源码零引用

### 3.1 空表（21 张），归档风险低

`iam.core_billing_invoices`、`iam.core_billing_plans`、`iam.core_chat_members`、`iam.core_chat_messages`、`iam.core_chat_rooms`、`iam.core_file_folders`、`iam.core_plugin_pricing`、`iam.core_subscriptions`、`iam.core_users`、`public.pm_master_data_refs`、`flow._deprecated_core_doc_document_versions`、`flow.core_file_folders`、`flow.core_file_permissions`、`iam.user_access_logs`、`iam.user_roles`、`portal.graphql_execution_profiles`、`portal.portal_alert_thresholds`、`portal.portal_compatibility_reports`、`portal.portal_queue_messages`、`public._archive_core_doc_documents`、`public.qa_ehs_material_stocks`

### 3.2 含 1 行（1 张）—— 归档前先备份该行

- `ticket.schema_defense_ledger`（1 行）：备份记录后再归档。

## 4. B 组：重复遗留副本（49 张）—— 本体在位、副本为空

### 4.1 B 组（27 张）

| 副本（空） | 承接本体 |
|---|---|
| `flow.core_master_data_refs` | `public.core_master_data_refs` |
| `flow.core_workflow_instances` | `public.core_workflow_instances` |
| `flow.core_workflow_versions` | `public.core_workflow_versions` |
| `flow.core_workflows` | `public.core_workflows` |
| `iam.core_emails` | `public.core_emails` |
| `iam.core_files` | `public.core_files` |
| `iam.core_notifications` | `public.core_notifications` |
| `iam.core_roles` | `public.core_roles` |
| `iam.core_tenant_modules` | `public.core_tenant_modules` |
| `iam.core_tenant_settings` | `public.core_tenant_settings` |
| `iam.core_tenant_usage` | `public.core_tenant_usage` |
| `iam.core_tenant_users` | `public.core_tenant_users` |
| `iam.core_workflow_instances` | `public.core_workflow_instances` |
| `iam.core_workflow_tasks` | `public.core_workflow_tasks` |
| `iam.core_workflows` | `public.core_workflows` |
| `iam.core_plugin_instances` | `core.core_plugin_instances` |
| `iam.core_plugin_permissions` | `core.core_plugin_permissions` |
| `iam.core_plugin_reviews` | `core.core_plugin_reviews` |
| `iam.core_plugins` | `core.core_plugins` |
| `plugin_erp.accounting_subjects` | `plugin_finance.accounting_subjects` |
| `public.conversion_executions` | `integration.conversion_executions` |
| `public.conversion_rules` | `integration.conversion_rules` |
| `public.core_ticket_activities` | `ticket.core_ticket_activities` |
| `public.core_ticket_comments` | `ticket.core_ticket_comments` |
| `public.core_ticket_sla_escalations` | `ticket.core_ticket_sla_escalations` |
| `public.core_ticket_sla_policies` | `ticket.core_ticket_sla_policies` |
| `public.core_tickets` | `ticket.core_tickets` |

### 4.2 C 组（22 张）

| 副本（空） | 承接本体 |
|---|---|
| `analytics.report_schedules` | `bi.report_schedules` |
| `analytics.report_subscriptions` | `bi.report_subscriptions` |
| `analytics.report_templates` | `bi.report_templates` |
| `analytics.reports` | `bi.reports` |
| `bi.report_execution_records` | `analytics.report_execution_records` |
| `doc_service.core_doc_documents` | `public.core_doc_documents` |
| `flow.core_files` | `public.core_files` |
| `flow.core_workflow_tasks` | `public.core_workflow_tasks` |
| `plugin_wms.purchase_order_snapshots` | `wms.purchase_order_snapshots` |
| `public.equipment_inspections` | `mes.equipment_inspections` |
| `rs.equipment_inspections` | `mes.equipment_inspections` |
| `public.qa_ehs_inspection_items` | `ehs.qa_ehs_inspection_items` |
| `public.qa_ehs_inspection_plans` | `ehs.qa_ehs_inspection_plans` |
| `public.qa_ehs_stock_records` | `ehs.qa_ehs_stock_records` |
| `public.quality_inspections` | `mes.quality_inspections` |
| `public.quality_patrol_items` | `mes.quality_patrol_items` |
| `public.quality_patrols` | `mes.quality_patrols` |
| `public.quality_standard_values` | `mes.quality_standard_values` |
| `public.quality_standards` | `mes.quality_standards` |
| `public.ticket_automation_rules` | `ticket.ticket_automation_rules` |
| `public.ticket_knowledge_articles` | `ticket.ticket_knowledge_articles` |
| `unified_core.documents` | `mobile.documents` / `ai.documents` / `erp.documents` |

## 5. 处置建议（分阶段，不在本轮执行）

### 5.1 前置条件（全部满足后才进入窗口）

1. 生产账本追平到头版本；应用部署确认无裸表名 / 动态 SQL 命中这些副本。
2. 生产 `pg_dump` 快照备份留存；`ticket.schema_defense_ledger` 单行单独导出。
3. 核对外键、视图、触发器、索引无指向副本表（避免删除后引用悬空）。
4. 预发库按同清单演练归档与回滚。

### 5.2 推荐步骤（先归档、后删除，可回滚）

1. **重命名归档**：将副本/死表 `RENAME` 至 `_archive_20261124` 前缀（或归档 schema），保留结构与空数据。
2. **观察期**：观察 1–2 个发布周期，确认无端点报错、无监控异常、无作业依赖。
3. **再 DROP**：观察期通过后，窗口内 `DROP TABLE`；含外键引用的先解依赖。
4. **登记**：每步结果回填本清单与迁移台账。

### 5.3 禁止事项

- 未备份、未核外键/视图前，禁止直接 `DROP TABLE`。
- 不得删除承接本体表；本清单仅针对空副本与死表。
- 待定性表（分类台账 §9.5④）不在本清单处置范围。

## 6. 附件

- `cleanup-dead-duplicate-tables-2026-11-24.csv`：71 行结构化清单（类别 / 表名 / 本体 / 行数 / 备注）。
