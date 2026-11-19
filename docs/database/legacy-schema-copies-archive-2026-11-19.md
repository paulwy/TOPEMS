# 108 张历史 schema 副本归档处置登记

- 日期：2026-11-19
- 上游清单：[table-disposition-2026-11-19.md](../../docs/quality/table-disposition-2026-11-19.md)（归档候选 139 张）
- 迁移：`20261119180000_archive_legacy_schema_copies.sql` / `database/rollback/20261119180000_archive_legacy_schema_copies.rollback.sql`
- 状态：**迁移已写、未应用**；演练（`run-migration-drill.sh anchor`）通过后才允许入库；生产未执行任何 DDL
- 口径：全部只读核查，生产元数据来自 `topems_prod`（2026-11-18 快照）+ 演练基线 `20261117235500`

## 0. 结论摘要

| 项 | 数量 | 说明 |
|---|---:|---|
| 上游归档候选 | 139 | `table-disposition-2026-11-19.md` |
| 已由 `20261119160000` 处理 | 16 | 零路径批，已归档删除 |
| 已由 `20261118160000` 改名 | 12 | `flow.core_*` → `flow._deprecated_*`，表名已不存在 |
| 因依赖未封闭拆出 | 3 | `iam.core_tenants` / `flow.core_tenants` / `iam.core_users`，见 §2 |
| **本批归档删除** | **108** | 生产/基线全部 0 行；无外部入向外键、无视图、无触发器 |
| 有写入方的表 | **0** | 未产生「写入方单独批」；依据见 §4 |

## 1. 逐表登记（108 张）

| # | 表 | 模块 | 复核结论 | 行数 | 终态 | 归档表 | 依据 |
|---:|---|---|---|---:|---|---|---|
| 1 | `analytics.analytics_comparison_analyses` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_comparison_analyses` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 2 | `analytics.analytics_comparison_results` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_comparison_results` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 3 | `analytics.analytics_dashboard_shares` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_dashboard_shares` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 4 | `analytics.analytics_dashboard_templates` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_dashboard_templates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 5 | `analytics.analytics_dashboards` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_dashboards` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 6 | `analytics.analytics_datasets` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_datasets` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 7 | `analytics.analytics_datasources` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_datasources` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 8 | `analytics.analytics_drilldown_history` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_drilldown_history` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 9 | `analytics.analytics_drilldown_paths` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_drilldown_paths` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 10 | `analytics.analytics_row_level_permissions` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_row_level_permissions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 11 | `analytics.analytics_self_service_reports` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_self_service_reports` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 12 | `analytics.analytics_sync_records` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_sync_records` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 13 | `analytics.analytics_widgets` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__analytics_widgets` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 14 | `analytics.report_schedules` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__report_schedules` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 15 | `analytics.report_subscriptions` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__report_subscriptions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 16 | `analytics.report_templates` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__report_templates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 17 | `analytics.reports` | BI 报表 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__analytics__reports` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 18 | `communication.core_email_templates` | 通信 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__communication__core_email_templates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 19 | `doc_service.core_doc_documents` | 文档服务 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__doc_service__core_doc_documents` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 20 | `doc_service.core_doc_folders` | 文档服务 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__doc_service__core_doc_folders` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 21 | `doc_service.core_doc_templates` | 文档服务 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__doc_service__core_doc_templates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 22 | `flow.approval_records` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__approval_records` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 23 | `flow.approvals` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__approvals` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 24 | `flow.audit_logs` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__audit_logs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 25 | `flow.core_file_folders` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_file_folders` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 26 | `flow.core_file_permissions` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_file_permissions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 27 | `flow.core_files` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_files` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 28 | `flow.core_flow_delegates` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_flow_delegates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 29 | `flow.core_flow_rules` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_flow_rules` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 30 | `flow.core_flow_variable_history` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_flow_variable_history` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 31 | `flow.core_flow_variables` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_flow_variables` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 32 | `flow.core_master_data_refs` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_master_data_refs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 33 | `flow.core_mdm_reconciliation_log` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_mdm_reconciliation_log` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 34 | `flow.core_migration_history` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_migration_history` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 35 | `flow.core_workflow_instances` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_workflow_instances` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 36 | `flow.core_workflow_tasks` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_workflow_tasks` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 37 | `flow.core_workflow_versions` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_workflow_versions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 38 | `flow.core_workflows` | 流程 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__flow__core_workflows` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 39 | `iam.audit_logs` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__audit_logs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 40 | `iam.auth_sessions` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__auth_sessions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 41 | `iam.core_billing_invoices` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_billing_invoices` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 42 | `iam.core_billing_plans` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_billing_plans` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 43 | `iam.core_chat_members` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_chat_members` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 44 | `iam.core_chat_messages` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_chat_messages` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 45 | `iam.core_chat_rooms` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_chat_rooms` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 46 | `iam.core_dashboard_refresh_log` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_dashboard_refresh_log` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 47 | `iam.core_dict_items` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_dict_items` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 48 | `iam.core_dict_types` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_dict_types` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 49 | `iam.core_email_queue` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_email_queue` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 50 | `iam.core_email_templates` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_email_templates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 51 | `iam.core_emails` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_emails` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 52 | `iam.core_faqs` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_faqs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 53 | `iam.core_file_folders` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_file_folders` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 54 | `iam.core_files` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_files` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 55 | `iam.core_guide_lessons` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_guide_lessons` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 56 | `iam.core_guide_progress` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_guide_progress` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 57 | `iam.core_guides` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_guides` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 58 | `iam.core_inter_module_sync` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_inter_module_sync` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 59 | `iam.core_login_logs` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_login_logs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 60 | `iam.core_menu_groups` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_menu_groups` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 61 | `iam.core_menus` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_menus` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 62 | `iam.core_migration_history` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_migration_history` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 63 | `iam.core_mobile_offline_records` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_mobile_offline_records` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 64 | `iam.core_notification_templates` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_notification_templates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 65 | `iam.core_notifications` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_notifications` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 66 | `iam.core_plugin_categories` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_plugin_categories` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 67 | `iam.core_plugin_instances` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_plugin_instances` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 68 | `iam.core_plugin_permissions` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_plugin_permissions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 69 | `iam.core_plugin_pricing` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_plugin_pricing` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 70 | `iam.core_plugin_reviews` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_plugin_reviews` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 71 | `iam.core_plugin_versions` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_plugin_versions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 72 | `iam.core_plugins` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_plugins` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 73 | `iam.core_subscriptions` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_subscriptions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 74 | `iam.core_tenant_modules` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_tenant_modules` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 75 | `iam.core_tenant_settings` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_tenant_settings` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 76 | `iam.core_tenant_usage` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_tenant_usage` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 77 | `iam.core_tenant_users` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_tenant_users` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 78 | `iam.core_usage_records` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_usage_records` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 79 | `iam.core_workflow_instances` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_workflow_instances` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 80 | `iam.core_workflow_tasks` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_workflow_tasks` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 81 | `iam.core_workflows` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__core_workflows` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 82 | `iam.crm_dashboard_snapshots` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__crm_dashboard_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 83 | `iam.data_permissions` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__data_permissions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 84 | `iam.dynamic_data` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__dynamic_data` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 85 | `iam.ehs_dashboard_snapshots` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__ehs_dashboard_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 86 | `iam.hrm_dashboard_snapshots` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__hrm_dashboard_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 87 | `iam.lims_dashboard_snapshots` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__lims_dashboard_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 88 | `iam.password_reset_tokens` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__password_reset_tokens` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 89 | `iam.pdm_dashboard_snapshots` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__pdm_dashboard_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 90 | `iam.permission_audit_logs` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__permission_audit_logs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 91 | `iam.permission_templates` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__permission_templates` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 92 | `iam.refresh_tokens` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__refresh_tokens` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 93 | `iam.schema_registry` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__schema_registry` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 94 | `iam.sessions` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__sessions` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 95 | `iam.tenant_users` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__tenant_users` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 96 | `iam.user_access_logs` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__user_access_logs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 97 | `iam.user_roles` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__user_roles` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 98 | `iam.wms_dashboard_snapshots` | 身份权限 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__iam__wms_dashboard_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 99 | `plugin_erp.accounting_subjects` | ERP 插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_erp__accounting_subjects` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 100 | `plugin_finance.difference_adjustments` | 财务插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_finance__difference_adjustments` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 101 | `plugin_finance.reconciliation_item_snapshots` | 财务插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_finance__reconciliation_item_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 102 | `plugin_finance.reconciliation_settlement_links` | 财务插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_finance__reconciliation_settl2d6c724b` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 103 | `plugin_finance.reconciliation_snapshots` | 财务插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_finance__reconciliation_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 104 | `plugin_finance.settlement_snapshots` | 财务插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_finance__settlement_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 105 | `plugin_finance.source_amount_snapshots` | 财务插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_finance__source_amount_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 106 | `plugin_mes.audit_logs` | MES 插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_mes__audit_logs` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 107 | `plugin_wms.purchase_order_snapshots` | WMS 插件 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__plugin_wms__purchase_order_snapshots` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |
| 108 | `unified_core.documents` | 统一核心 | 历史副本 / 运行期零引用 | 0 | 归档后删除 | `archive.drop_20261119_lc__unified_core__documents` | 基线无触发器/视图/外部入向外键；代码未限定名解析到活跃 schema |

## 2. 因依赖未封闭拆出（3 张，本批不做）

| 表 | 行数 | 阻塞证据 | 处置 |
|---|---:|---|---|
| `flow.core_tenants` | 0 | 入向外键：`flow._deprecated_core_tenant_modules`、`_deprecated_core_tenant_settings`、`_deprecated_core_tenant_usage`、`_deprecated_core_tenant_users`；且 `finance.bootstrap_defaults()` 以 `to_regclass` 读取它 | 拆出；先行处置 `_deprecated_*` 或解除函数读取后再归档 |
| `iam.core_tenants` | 0 | 入向外键：`iam.core_tenant_plugins`（活跃表）→ `iam.core_tenants`；`finance.bootstrap_defaults()` 读取 | 拆出；需先改外键或改函数 |
| `iam.core_users` | 0 | 入向外键：`iam.core_user_roles`（活跃表）→ `iam.core_users` | 拆出；需先改外键 |

> 未使用 `CASCADE`：拆出是唯一允许的依赖处理方式。

## 3. 已由前序批次处理（28 张，本批不重复）

### 3.1 `20261119160000` 已归档删除（16 张）

`doc.document_versions`、`doc.documents`、`doc.folders`、`doc.templates`、`doc_service.archives`、`doc_service.files`、`doc_service.folders`、`doc_service.templates`、`flow.notifications`、`flow.workflows`、`iam.permissions`、`mail.emails`、`mail.templates`、`notification.notifications`、`report.reports`、`storage.files`。

### 3.2 `20261118160000` 已改名（12 张）

`flow.core_doc_document_versions`、`flow.core_doc_documents`、`flow.core_doc_folders`、`flow.core_doc_templates`、`flow.core_flow_categories`、`flow.core_master_data_change_log`、`flow.core_mdm_approvals`、`flow.core_operation_logs`、`flow.core_tenant_modules`、`flow.core_tenant_settings`、`flow.core_tenant_usage`、`flow.core_tenant_users` → 现名 `flow._deprecated_*`。

## 4. 「零运行期路径」复核证据

### 4.1 静态引用（按表名 + SQL 上下文）

对 110 个基名做 `(FROM|JOIN|INTO|UPDATE|TRUNCATE|POLICY ON|REFERENCES) <name>` 扫描（`svc/ lib/ cli/ apps/ packages/ deploy/ scripts/ .github/ database/init/ database/seeds/`）。命中均解析到活跃 schema：

| 命中名 | 解析目标 | 依据 |
|---|---|---|
| `analytics_*` | `bi.*` | `svc/analytics` 的 search_path 为 `bi, public, shared`；`validate_identifier` 拒绝点号跨 schema |
| `approvals` / `approval_records` | `public.*` | `svc/unified-core` search_path 为 `public, shared` |
| `core_dict_*` / `core_doc_*` / `audit_logs` | `public.*` | 同上 |
| `core_email_queue` | `communication.*` | `svc/communication` search_path 为 `communication, public` |
| `accounting_subjects` | `plugin_finance.*` 仅测试/注释 | `lib/shared-boundary` 测试为宏断言，不连库 |

### 4.2 动态拼接

- `audit.rs` 的 `format!("{}.audit_logs", prefix)`：前缀白名单 `crm/erp/hrm/mes/rs/wms`，不含本批任何遗留 schema。
- `svc/analytics` 的 `quote_identifier(data_source)`：来源是白名单表的 `data_source` 值，且 `validate_identifier` 拒绝点号，无法指向 `analytics.*` 遗留副本。
- 全仓 `%I.%I` / `quote_ident` / `schema_prefix` 复核：无本批 schema 变量。

### 4.3 数据库侧依赖

- 入向外键：19 条，**全部源表在本批 108 张内**（`flow.core_menus → flow.core_menu_groups`、`iam.core_menus → iam.core_menu_groups`、`iam.core_workflow_*`、`iam.core_dict_items → iam.core_dict_types`、`iam.core_chat_*` 等）。
- DROP 顺序：按外键拓扑序（依赖方先删），迁移内为单一 `DO $drop$` 块，顺序由 `pg_constraint` 实测生成；不使用 `CASCADE`。
- 依赖视图：0。
- 触发器：0。
- 外部入向外键：0（`iam.core_tenants` / `iam.core_users` / `flow.core_tenants` 虽有活跃表引用，但已在 §2 拆出，不在本批）。
- 函数引用：仅 `finance.bootstrap_defaults()` 读 `iam.core_tenants` / `flow.core_tenants`，这两张已拆出。

### 4.4 事务与回滚

- 单事务执行；源表/归档表/INSERT 行数三方不等即 `RAISE EXCEPTION`，DROP 不执行。
- 回滚按 `archive._drop_manifest` 重建结构、数据、RLS、策略、默认值、序列、外键、视图。
- 闸门：`app.archive_legacy_copies_gate=legacy-copies-20261119`。

## 5. 演练与快照（`run-migration-drill.sh anchor`）

```bash
git add <本批文件>
TEMP_SHA=$(git stash create)
git worktree add --detach /tmp/topems-lc "$TEMP_SHA"
cp .env /tmp/topems-lc/.env
cd /tmp/topems-lc
env -u DATABASE_URL -u TEST_DATABASE_URL -u MIGRATE_URL \
  MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1 \
  bash scripts/dev/run-migration-drill.sh anchor
```

关键输出：

```
[Gate RLS-SNAP] 已写入 .../database/rls_policy_expected.json：表 796 / 策略 807
[Gate RLS-SNAP] 目标库 ... current_user=topems_test_runner，rolsuper=false，rolbypassrls=false
[Gate RLS-SNAP] PASS 策略快照与实测完全一致
PASS: drill:anchor 通过（anchor=20261117235500，总耗时 83s）
```

迁移前后读数（快照口径：仅统计 `pg_class` 中启用 RLS 或带策略的表）：

| 项 | 迁移前（HEAD） | 迁移后（本批） | 变化 |
|---|---:|---:|---:|
| RLS 表 | 825（总条目 826） | 795（总条目 796） | -30 |
| 策略 | 837 | 807 | -30 |

快照 diff：**删除 30 条表条目、修改 30 条策略（随表删除）、新增 0 条**；30 条全部落在本批 108 张内，无其他表受影响。生产 `topems_prod` 快照口径为 31 张 RLS 表 / 32 条策略（与演练基线 `20261117235500` 存在 1 张表的采集时差），处置结论不变。

> 说明：108 张表全部执行了归档与 DROP；快照只记录启用 RLS / 带策略的表，因此条目变化是 30 而不是 108。
